import gradio as gr
from transformers import AutoProcessor, AutoModelForImageTextToText, TextIteratorStreamer
from threading import Thread
import torch
import spaces
import os

pretrained_model_name_or_path=os.environ.get("MODEL", "nvidia/NV-Reason-CXR-3B")

auth_token = os.environ.get("HF_TOKEN") or True
DEFAULT_PROMPT = "Find abnormalities and support devices."

model = AutoModelForImageTextToText.from_pretrained(
    pretrained_model_name_or_path=pretrained_model_name_or_path,
    dtype=torch.bfloat16,
    token=auth_token
).eval().to("cuda")


processor = AutoProcessor.from_pretrained(pretrained_model_name_or_path,
    use_fast=True,
  )


@spaces.GPU
def model_inference(
    text, history, image
): 

    print(f"text: {text}")
    print(f"history: {history}")

    if len(text) == 0:
        raise gr.Error("Please input a query.", duration=3, print_exception=False)

    if image is None:
        raise gr.Error("Please provide an image.", duration=3, print_exception=False)

    # print(f"image0: {image} size: {image.size}")

    messages=[]
    if len(history) > 0:
        valid_index = None
        for i in range(len(history)):
            h = history[i]
            if len(h.get("content").strip()) > 0:
                if valid_index is None and h['role'] == 'assistant':
                    valid_index = i-1 
                messages.append({"role": h['role'], "content": [{"type": "text", "text": h['content']}] })

        if valid_index is None:
            messages = []
        if len(messages) > 0 and valid_index > 0:
            messages = messages[valid_index:] #remove previous messages (without image)

    # current prompt
    messages.append({"role": "user","content": [{"type": "text", "text": text}]})
    messages[0]['content'].insert(0, {"type": "image"})
    print(f"messages: {messages}")


    prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = processor(text=prompt, images=[image], return_tensors="pt")
    inputs = inputs.to('cuda')


    # Generate
    streamer = TextIteratorStreamer(processor, skip_prompt=True, skip_special_tokens=True)
    generation_args = dict(inputs, streamer=streamer, max_new_tokens=4096)

    with torch.inference_mode():
        thread = Thread(target=model.generate, kwargs=generation_args)
        thread.start()

        yield "..."
        buffer = ""
        
        
        for new_text in streamer:
            buffer += new_text
            yield buffer


with gr.Blocks() as demo:

    gr.HTML('<h1 style="text-align:center; margin: 0.2em 0; color: green;">NV-Reason-CXR-3B Demo. Check out the model card details <a href="https://huggingface.co/nvidia/NV-Reason-CXR-3B" target="_blank">here</a>.</h1>')
    send_btn = gr.Button("Send", variant="primary", render=False)
    textbox = gr.Textbox(show_label=False, placeholder="Enter your text here and press ENTER", render=False, submit_btn="Send")

    with gr.Row():
        with gr.Column(scale=1):
            image_input = gr.Image(type="pil", visible=True, sources="upload", show_label=False)
            clear_btn = gr.Button("Clear", variant="secondary")

            with gr.Accordion("Examples", open=True): 

                ex =gr.Examples(
                    examples=[
                        ["example_images/35.jpg", "Examine the chest X-ray."],
                        ["example_images/363.jpg", "Provide a comprehensive image analysis, and list all abnormalities."],
                        ["example_images/4747.jpg", "Find abnormalities and support devices."],
                        ["example_images/87.jpg", "Find abnormalities and support devices."],
                        ["example_images/6218.jpg", "Find abnormalities and support devices."],
                        ["example_images/6447.jpg", "Find abnormalities and support devices."],


                    ],
                    inputs=[image_input, textbox],
                    label=None,
                )
                ex.dataset.show_label = False

        with gr.Column(scale=2):
            chat_interface = gr.ChatInterface(fn=model_inference,
                type="messages",
                chatbot=gr.Chatbot(type="messages", label="AI", render_markdown=True, sanitize_html=False, allow_tags=True, height='35vw', container=False, show_share_button=False),
                textbox=textbox,
                additional_inputs=image_input,
                multimodal=False,
                fill_height=False,
                show_api=False,
                )
            gr.HTML('<span style="color:lightgray">Start with a full prompt: Find abnormalities and support devices.<br>\
                Follow up with additial questions, such as Provide differentials or Write a structured report.<br>')



        # Clear chat history when an example is selected (keep example-populated inputs intact)
        ex.load_input_event.then(
                lambda: ([], [], [], None),
                None,
                [chat_interface.chatbot, chat_interface.chatbot_state, chat_interface.chatbot_value, chat_interface.saved_input],
                queue=False,
                show_api=False,
            )
               
        # Clear chat history when a new image is uploaded via the image input
        image_input.upload(
                lambda: ([], [], [], None, DEFAULT_PROMPT),
                None,
                [chat_interface.chatbot, chat_interface.chatbot_state, chat_interface.chatbot_value, chat_interface.saved_input, textbox],
                queue=False,
                show_api=False,
            )

        # Clear everything on Clear button click
        clear_btn.click(
                lambda: ([], [], [], None, "", None),
                None,
                [chat_interface.chatbot, chat_interface.chatbot_state, chat_interface.chatbot_value, chat_interface.saved_input, textbox, image_input],
                queue=False,
                show_api=False,
            )



demo.queue(max_size=10)
demo.launch(debug=False, server_name="0.0.0.0")
        
