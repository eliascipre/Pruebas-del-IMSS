# ===================================================================
# ARCHIVO: serve_medgemma.py
# Script MODIFICADO para usar modelos locales pre-descargados
# ===================================================================

# --- 1. Imports ---
import ray
from ray import serve
from vllm.engine.arg_utils import AsyncEngineArgs
from vllm.engine.async_llm_engine import AsyncLLMEngine
from vllm.entrypoints.openai.protocol import (
    CompletionRequest,
    ChatCompletionRequest,
    ErrorResponse,
    ChatCompletionResponse,
    ChatCompletionResponseChoice,
    ChatMessage,
    UsageInfo,
)
from vllm.utils import random_uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn
import asyncio
import time
import json
import os
from typing import Union
# Imports para procesamiento de imágenes (si es necesario)
# import base64
# from io import BytesIO
# from PIL import Image

# --- 2. Configuración de Directorio de Modelos ---
# Directorio base para modelos pre-descargados
MODELS_BASE_DIR = os.environ.get("VLLM_MODELS_DIR", os.path.expanduser("~/models"))
MEDGEMMA_MODEL_NAME = "google/medgemma-27b-it"
MEDGEMMA_MODEL_DIR = os.path.join(MODELS_BASE_DIR, "medgemma-27b-it")

# Verificar si el modelo existe localmente
def resolve_model_path():
    """Resolver la ruta del modelo: usar local si existe, sino usar el nombre de Hugging Face"""
    if os.path.exists(MEDGEMMA_MODEL_DIR):
        # Verificar que el directorio tenga archivos del modelo
        required_files = ["config.json", "tokenizer_config.json"]
        has_model = all(os.path.exists(os.path.join(MEDGEMMA_MODEL_DIR, f)) for f in required_files)
        if has_model:
            print(f"[vLLM] ✅ Usando modelo local: {MEDGEMMA_MODEL_DIR}")
            return MEDGEMMA_MODEL_DIR
        else:
            print(f"[vLLM] ⚠️ Directorio local existe pero está incompleto: {MEDGEMMA_MODEL_DIR}")
            print(f"[vLLM] ⚠️ Usando modelo de Hugging Face (requiere conexión): {MEDGEMMA_MODEL_NAME}")
    else:
        print(f"[vLLM] ⚠️ Modelo local no encontrado en: {MEDGEMMA_MODEL_DIR}")
        print(f"[vLLM] ⚠️ Usando modelo de Hugging Face (requiere conexión): {MEDGEMMA_MODEL_NAME}")
        print(f"[vLLM] 💡 Para usar modelo local, ejecuta: python scripts/download_medgemma.py")
    
    return MEDGEMMA_MODEL_NAME

# Resolver la ruta del modelo
MODEL_PATH = resolve_model_path()

# Configurar variables de entorno para cache de Hugging Face
# Esto ayuda a que las réplicas compartan el mismo cache
os.environ["HF_HOME"] = os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface"))
os.environ["TRANSFORMERS_CACHE"] = os.environ.get("TRANSFORMERS_CACHE", os.path.join(os.environ["HF_HOME"], "transformers"))
os.environ["HF_HUB_CACHE"] = os.environ.get("HF_HUB_CACHE", os.path.join(os.environ["HF_HOME"], "hub"))

print(f"[vLLM] 📁 HF_HOME: {os.environ['HF_HOME']}")
print(f"[vLLM] 📁 TRANSFORMERS_CACHE: {os.environ['TRANSFORMERS_CACHE']}")
print(f"[vLLM] 📁 HF_HUB_CACHE: {os.environ['HF_HUB_CACHE']}")

# --- 3. Definición de la App FastAPI ---
# Se crea ANTES de ser usada en @serve.ingress
app = FastAPI()

# --- 4. Argumentos del Motor vLLM ---
# Configuración optimizada basada en tus pruebas de terminal
engine_args = AsyncEngineArgs(
    model=MODEL_PATH,  # Usar ruta local si existe, sino usar nombre de Hugging Face
    tensor_parallel_size=4,
    dtype="bfloat16",
    max_model_len=8192,
    gpu_memory_utilization=0.95,
    enable_lora=False,
    enforce_eager=True,           # Coincide con tu flag --enforce-eager
    trust_remote_code=True,
    download_dir=MODELS_BASE_DIR,  # Directorio para descargar modelos si no están localmente
)

# --- 5. Configuración del Despliegue (Deployment) ---
@serve.deployment(
    name="MedGemmaDeployment",
    
    # --- ¡CAMBIO AQUÍ! De réplicas fijas a autodescalado ---
    # num_replicas=4, <-- Se elimina la línea de réplicas fijas
    autoscaling_config={
        "min_replicas": 2,     # Mantiene 2 réplicas siempre activas para respuesta rápida
        "max_replicas": 16,    # Escala hasta usar TODOS tus 16 nodos (64 GPUs)
        "target_ongoing_requests": 5 # Inicia una nueva réplica si una existente tiene 5+ peticiones en cola
    },
    # --- Fin del cambio ---

    ray_actor_options={
        "num_gpus": 4,
        "runtime_env": {
            "setup_script": (
                "uv pip uninstall -y vllm; "
                "uv pip install --no-cache "
                "setuptools "
                "'vllm>=0.5.1' "
                "fastapi "
                "uvicorn "
                "'ray[serve]'"
            ),
            "env_vars": {
                "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
                "TOKENIZERS_PARALLELISM": "false",
                "CACHE_BUSTER": "v3",
                # Configurar cache de Hugging Face para todas las réplicas
                "HF_HOME": os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface")),
                "TRANSFORMERS_CACHE": os.environ.get("TRANSFORMERS_CACHE", os.path.join(os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface")), "transformers")),
                "HF_HUB_CACHE": os.environ.get("HF_HUB_CACHE", os.path.join(os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface")), "hub")),
                # Directorio de modelos
                "VLLM_MODELS_DIR": MODELS_BASE_DIR,
            }
        }
    }
)
@serve.ingress(app) # Conecta esta clase a la app FastAPI
class VLLMDeployment:
    def __init__(self, engine_args: AsyncEngineArgs):
        print("Iniciando una réplica de vLLM...")
        print(f"[vLLM] 📁 Usando modelo: {engine_args.model}")
        self.engine = AsyncLLMEngine.from_engine_args(engine_args)

    async def process_request(self, request: Union[CompletionRequest, ChatCompletionRequest]):
        """Método unificado para procesar peticiones de chat y completions."""
        
        # Obtener max_tokens de la request (max_tokens está deprecated, usar max_completion_tokens)
        max_tokens = getattr(request, 'max_completion_tokens', None) or getattr(request, 'max_tokens', None) or 16
        
        # Obtener el modelo config para logits_processor_pattern y default_sampling_params
        model_config = await self.engine.get_model_config()
        logits_processor_pattern = getattr(model_config, 'logits_processor_pattern', None)
        default_sampling_params = model_config.get_diff_sampling_param() or {}
        
        if isinstance(request, ChatCompletionRequest):
            # Usar request_id del objeto si se estableció, sino generar uno nuevo
            request_id = getattr(request, 'request_id', None) or f"cmpl-{random_uuid()}"
            sampling_params = request.to_sampling_params(
                max_tokens=max_tokens,
                logits_processor_pattern=logits_processor_pattern,
                default_sampling_params=default_sampling_params
            )
            # Detectar si hay imágenes en los mensajes
            has_multimodal = False
            for msg in request.messages:
                content = msg.get("content", "")
                if isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "image_url":
                            has_multimodal = True
                            image_url = item.get("image_url", {}).get("url", "")
                            if image_url.startswith("data:image"):
                                image_size = len(image_url)
                                print(f"[vLLM] 🖼️ Mensaje multimodal detectado - Imagen base64: {image_size} caracteres")
                            break
                    if has_multimodal:
                        break
            
            # vLLM tiene soporte nativo para modelos multimodales
            # vLLM acepta imágenes en formato Base64 directamente y las procesa internamente
            # NO necesitamos usar el processor de transformers manualmente
            # El tokenizer del engine debería ser un processor si el modelo es multimodal
            tokenizer = await self.engine.get_tokenizer()
            
            # Verificar si el tokenizer es un processor (tiene método process_images o similar)
            # Para modelos multimodales, el tokenizer del engine debería ser un processor
            # que maneja automáticamente la conversión de imágenes a tokens
            is_processor = hasattr(tokenizer, 'process_images') or hasattr(tokenizer, 'image_processor')
            
            if has_multimodal:
                print(f"[vLLM] 🖼️ Procesando mensaje multimodal con imágenes")
                print(f"[vLLM] 📊 Tokenizer es processor: {is_processor}")
                
                # Para modelos multimodales, vLLM procesa automáticamente las imágenes en Base64
                # cuando pasamos los mensajes en el formato correcto (con image_url)
                # El tokenizer del engine debería manejar automáticamente la conversión de imágenes a tokens
                prompt_text = tokenizer.apply_chat_template(
                    request.messages,
                    tokenize=False,
                    add_generation_prompt=request.add_generation_prompt
                )
                
                print(f"[vLLM] ✅ Mensaje multimodal procesado - vLLM procesará las imágenes automáticamente")
                print(f"[vLLM] 📊 Tamaño del prompt: {len(prompt_text)} caracteres")
                
                # NOTA: El prompt puede ser corto porque las imágenes se procesan internamente por vLLM
                # vLLM procesa las imágenes en Base64 directamente, no las convierte a texto en el prompt
            else:
                # Sin imágenes, usar tokenizer normal
                prompt_text = tokenizer.apply_chat_template(
                    request.messages,
                    tokenize=False,
                    add_generation_prompt=request.add_generation_prompt
                )
                print(f"[vLLM] 📝 Prompt de texto generado")
            
            # Logging del prompt generado (solo primeros 500 caracteres para no saturar)
            prompt_preview = prompt_text[:500] if len(prompt_text) > 500 else prompt_text
            print(f"[vLLM] 📝 Prompt generado (preview): {prompt_preview}...")
            print(f"[vLLM] 📊 Tamaño total del prompt: {len(prompt_text)} caracteres")
            
            generator = self.engine.generate(prompt_text, sampling_params, request_id)
        else: # CompletionRequest
            request_id = f"cmpl-{random_uuid()}"
            sampling_params = request.to_sampling_params(
                max_tokens=max_tokens,
                logits_processor_pattern=logits_processor_pattern,
                default_sampling_params=default_sampling_params
            )
            generator = self.engine.generate(request.prompt, sampling_params, request_id)

        # Manejo de respuesta (Streaming vs No-Streaming)
        if request.stream:
            async def stream_generator():
                previous_text = ""  # Trackear texto anterior para calcular delta
                
                async for output in generator:
                    # Construir formato de streaming compatible con OpenAI API
                    chunk_data = {
                        "id": request_id,
                        "object": "chat.completion.chunk" if isinstance(request, ChatCompletionRequest) else "text_completion.chunk",
                        "created": int(time.time()),
                        "model": request.model or MODEL_PATH,
                        "choices": []
                    }
                    
                    # Procesar cada output
                    for i, output_item in enumerate(output.outputs):
                        choice_data = {
                            "index": i,
                            "delta": {},
                            "finish_reason": None
                        }
                        
                        # Calcular el delta (texto nuevo desde la última iteración)
                        current_text = output_item.text if output_item.text else ""
                        delta_text = current_text[len(previous_text):] if len(current_text) > len(previous_text) else ""
                        
                        # Actualizar el texto anterior para la próxima iteración
                        previous_text = current_text
                        
                        # Solo enviar delta si hay texto nuevo
                        if delta_text:
                            choice_data["delta"]["content"] = delta_text
                        
                        # Si hay finish_reason, agregarlo
                        if output_item.finish_reason:
                            choice_data["finish_reason"] = output_item.finish_reason
                        
                        chunk_data["choices"].append(choice_data)
                    
                    # Enviar el chunk en formato SSE (solo si hay contenido)
                    if any(choice.get("delta", {}) for choice in chunk_data["choices"]):
                        yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"
                
                # Enviar el mensaje de finalización
                yield "data: [DONE]\n\n"
            
            return StreamingResponse(stream_generator(), media_type="text/event-stream")
        else:
            final_output = None
            async for output in generator:
                final_output = output
            
            if final_output is None:
                return JSONResponse(ErrorResponse(message="No se generó ninguna salida.").dict(), status_code=500)
            
            # Construir respuesta compatible con OpenAI API
            if isinstance(request, ChatCompletionRequest):
                # Extraer el texto generado del primer output
                output_text = final_output.outputs[0].text if final_output.outputs else ""
                finish_reason = final_output.outputs[0].finish_reason if final_output.outputs else "stop"
                
                # Construir la respuesta de chat
                choice = ChatCompletionResponseChoice(
                    index=0,
                    message=ChatMessage(role="assistant", content=output_text),
                    finish_reason=finish_reason or "stop"
                )
                
                # Calcular tokens de uso
                num_prompt_tokens = len(final_output.prompt_token_ids) if final_output.prompt_token_ids else 0
                num_completion_tokens = sum(len(out.token_ids) for out in final_output.outputs) if final_output.outputs else 0
                usage = UsageInfo(
                    prompt_tokens=num_prompt_tokens,
                    completion_tokens=num_completion_tokens,
                    total_tokens=num_prompt_tokens + num_completion_tokens
                )
                
                response = ChatCompletionResponse(
                    id=request_id,
                    created=int(time.time()),
                    model=request.model or MODEL_PATH,
                    choices=[choice],
                    usage=usage
                )
            else:
                # Para CompletionRequest, construir respuesta similar
                output_text = final_output.outputs[0].text if final_output.outputs else ""
                finish_reason = final_output.outputs[0].finish_reason if final_output.outputs else "stop"
                
                # Construir respuesta simple en formato JSON
                response_data = {
                    "id": request_id,
                    "object": "text_completion",
                    "created": int(time.time()),
                    "model": request.model or MODEL_PATH,
                    "choices": [{
                        "text": output_text,
                        "index": 0,
                        "finish_reason": finish_reason or "stop"
                    }],
                    "usage": {
                        "prompt_tokens": len(final_output.prompt_token_ids) if final_output.prompt_token_ids else 0,
                        "completion_tokens": sum(len(out.token_ids) for out in final_output.outputs) if final_output.outputs else 0,
                        "total_tokens": (len(final_output.prompt_token_ids) if final_output.prompt_token_ids else 0) + 
                                      (sum(len(out.token_ids) for out in final_output.outputs) if final_output.outputs else 0)
                    }
                }
                return JSONResponse(response_data)
            
            return JSONResponse(response.model_dump(exclude_unset=True))

    # --- Rutas de API ---
    @app.post("/v1/chat/completions")
    async def handle_chat(self, request: Request):
        """Manejar chat completions con soporte para request_id personalizado"""
        body = await request.json()
        # Extraer request_id del body si existe
        custom_request_id = body.get("request_id")
        # Crear ChatCompletionRequest sin request_id (se añadirá después)
        if "request_id" in body:
            del body["request_id"]
        chat_request = ChatCompletionRequest(**body)
        # Asignar request_id personalizado si se proporcionó
        if custom_request_id:
            chat_request.request_id = custom_request_id
        return await self.process_request(chat_request)

    @app.post("/v1/completions")
    async def handle_completion(self, request: CompletionRequest):
        return await self.process_request(request)
    
    @app.post("/v1/requests/{request_id}/cancel")
    async def cancel_request(self, request_id: str):
        """Cancelar una generación activa usando abort_request de vLLM"""
        try:
            # Usar abort_request del engine para cancelar la generación
            self.engine.abort_request(request_id)
            print(f"[vLLM] 🛑 Request cancelado: {request_id}")
            return {"success": True, "message": f"Request {request_id} cancelado exitosamente"}
        except Exception as e:
            print(f"[vLLM] ❌ Error cancelando request {request_id}: {e}")
            return JSONResponse(
                {"success": False, "error": str(e)},
                status_code=500
            )

# --- 6. Vinculación y Despliegue ---
# Este es el objeto que 'serve run' buscará e importará
medgemma_app = VLLMDeployment.bind(engine_args=engine_args)

