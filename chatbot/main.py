"""
FastAPI Backend para Chatbot IMSS
Totalmente asíncrono y escalable
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import json
import logging
import asyncio
import os
import time
import html
import httpx


class AbortController:
    """Clase simple para simular AbortController de JavaScript en Python"""
    def __init__(self):
        self.signal = AbortSignal()
    
    def abort(self):
        """Abortar la operación"""
        self.signal.abort()


class AbortSignal:
    """Clase simple para simular AbortSignal de JavaScript en Python"""
    def __init__(self):
        self._aborted = False
    
    @property
    def aborted(self) -> bool:
        """Verificar si fue abortado"""
        return self._aborted
    
    def abort(self):
        """Marcar como abortado"""
        self._aborted = True

# Importar módulos
from memory_manager import get_memory_manager
from media_storage import media_storage
from langchain_system import get_medical_chain
from medical_analysis import analyze_image_with_fallback
from transcription_service import transcribe_audio
from auth_manager import get_auth_manager
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, Header, Request
from security_llm import get_security_manager
from optimizations import get_rate_limiter

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="Chatbot IMSS API",
    description="API asíncrona para análisis médico con LM Studio y LangChain",
    version="1.0.0"
)

# Configurar CORS para permitir conexiones desde localhost
# Permitir conexiones desde localhost:3000 (Next.js) y localhost:3001, etc.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
if CORS_ORIGINS == "*":
    # Cuando allow_origins=["*"], allow_credentials debe ser False
    # Esto permite todos los orígenes sin credenciales (adecuado para desarrollo)
    allow_origins = ["*"]
    allow_credentials = False
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"]
    allow_headers = ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
else:
    # Con orígenes específicos, podemos usar allow_credentials=True
    # pero debemos especificar métodos y headers explícitamente (no usar "*")
    allow_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]
    allow_credentials = True
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"]
    allow_headers = ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "Access-Control-Request-Method", "Access-Control-Request-Headers"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
    expose_headers=["*"],
    max_age=600,
)

# Inicializar componentes
memory_manager = get_memory_manager()
auth_manager = get_auth_manager()
security = HTTPBearer()
security_manager = get_security_manager()
rate_limiter = get_rate_limiter()

# Diccionario para rastrear generaciones activas: {request_id: {"session_id": str, "user_id": str, "vllm_request_id": str}}
active_requests: Dict[str, Dict[str, Any]] = {}

# Configurar endpoint de vLLM desde variables de entorno
# Prioridad: VLLM_ENDPOINT > OLLAMA_ENDPOINT > LM_STUDIO_URL (para compatibilidad)
VLLM_ENDPOINT = os.getenv("VLLM_ENDPOINT", os.getenv("OLLAMA_ENDPOINT", os.getenv("LM_STUDIO_URL", "http://localhost:8000/v1/")))
# Asegurar que termine con /v1/ para compatibilidad con OpenAI API
if not VLLM_ENDPOINT.endswith("/v1/"):
    if VLLM_ENDPOINT.endswith("/"):
        VLLM_ENDPOINT = VLLM_ENDPOINT + "v1/"
    else:
        VLLM_ENDPOINT = VLLM_ENDPOINT + "/v1/"
medical_chain = get_medical_chain(VLLM_ENDPOINT)

# Configurar LangSmith (tracing) si está habilitado por variables de entorno
try:
    from config import Config
    if str(os.getenv("USE_LOCAL_OBSERVABILITY", Config.USE_LOCAL_OBSERVABILITY)).lower() in ("1", "true", "yes"):
        # Modo local: no activar LangSmith remoto, solo SQLite de métricas
        os.environ.pop("LANGCHAIN_TRACING_V2", None)
        logger.info("ℹ️ Observabilidad local habilitada (SQLite), LangSmith remoto deshabilitado")
    elif str(os.getenv("LANGCHAIN_TRACING_V2", Config.LANGCHAIN_TRACING_V2)).lower() in ("1", "true", "yes"):
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        if Config.LANGCHAIN_API_KEY:
            os.environ["LANGCHAIN_API_KEY"] = Config.LANGCHAIN_API_KEY
        if Config.LANGCHAIN_PROJECT:
            os.environ["LANGCHAIN_PROJECT"] = Config.LANGCHAIN_PROJECT
        logger.info(f"✅ LangSmith tracing habilitado (proyecto: {os.getenv('LANGCHAIN_PROJECT', 'default')})")
    else:
        logger.info("ℹ️ LangSmith tracing deshabilitado")
except Exception as _e:
    logger.warning(f"⚠️ No se pudo configurar LangSmith: {_e}")


# Modelos Pydantic
class ChatRequest(BaseModel):
    message: Optional[str] = ""
    image: Optional[str] = None
    image_format: str = "jpeg"
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    stream: bool = False
    json_mode: bool = False
    request_id: Optional[str] = None


class CancelRequest(BaseModel):
    request_id: str
    session_id: Optional[str] = None


class ImageAnalysisRequest(BaseModel):
    image_data: str
    image_format: str = "jpeg"
    prompt: str = "Analiza esta imagen médica del IMSS"
    session_id: Optional[str] = None
    user_id: Optional[str] = None


class TranscriptionRequest(BaseModel):
    audio_data: str
    audio_format: str = "webm"
    language: Optional[str] = "es"


class TTSRequest(BaseModel):
    text: str
    speaker_id: Optional[str] = "ash"  # Opciones: nova, ballad, ash


class ChatResponse(BaseModel):
    response: str
    session_id: str
    is_image_analysis: Optional[bool] = False
    model_used: Optional[str] = None
    provider: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# Funciones de dependencia para autenticación
async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[Dict[str, Any]]:
    """Obtener usuario actual desde token"""
    if not authorization:
        return None
    
    try:
        # Extraer token del header "Bearer <token>"
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
        
        user = auth_manager.verify_token(token)
        return user
    except Exception as e:
        logger.warning(f"Error verificando token: {e}")
        return None


def require_auth(user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    """Dependencia que requiere autenticación"""
    if not user:
        raise HTTPException(status_code=401, detail="No autorizado. Por favor inicia sesión.")
    return user


# Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"status": "ok", "service": "Chatbot IMSS API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "medical_analyzer": "enabled"}


# Endpoints de autenticación
@app.post("/api/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    """Registrar nuevo usuario"""
    try:
        result = auth_manager.register_user(req.email, req.password, req.name)
        if result.get("success"):
            return AuthResponse(success=True, user={"id": result["user_id"], "email": req.email, "name": req.name})
        else:
            return AuthResponse(success=False, error=result.get("error", "Error al registrar usuario"))
    except Exception as e:
        logger.error(f"Error en registro: {e}")
        return AuthResponse(success=False, error=str(e))


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Iniciar sesión"""
    try:
        result = auth_manager.login_user(req.email, req.password)
        if result.get("success"):
            return AuthResponse(
                success=True,
                token=result.get("token"),
                user=result.get("user")
            )
        else:
            return AuthResponse(success=False, error=result.get("error", "Credenciales inválidas"))
    except Exception as e:
        logger.error(f"Error en login: {e}")
        return AuthResponse(success=False, error=str(e))


@app.post("/api/auth/logout")
async def logout(user: Dict[str, Any] = Depends(require_auth), authorization: Optional[str] = Header(None)):
    """Cerrar sesión"""
    try:
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
            auth_manager.logout_user(token)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error en logout: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/auth/me")
async def get_current_user_info(user: Dict[str, Any] = Depends(require_auth)):
    """Obtener información del usuario actual"""
    return {"success": True, "user": user}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, user: Dict[str, Any] = Depends(require_auth), request: Request = None):
    """Endpoint principal para chat con soporte de imágenes y streaming - Requiere autenticación"""
    try:
        # Rate limiting por usuario
        user_id = user.get('user_id') or user.get('id', 'unknown')
        # Obtener IP del cliente (FastAPI inyecta Request automáticamente)
        client_ip = request.client.host if request and request.client else 'unknown'
        
        # Aplicar rate limiting
        if not rate_limiter.is_allowed(client_ip):
            remaining = rate_limiter.get_remaining(client_ip)
            raise HTTPException(
                status_code=429,
                detail=f"Demasiadas peticiones. Intenta de nuevo en un momento. Peticiones restantes: {remaining}"
            )
        
        # Generar request_id si no se proporciona
        request_id = req.request_id or f"req-{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
        
        logger.info(f"📥 Nuevo mensaje - User: {user.get('email')}, Session: {req.session_id}, Request ID: {request_id}, Tiene imagen: {req.image is not None}")
        
        # Validar que haya mensaje o imagen
        if not req.message and not req.image:
            raise HTTPException(status_code=400, detail="Message or image is required")
        
        # Validar y sanitizar entrada del usuario (LLM01: Inyección de Prompts)
        if req.message:
            is_valid, sanitized, error = security_manager.validate_input(req.message)
            if not is_valid:
                logger.warning(f"⚠️ Intento de inyección de prompts bloqueado para usuario {user.get('email')}: {error}")
                raise HTTPException(status_code=400, detail=error)
            req.message = sanitized
        
        # Generar session_id si no existe
        # Si no hay session_id pero hay user_id, intentar usar la última conversación del usuario
        if not req.session_id and req.user_id:
            last_session_id = memory_manager.get_last_conversation(req.user_id)
            if last_session_id:
                session_id = last_session_id
                logger.info(f"🔄 Usando última conversación del usuario: {session_id[:8]}...")
            else:
                session_id = str(uuid.uuid4())
                logger.info(f"🆕 Creando nueva conversación: {session_id[:8]}...")
        else:
            session_id = req.session_id or str(uuid.uuid4())
        
        # Asegurar conversación si viene user_id
        if req.user_id:
            memory_manager.ensure_conversation(req.user_id, session_id)
        
        # Procesar imagen si existe
        if req.image:
            logger.info("🖼️ Procesando imagen médica")
            
            # Registrar request activo para cancelación (imágenes con Ollama)
            active_requests[request_id] = {
                "session_id": session_id,
                "user_id": user_id,
                "provider": "ollama",  # Indicar que es Ollama
                "type": "image",  # Tipo de request
                "abort_controller": None,  # Se asignará en process_image_stream
            }
            
            if req.stream:
                # Streaming con imagen
                return StreamingResponse(
                    process_image_stream(req.message, req.image, session_id, request_id),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Accel-Buffering': 'no'
                    }
                )
            else:
                # Sin streaming - imagen
                start_ts = int(time.time() * 1000)
                # Guardar mensaje del usuario en historial antes del análisis
                try:
                    memory_manager.add_message_to_conversation(session_id, "user", req.message or "[Imagen enviada]", {"has_image": True})
                except Exception as _e:
                    logger.warning(f"⚠️ No se pudo persistir mensaje de usuario (imagen): {_e}")

                # Obtener historial y contexto de entidades para análisis de imagen
                conversation_history = []
                entity_context = ""
                try:
                    # Obtener historial de conversación
                    from langchain_system import get_medical_chain
                    medical_chain_instance = get_medical_chain(VLLM_ENDPOINT)
                    history = medical_chain_instance._get_chat_history(session_id)
                    conversation_history = history.messages[-5:] if history.messages else []
                    
                    # Obtener contexto de entidades
                    entity_context = await medical_chain_instance._get_entity_context_async()
                    
                    # Obtener system prompt
                    system_prompt = medical_chain_instance.system_prompt
                except Exception as e:
                    logger.warning(f"⚠️ No se pudo obtener contexto de Langchain: {e}")
                    system_prompt = None
                
                # Crear AbortController para cancelación
                abort_controller = AbortController()
                active_requests[request_id]["abort_controller"] = abort_controller
                
                try:
                    analysis_result = await analyze_image_with_fallback(
                        req.image,
                        req.image_format,
                        req.message or "Analiza esta radiografía médica del IMSS",
                        session_id=session_id,
                        conversation_history=conversation_history,
                        entity_context=entity_context,
                        system_prompt=system_prompt,
                        abort_controller=abort_controller
                    )
                finally:
                    # Limpiar request activo
                    if request_id in active_requests:
                        del active_requests[request_id]
                
                if not analysis_result.get('success'):
                    raise HTTPException(status_code=500, detail=analysis_result.get('error', 'Error analyzing image'))
                
                # Guardar imagen
                file_info = media_storage.save_from_base64(
                    base64_data=req.image,
                    mimetype=f"image/{req.image_format}",
                    session_id=session_id
                )
                
                # Persistir respuesta del asistente
                try:
                    memory_manager.add_message_to_conversation(session_id, "assistant", analysis_result.get('analysis', ''), {"is_image_analysis": True, "model": analysis_result.get('model', 'unknown'), "provider": analysis_result.get('provider', 'unknown'), "file": file_info})
                except Exception as _e:
                    logger.warning(f"⚠️ No se pudo persistir respuesta del asistente (imagen): {_e}")

                # Métricas
                try:
                    end_ts = int(time.time() * 1000)
                    output_text = analysis_result.get('analysis', '') or ''
                    memory_manager.log_chat_metrics(
                        session_id=session_id,
                        input_chars=len(req.message or ''),
                        output_chars=len(output_text),
                        model=analysis_result.get('model', 'unknown'),
                        provider=analysis_result.get('provider', 'unknown'),
                        started_at=start_ts,
                        ended_at=end_ts,
                        duration_ms=end_ts - start_ts,
                        stream=False,
                        is_image=True,
                        success=True,
                    )
                except Exception as _e:
                    logger.warning(f"⚠️ No se pudieron registrar métricas (imagen): {_e}")

                # Validar y sanitizar salida (LLM05: Manejo Inadecuado de Salidas, LLM07: Filtración de Prompts)
                raw_response = analysis_result.get('analysis', '')
                validated_response = security_manager.validate_output(raw_response)
                
                return ChatResponse(
                    response=validated_response,
                    session_id=session_id,
                    is_image_analysis=True,
                    model_used=analysis_result.get('model', 'unknown'),
                    provider=analysis_result.get('provider', 'unknown')
                )
        
        # Procesar mensaje de texto
        if req.stream:
            # Streaming con texto
            # Guardar mensaje del usuario antes de iniciar streaming
            try:
                memory_manager.add_message_to_conversation(session_id, "user", req.message or "", {"stream": True, "user_id": req.user_id})
            except Exception as _e:
                logger.warning(f"⚠️ No se pudo persistir mensaje de usuario (stream): {_e}")

            # Obtener nombre del usuario para personalización
            user_name = user.get('name')
            
            return StreamingResponse(
                process_text_stream(req.message, session_id, user_name=user_name),
                media_type="text/event-stream",
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                    'Content-Type': 'text/event-stream; charset=utf-8'
                }
            )
        else:
            # Sin streaming - texto
            # Persistir mensaje del usuario
            try:
                memory_manager.add_message_to_conversation(session_id, "user", req.message or "")
            except Exception as _e:
                logger.warning(f"⚠️ No se pudo persistir mensaje de usuario (texto): {_e}")

            if req.json_mode:
                start_ts = int(time.time() * 1000)
                result_json = await medical_chain.process_chat_json(req.message)
                # Persistir JSON como texto para historial
                try:
                    memory_manager.add_message_to_conversation(session_id, "assistant", json.dumps(result_json, ensure_ascii=False))
                except Exception as _e:
                    logger.warning(f"⚠️ No se pudo persistir respuesta JSON: {_e}")
                try:
                    end_ts = int(time.time() * 1000)
                    out_text = json.dumps(result_json, ensure_ascii=False)
                    # Intentar estimar tokens (usage) con una llamada mínima
                    try:
                        messages = await medical_chain.build_context_messages(req.message, use_entities=True)
                        usage = await medical_chain.estimate_usage_from_messages(messages)
                        input_tokens = usage.get('input_tokens')
                        output_tokens = usage.get('output_tokens')
                        total_tokens = usage.get('total_tokens')
                    except Exception:
                        input_tokens = output_tokens = total_tokens = None
                    memory_manager.log_chat_metrics(
                        session_id=session_id,
                        input_chars=len(req.message or ''),
                        output_chars=len(out_text),
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        total_tokens=total_tokens,
                        started_at=start_ts,
                        ended_at=end_ts,
                        duration_ms=end_ts - start_ts,
                        model=usage.get('model') if 'usage' in locals() and usage.get('model') else 'google/medgemma-27b-it',
                        provider='vllm',
                        stream=False,
                        is_image=False,
                        success=True,
                    )
                except Exception as _e:
                    logger.warning(f"⚠️ No se pudieron registrar métricas (json): {_e}")
                # Validar y sanitizar salida JSON
                raw_response = json.dumps(result_json, ensure_ascii=False)
                validated_response = security_manager.validate_output(raw_response)
                
                return ChatResponse(
                    response=validated_response,
                    session_id=session_id
                )
            else:
                # Registrar request activo para cancelación (texto con vLLM)
                # El request_id del frontend se usa como vllm_request_id también
                active_requests[request_id] = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "provider": "vllm",  # Indicar que es vLLM
                    "type": "text",  # Tipo de request
                    "vllm_request_id": request_id,  # Usar el mismo request_id para vLLM
                }
                
                try:
                    start_ts = int(time.time() * 1000)
                    # Obtener nombre del usuario para personalización
                    user_name = user.get('name')
                    response = await medical_chain.process_chat(req.message, session_id, request_id=request_id, user_name=user_name)
                    
                    # Persistir respuesta del asistente
                    try:
                        memory_manager.add_message_to_conversation(session_id, "assistant", response or "")
                    except Exception as _e:
                        logger.warning(f"⚠️ No se pudo persistir respuesta del asistente (texto): {_e}")
                    
                    try:
                        end_ts = int(time.time() * 1000)
                        # Intentar estimar tokens (usage)
                        try:
                            messages = await medical_chain.build_context_messages(req.message, use_entities=True)
                            usage = await medical_chain.estimate_usage_from_messages(messages)
                            input_tokens = usage.get('input_tokens')
                            output_tokens = usage.get('output_tokens')
                            total_tokens = usage.get('total_tokens')
                        except Exception:
                            input_tokens = output_tokens = total_tokens = None
                        memory_manager.log_chat_metrics(
                            session_id=session_id,
                            input_chars=len(req.message or ''),
                            output_chars=len(response or ''),
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            total_tokens=total_tokens,
                            started_at=start_ts,
                            ended_at=end_ts,
                            duration_ms=end_ts - start_ts,
                            model=usage.get('model') if 'usage' in locals() and usage.get('model') else 'google/medgemma-27b-it',
                            provider='vllm',
                            stream=False,
                            is_image=False,
                            success=True,
                        )
                    except Exception as _e:
                        logger.warning(f"⚠️ No se pudieron registrar métricas (texto): {_e}")
                    
                    # Validar y sanitizar salida (LLM05: Manejo Inadecuado de Salidas, LLM07: Filtración de Prompts)
                    validated_response = security_manager.validate_output(response)
                    
                    return ChatResponse(
                        response=validated_response,
                        session_id=session_id
                    )
                finally:
                    # Limpiar request activo
                    if request_id in active_requests:
                        del active_requests[request_id]
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en chat_endpoint: {e}")
        # Limpiar request activo en caso de error
        if request_id in active_requests:
            del active_requests[request_id]
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/cancel")
async def cancel_chat_endpoint(req: CancelRequest, user: Dict[str, Any] = Depends(require_auth)):
    """Endpoint para cancelar una generación activa"""
    try:
        user_id = user.get('user_id') or user.get('id', 'unknown')
        
        # Verificar que el request existe y pertenece al usuario
        if req.request_id not in active_requests:
            return {"success": False, "error": "Request no encontrado o ya completado"}
        
        request_info = active_requests[req.request_id]
        
        # Validar que el request pertenece al usuario
        if request_info.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="No autorizado para cancelar este request")
        
        provider = request_info.get("provider", "vllm")
        
        # Cancelar según el provider
        if provider == "ollama":
            # Para Ollama, cancelar usando AbortController
            abort_controller = request_info.get("abort_controller")
            if abort_controller:
                try:
                    abort_controller.abort()
                    logger.info(f"✅ Cancelación enviada a Ollama para request_id: {req.request_id}")
                except Exception as e:
                    logger.warning(f"⚠️ Error cancelando en Ollama: {e}")
            else:
                logger.warning(f"⚠️ No se encontró AbortController para request_id: {req.request_id}")
        elif provider == "vllm":
            # Para vLLM, usar el endpoint de cancelación
            vllm_request_id = request_info.get("vllm_request_id")
            if vllm_request_id:
                try:
                    # Llamar al endpoint de cancelación de vLLM
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        # Construir URL correcta: quitar /v1/ del final si existe
                        base_url = VLLM_ENDPOINT.rstrip('/v1/').rstrip('/')
                        cancel_url = f"{base_url}/v1/requests/{vllm_request_id}/cancel"
                        await client.post(cancel_url)
                        logger.info(f"✅ Cancelación enviada a vLLM para request_id: {req.request_id}")
                except Exception as e:
                    logger.warning(f"⚠️ Error cancelando en vLLM: {e}")
        
        # Limpiar request activo
        del active_requests[req.request_id]
        
        logger.info(f"🛑 Generación cancelada - Request ID: {req.request_id}, User: {user.get('email')}")
        return {"success": True, "message": "Generación cancelada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error cancelando generación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_text_stream(message: str, session_id: str, user_name: Optional[str] = None):
    """
    Procesar texto con streaming usando Server-Sent Events (SSE)
    
    Formato SSE personalizado:
    - Cada chunk: data: {"content": "texto del chunk", "done": false}\n\n
    - Finalización: data: {"content": "", "done": true, "session_id": "..."}\n\n
    - Error: data: {"error": "mensaje de error"}\n\n
    
    El frontend debe:
    1. Leer el stream línea por línea
    2. Buscar líneas que empiecen con "data: "
    3. Parsear el JSON después de "data: "
    4. Acumular content hasta recibir done: true
    5. Manejar errores si viene el campo "error"
    
    Args:
        message: Mensaje del usuario
        session_id: ID de sesión
        user_name: Nombre del usuario para personalización
    """
    try:
        full_response = ""
        start_ts = int(time.time() * 1000)
        chunk_count = 0
        
        logger.info(f"🔄 Iniciando streaming para sesión {session_id[:8]}...")
        
        # Stream chunks desde LangChain
        try:
            async for chunk in medical_chain.stream_chat(message, session_id, user_name=user_name):
                if chunk:
                    chunk_count += 1
                    # Asegurar que el chunk sea string y esté en UTF-8
                    chunk_str = str(chunk) if not isinstance(chunk, str) else chunk
                    full_response += chunk_str
                    
                    # Validar chunk individual (sanitización básica)
                    # Nota: La validación completa se hace al final del stream
                    chunk_str = html.escape(chunk_str) if chunk_str else ""
                    
                    # Enviar chunk como SSE con encoding UTF-8
                    # Formato: data: {"content": "chunk", "done": false}\n\n
                    chunk_data = json.dumps({'content': chunk_str, 'done': False}, ensure_ascii=False)
                    yield f"data: {chunk_data}\n\n"
        except Exception as stream_err:
            logger.error(f"❌ Error en stream_chat: {stream_err}", exc_info=True)
            error_data = json.dumps({'error': f'Error en generación: {str(stream_err)}'}, ensure_ascii=False)
            yield f"data: {error_data}\n\n"
            return
        
        logger.info(f"✅ Streaming completado: {chunk_count} chunks, {len(full_response)} caracteres totales")
        
        # Validar y sanitizar respuesta completa (LLM05, LLM07)
        validated_response = security_manager.validate_output(full_response)
        
        # Persistir respuesta completa al finalizar el stream
        try:
            memory_manager.add_message_to_conversation(session_id, "assistant", validated_response, {"stream": True})
            logger.debug(f"💾 Respuesta persistida para sesión {session_id[:8]}")
        except Exception as persist_err:
            logger.error(f"❌ Error persistiendo respuesta: {persist_err}", exc_info=True)
            logger.warning(f"⚠️ No se pudo persistir respuesta del asistente (stream): {persist_err}")
        
        # Métricas
        try:
            end_ts = int(time.time() * 1000)
            duration_ms = end_ts - start_ts
            memory_manager.log_chat_metrics(
                session_id=session_id,
                input_chars=len(message or ''),
                output_chars=len(full_response or ''),
                started_at=start_ts,
                ended_at=end_ts,
                duration_ms=duration_ms,
                model='google/medgemma-27b',
                provider='vllm',
                stream=True,
                is_image=False,
                success=True,
            )
            logger.debug(f"📊 Métricas registradas: {duration_ms}ms, {len(full_response)} chars")
        except Exception as metrics_err:
            logger.error(f"❌ Error registrando métricas: {metrics_err}", exc_info=True)
            logger.warning(f"⚠️ No se pudieron registrar métricas (stream): {metrics_err}")

        # Enviar señal de finalización
        # Formato: data: {"content": "", "done": true, "session_id": "..."}\n\n
        final_data = json.dumps({'content': '', 'done': True, 'session_id': session_id}, ensure_ascii=False)
        yield f"data: {final_data}\n\n"
        
    except Exception as e:
        logger.error(f"❌ Error crítico en streaming de texto: {e}", exc_info=True)
        logger.error(f"📋 Tipo de error: {type(e).__name__}")
        error_data = json.dumps({'error': str(e)}, ensure_ascii=False)
        yield f"data: {error_data}\n\n"


async def process_image_stream(message: str, image_data: str, session_id: str, request_id: str):
    """Procesar imagen con streaming con soporte para cancelación"""
    try:
        # Crear AbortController para cancelación
        abort_controller = AbortController()
        
        # Registrar AbortController en active_requests
        if request_id in active_requests:
            active_requests[request_id]["abort_controller"] = abort_controller
        
        async for chunk in medical_chain.stream_medical_analysis(message, image_data, session_id, abort_controller=abort_controller):
            # Verificar si fue cancelado
            if abort_controller.signal.aborted:
                logger.info(f"🛑 Streaming de imagen cancelado para request_id: {request_id}")
                yield f"data: {json.dumps({'content': '', 'done': True, 'cancelled': True, 'session_id': session_id})}\n\n"
                return
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        
        yield f"data: {json.dumps({'content': '', 'done': True, 'session_id': session_id})}\n\n"
    except asyncio.CancelledError:
        logger.info(f"🛑 Streaming de imagen cancelado (CancelledError) para request_id: {request_id}")
        yield f"data: {json.dumps({'content': '', 'done': True, 'cancelled': True, 'session_id': session_id})}\n\n"
    except Exception as e:
        logger.error(f"❌ Error en streaming de imagen: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        # Limpiar request activo
        if request_id in active_requests:
            del active_requests[request_id]


@app.post("/api/image-analysis")
async def image_analysis_endpoint(req: ImageAnalysisRequest):
    """Endpoint específico para análisis de imágenes"""
    try:
        logger.info("🔍 Analizando imagen")
        
        # Obtener historial y contexto de entidades para análisis de imagen
        conversation_history = []
        entity_context = ""
        system_prompt = None
        try:
            # Obtener historial de conversación si hay session_id
            if req.session_id:
                from langchain_system import get_medical_chain
                medical_chain_instance = get_medical_chain(VLLM_ENDPOINT)
                history = medical_chain_instance._get_chat_history(req.session_id)
                conversation_history = history.messages[-5:] if history.messages else []
                
                # Obtener contexto de entidades
                entity_context = await medical_chain_instance._get_entity_context_async()
                
                # Obtener system prompt
                system_prompt = medical_chain_instance.system_prompt
        except Exception as e:
            logger.warning(f"⚠️ No se pudo obtener contexto de Langchain: {e}")
        
        analysis_result = await analyze_image_with_fallback(
            req.image_data,
            req.image_format,
            req.prompt,
            session_id=req.session_id,
            conversation_history=conversation_history,
            entity_context=entity_context,
            system_prompt=system_prompt
        )
        
        if not analysis_result.get('success'):
            raise HTTPException(status_code=500, detail=analysis_result.get('error'))
        
        # Guardar imagen
        file_info = media_storage.save_from_base64(
            base64_data=req.image_data,
            mimetype=f"image/{req.image_format}",
            session_id=req.session_id
        )
        
        return {
            "success": True,
            "analysis": analysis_result.get('analysis', ''),
            "model_used": analysis_result.get('model', 'unknown'),
            "provider": analysis_result.get('provider', 'unknown'),
            "file_info": file_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en análisis de imagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transcribe")
async def transcribe_endpoint(req: TranscriptionRequest, user: Dict[str, Any] = Depends(require_auth)):
    """Endpoint para transcribir audio usando Whisper"""
    try:
        logger.info(f"🎤 Transcribiendo audio - User: {user.get('email')}, Formato: {req.audio_format}")
        
        # Transcribir audio
        transcription_result = transcribe_audio(
            req.audio_data,
            req.audio_format,
            req.language
        )
        
        if not transcription_result.get('success'):
            raise HTTPException(status_code=500, detail=transcription_result.get('error', 'Error en transcripción'))
        
        return {
            "success": True,
            "text": transcription_result.get('text', ''),
            "language": transcription_result.get('language', 'es')
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en transcripción: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Instancia global de KaniTTS (cargada bajo demanda)
_kani_tts_model = None


def get_kani_tts_model():
    """
    Obtener instancia de KaniTTS (singleton)
    
    El modelo se descarga automáticamente la primera vez desde Hugging Face
    y se guarda en el cache local (~/.cache/huggingface/).
    En ejecuciones posteriores, se carga desde el cache local.
    """
    global _kani_tts_model
    if _kani_tts_model is None:
        try:
            from kani_tts import KaniTTS
            import torch
            import os
            from pathlib import Path
            
            # Forzar CPU (no usar GPU)
            device = "cpu"
            
            # Verificar si el modelo ya está en cache local
            cache_dir = os.path.expanduser("~/.cache/huggingface")
            model_name = "nineninesix/kani-tts-400m-es"
            model_cache_path = Path(cache_dir) / "hub" / model_name.replace("/", "--")
            
            if model_cache_path.exists():
                logger.info(f"🔊 Cargando KaniTTS desde cache local: {model_cache_path}")
            else:
                logger.info(f"🔊 Descargando KaniTTS por primera vez (se guardará en: {cache_dir})")
                logger.info(f"📦 Esto puede tardar varios minutos dependiendo de tu conexión...")
            
            # Cargar modelo con configuración para CPU
            # KaniTTS automáticamente usa el cache de Hugging Face si el modelo ya existe
            _kani_tts_model = KaniTTS(
                model_name,
                temperature=0.7,
                top_p=0.9,
                max_new_tokens=2000,
                repetition_penalty=1.2,
                suppress_logs=True,
                show_info=False,
            )
            
            # Forzar CPU explícitamente si el modelo tiene atributo device
            if hasattr(_kani_tts_model, 'model') and hasattr(_kani_tts_model.model, 'to'):
                _kani_tts_model.model.to(device)
            
            # Verificar que el modelo se guardó en cache
            if model_cache_path.exists():
                logger.info(f"✅ KaniTTS inicializado correctamente en CPU (cache: {model_cache_path})")
            else:
                logger.info(f"✅ KaniTTS inicializado correctamente en CPU")
        except ModuleNotFoundError as e:
            if 'nemo' in str(e).lower():
                error_msg = (
                    "El módulo 'nemo' (NVIDIA NeMo) no está instalado. "
                    "KaniTTS requiere nemo-toolkit. "
                    "Instala las dependencias con: pip install nemo-toolkit[all] "
                    "o ejecuta: pip install kani-tts (instala todas las dependencias)"
                )
                logger.error(f"❌ Error inicializando KaniTTS: {error_msg}")
                raise ModuleNotFoundError(error_msg) from e
            else:
                error_msg = f"Dependencia faltante: {e}. Instala las dependencias necesarias."
                logger.error(f"❌ Error inicializando KaniTTS: {error_msg}")
                raise ModuleNotFoundError(error_msg) from e
        except ImportError as e:
            error_msg = f"Error importando KaniTTS: {e}. Verifica que kani-tts esté instalado correctamente."
            logger.error(f"❌ Error inicializando KaniTTS: {error_msg}")
            raise ImportError(error_msg) from e
        except Exception as e:
            logger.error(f"❌ Error inicializando KaniTTS: {e}", exc_info=True)
            raise
    else:
        logger.debug("♻️ Reutilizando instancia existente de KaniTTS (ya cargado en memoria)")
    return _kani_tts_model


@app.post("/api/tts")
async def tts_endpoint(req: TTSRequest, user: Dict[str, Any] = Depends(require_auth)):
    """Endpoint para generar audio desde texto usando KaniTTS (CPU)"""
    try:
        logger.info(f"🔊 Generando audio TTS - User: {user.get('email')}, Texto: {req.text[:50]}...")
        
        # Validar que el texto no esté vacío
        if not req.text or not req.text.strip():
            raise HTTPException(status_code=400, detail="El texto no puede estar vacío")
        
        # Limitar longitud del texto (máximo 2000 caracteres para evitar problemas)
        text = req.text.strip()[:2000]
        
        # Obtener modelo KaniTTS
        try:
            model = get_kani_tts_model()
        except (ModuleNotFoundError, ImportError) as e:
            error_detail = (
                "El servicio de Text-to-Speech no está disponible. "
                "Faltan dependencias necesarias. "
                "Por favor, instala nemo-toolkit ejecutando: pip install nemo-toolkit[all] "
                "o reinstala kani-tts con todas sus dependencias: pip install kani-tts"
            )
            logger.error(f"❌ Error en TTS (dependencias faltantes): {e}")
            raise HTTPException(status_code=503, detail=error_detail)
        
        # Generar audio
        # Usar speaker_id si está disponible
        try:
            if hasattr(model, 'speaker_list') and req.speaker_id in (model.speaker_list or []):
                audio, processed_text = model(text, speaker_id=req.speaker_id)
            else:
                audio, processed_text = model(text)
        except Exception as e:
            logger.error(f"❌ Error generando audio: {e}")
            raise HTTPException(status_code=500, detail=f"Error generando audio: {str(e)}")
        
        # Convertir audio a base64 para enviarlo al frontend
        import base64
        import io
        import soundfile as sf
        
        # Guardar audio en buffer en memoria
        buffer = io.BytesIO()
        sf.write(buffer, audio, model.sample_rate, format='WAV')
        buffer.seek(0)
        
        # Convertir a base64
        audio_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        
        logger.info(f"✅ Audio generado exitosamente - Tamaño: {len(audio_base64)} caracteres base64")
        
        return {
            "success": True,
            "audio_data": audio_base64,
            "sample_rate": model.sample_rate,
            "format": "wav",
            "text": processed_text
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en TTS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
async def get_history(session_id: Optional[str] = Query(None, description="Filtrar por session_id"), user_id: Optional[str] = Query(None, description="User ID para validar pertenencia")):
    """Obtener historial de conversaciones desde SQLite"""
    try:
        if not session_id:
            return {"conversations": []}
        # Validar pertenencia si se proporciona user_id
        if user_id and not memory_manager.conversation_belongs_to_user(session_id, user_id):
            raise HTTPException(status_code=403, detail="Forbidden")
        messages = memory_manager.get_conversation_history(session_id=session_id, limit=200)
        return {"session_id": session_id, "messages": messages}
    except Exception as e:
        logger.error(f"❌ Error obteniendo historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics")
async def get_metrics(
    session_id: Optional[str] = Query(None, description="Filtrar por session_id"),
    user_id: Optional[str] = Query(None, description="User ID para validar pertenencia"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Obtener métricas desde SQLite (soporta filtros y paginación)"""
    try:
        if session_id and user_id and not memory_manager.conversation_belongs_to_user(session_id, user_id):
            raise HTTPException(status_code=403, detail="Forbidden")
        data = memory_manager.query_metrics(session_id=session_id, limit=limit, offset=offset)
        return {"metrics": data, "count": len(data)}
    except Exception as e:
        logger.error(f"❌ Error obteniendo métricas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ConversationCreateRequest(BaseModel):
    user_id: str
    title: Optional[str] = "Nueva conversación"


@app.post("/api/conversations")
async def create_conversation(req: ConversationCreateRequest):
    try:
        session_id = memory_manager.create_conversation(user_id=req.user_id, title=req.title or "Nueva conversación")
        return {"session_id": session_id, "title": req.title or "Nueva conversación"}
    except Exception as e:
        logger.error(f"❌ Error creando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations")
async def list_conversations(user_id: str = Query(...), limit: int = 100, offset: int = 0):
    try:
        items = memory_manager.list_conversations(user_id=user_id, limit=limit, offset=offset)
        return {"conversations": items}
    except Exception as e:
        logger.error(f"❌ Error listando conversaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/conversations")
async def delete_conversations(user_id: str = Query(...)):
    try:
        deleted = memory_manager.delete_all_conversations(user_id=user_id)
        return {"deleted": deleted}
    except Exception as e:
        logger.error(f"❌ Error eliminando conversaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ConversationRenameRequest(BaseModel):
    user_id: str
    title: str


@app.patch("/api/conversations/{session_id}")
async def rename_conversation(session_id: str, req: ConversationRenameRequest):
    try:
        ok = memory_manager.rename_conversation(session_id=session_id, user_id=req.user_id, new_title=req.title)
        if not ok:
            raise HTTPException(status_code=403, detail="Forbidden or not found")
        return {"session_id": session_id, "title": req.title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error renombrando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ConversationDeleteRequest(BaseModel):
    user_id: str


@app.delete("/api/conversations/{session_id}")
async def delete_conversation(session_id: str, req: ConversationDeleteRequest):
    """Eliminar una conversación individual"""
    try:
        ok = memory_manager.delete_conversation(session_id=session_id, user_id=req.user_id)
        if not ok:
            raise HTTPException(status_code=403, detail="Forbidden or not found")
        return {"session_id": session_id, "deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)

