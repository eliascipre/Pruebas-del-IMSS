import gradio as gr
from transformers import AutoProcessor, AutoModelForImageTextToText, TextIteratorStreamer
from threading import Thread
import torch
import spaces
import os

DEFAULT_MODEL_ID = "nvidia/NV-Reason-CXR-3B"
SYSTEM_PROMPT = (
    "Eres un radiologo asistente especializado en radiografias de torax. "
    "Analiza la imagen recibida y responde unicamente en espanol utilizando terminologia medica."
)
DEFAULT_PROMPT = (
    "Analiza esta radiografia de torax, describe los hallazgos principales, las anomalias, los dispositivos de soporte "
    "y ofrece recomendaciones clinicas. Responde en espanol."
)


def get_env_flag(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    value = value.strip().lower()
    if value in {"1", "true", "t", "yes", "y", "si", "s"}:
        return True
    if value in {"0", "false", "f", "no", "n"}:
        return False
    return default


def parse_int_env(name: str, default: int) -> int:
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def resolve_model_path() -> str:
    raw_path = os.environ.get("NV_REASON_MODEL_PATH") or os.environ.get("MODEL") or DEFAULT_MODEL_ID
    return os.path.expanduser(raw_path)


def load_model_and_processor():
    model_path = resolve_model_path()
    allow_downloads = get_env_flag("NV_REASON_ALLOW_DOWNLOADS", default=False)
    local_files_only = not allow_downloads

    if torch.cuda.is_available():
        device = "cuda"
    elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"
    bf16_checker = getattr(torch.cuda, "is_bf16_supported", None)
    is_bf16_supported = False
    if device == "cuda" and callable(bf16_checker):
        try:
            is_bf16_supported = bf16_checker()
        except Exception:
            is_bf16_supported = False

    if device == "cuda":
        torch_dtype = torch.bfloat16 if is_bf16_supported else torch.float16
    elif device == "mps":
        torch_dtype = torch.float16
    else:
        torch_dtype = torch.float32

    print(f"[nv-reason-cxr] Cargando modelo desde: {model_path}")
    print(f"[nv-reason-cxr] Descargas habilitadas: {'si' if allow_downloads else 'no'}")
    print(f"[nv-reason-cxr] Dispositivo seleccionado: {device}")

    load_kwargs = {
        "torch_dtype": torch_dtype,
        "local_files_only": local_files_only,
    }

    if device == "cuda":
        load_kwargs["device_map"] = {"": device}

    try:
        model = AutoModelForImageTextToText.from_pretrained(model_path, **load_kwargs)
    except OSError as exc:
        hint = (
            "No se encontró el modelo NV-Reason-CXR-3B en la ruta local especificada. "
            "Define NV_REASON_MODEL_PATH con la carpeta del modelo o establece NV_REASON_ALLOW_DOWNLOADS=1."
        )
        raise RuntimeError(hint) from exc

    model = model.eval()

    if device != "cuda":
        model = model.to(device)

    try:
        processor = AutoProcessor.from_pretrained(
            model_path,
            use_fast=True,
            local_files_only=local_files_only,
        )
    except OSError as exc:
        hint = (
            "No se encontró el procesador/tokenizer del modelo NV-Reason-CXR-3B en la ruta local. "
            "Verifica la descarga del modelo o habilita NV_REASON_ALLOW_DOWNLOADS=1."
        )
        raise RuntimeError(hint) from exc

    return model, processor, device


model, processor, DEVICE = load_model_and_processor()
MAX_NEW_TOKENS = parse_int_env("NV_REASON_MAX_NEW_TOKENS", 2048)
SERVER_PORT = parse_int_env("PORT", parse_int_env("GRADIO_SERVER_PORT", 7860))
SERVER_HOST = os.environ.get("HOST", os.environ.get("GRADIO_SERVER_NAME", "0.0.0.0"))


@spaces.GPU
def model_inference(
    text, history, image
): 

    print(f"[nv-reason-cxr] Consulta recibida: {text}")
    print(f"[nv-reason-cxr] Historial recibido: {history}")

    if not text or not text.strip():
        raise gr.Error("Por favor ingresa una consulta.", duration=3, print_exception=False)

    if image is None:
        raise gr.Error("Por favor carga una imagen de radiografia.", duration=3, print_exception=False)

    conversation = []
    if history:
        valid_index = None
        for i, h in enumerate(history):
            content_text = h.get("content", "")
            if isinstance(content_text, str) and content_text.strip():
                if valid_index is None and h.get("role") == "assistant":
                    valid_index = i - 1
                conversation.append(
                    {
                        "role": h.get("role", "user"),
                        "content": [{"type": "text", "text": content_text}],
                    }
                )

        if valid_index is None:
            conversation = []
        elif conversation and valid_index > 0:
            conversation = conversation[valid_index:]

    conversation.append(
        {
            "role": "user",
            "content": [{"type": "text", "text": text.strip()}],
        }
    )
    conversation[-1]["content"].insert(0, {"type": "image"})

    messages = [
        {
            "role": "system",
            "content": [{"type": "text", "text": SYSTEM_PROMPT}],
        },
        *conversation,
    ]

    print(f"[nv-reason-cxr] Mensajes enviados al modelo: {messages}")

    prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = processor(text=prompt, images=[image], return_tensors="pt")
    inputs = inputs.to(DEVICE)

    tokenizer = getattr(processor, "tokenizer", processor)
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    generation_args = dict(inputs, streamer=streamer, max_new_tokens=MAX_NEW_TOKENS)

    with torch.inference_mode():
        thread = Thread(target=model.generate, kwargs=generation_args)
        thread.start()

        yield "Procesando..."
        buffer = ""

        for new_text in streamer:
            buffer += new_text
            yield buffer


with gr.Blocks() as demo:

    gr.HTML(
        "<h1 style=\"text-align:center; margin: 0.2em 0; color: green;\">"
        "NV-Reason-CXR-3B - Analizador de radiografias de torax"
        "</h1>"
    )
    gr.HTML(
        "<div style=\"text-align:center; margin: 1em 0;\">"
        "<button onclick=\"window.location.href=window.location.protocol + '//' + window.location.hostname + ':3000'\" "
        "style=\"padding: 10px 24px; background: #f8f9fa; color: #5f6368; border: 1px solid #dadce0; "
        "border-radius: 100px; font-size: 14px; font-weight: 500; cursor: pointer; "
        "transition: background-color 0.2s; margin: 0 8px;\">"
        "Ir al Inicio"
        "</button>"
        "</div>"
    )
    send_btn = gr.Button("Enviar", variant="primary", render=False)
    textbox = gr.Textbox(
        show_label=False,
        placeholder="Escribe tu consulta en espanol y presiona ENTER",
        render=False,
        submit_btn="Enviar",
    )

    with gr.Row():
        with gr.Column(scale=1):
            image_input = gr.Image(type="pil", visible=True, sources="upload", show_label=False)
            clear_btn = gr.Button("Limpiar", variant="secondary")

            with gr.Accordion("Ejemplos", open=True):

                ex = gr.Examples(
                    examples=[
                        ["example_images/35.jpg", "Analiza la radiografia y resume los hallazgos en espanol."],
                        ["example_images/363.jpg", "Describe anomalias, dispositivos y recomendaciones clinicas."],
                        ["example_images/4747.jpg", "Enumera hallazgos relevantes y sugiere estudios complementarios."],
                        ["example_images/87.jpg", "Indica dispositivos de soporte y posibles complicaciones."],
                        ["example_images/6218.jpg", "Genera un informe estructurado en espanol."],
                        ["example_images/6447.jpg", "Detalla los hallazgos por sistema y concluye con impresion clinica."],
                    ],
                    inputs=[image_input, textbox],
                    label="Casos de ejemplo",
                )
                ex.dataset.show_label = False

        with gr.Column(scale=2):
            chat_interface = gr.ChatInterface(
                fn=model_inference,
                type="messages",
                chatbot=gr.Chatbot(
                    type="messages",
                    label="Asistente IA",
                    render_markdown=True,
                    sanitize_html=False,
                    allow_tags=True,
                    height="35vw",
                    container=False,
                    show_share_button=False,
                ),
                textbox=textbox,
                additional_inputs=image_input,
                multimodal=False,
                fill_height=False,
                show_api=False,
            )
            gr.HTML(
                "<span style=\"color:lightgray\">"
                "Sugiere indicaciones claras (ej. \"Analiza la radiografia y responde en espanol\").<br>"
                "Puedes solicitar informes estructurados, listas de anomalias o recomendaciones clinicas.<br>"
                "</span>"
            )

        ex.load_input_event.then(
            lambda: ([], [], [], None),
            None,
            [
                chat_interface.chatbot,
                chat_interface.chatbot_state,
                chat_interface.chatbot_value,
                chat_interface.saved_input,
            ],
            queue=False,
            show_api=False,
        )

        image_input.upload(
            lambda: ([], [], [], None, DEFAULT_PROMPT),
            None,
            [
                chat_interface.chatbot,
                chat_interface.chatbot_state,
                chat_interface.chatbot_value,
                chat_interface.saved_input,
                textbox,
            ],
            queue=False,
            show_api=False,
        )

        clear_btn.click(
            lambda: ([], [], [], None, "", None),
            None,
            [
                chat_interface.chatbot,
                chat_interface.chatbot_state,
                chat_interface.chatbot_value,
                chat_interface.saved_input,
                textbox,
                image_input,
            ],
            queue=False,
            show_api=False,
        )


demo.queue(max_size=10)
demo.launch(debug=False, server_name=SERVER_HOST, server_port=SERVER_PORT)
        
