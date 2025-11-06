"""
FastAPI Backend para Chatbot IMSS
Totalmente asíncrono y escalable
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
import uuid
import json
import logging
import asyncio
import os
import time

# Importar módulos
from memory_manager import get_memory_manager
from media_storage import media_storage
from langchain_system import get_medical_chain
from medical_analysis import analyze_image_with_fallback
from auth_manager import get_auth_manager
from transcription_service import transcribe_audio
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, Header, Request

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar optimizaciones de rendimiento (antes de crear la app)
from optimizations import get_token_cache, get_http_pool, get_http_pool_instance
token_cache = get_token_cache()
http_pool_instance = get_http_pool_instance()  # Instancia del pool para poder cerrarlo
http_pool = get_http_pool()  # Cliente HTTP del pool

# Lifespan context manager para inicializar y limpiar recursos
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestionar el ciclo de vida de la aplicación"""
    # Startup: Inicializar tareas asíncronas
    token_cache.start_cleanup_task()  # Iniciar limpieza automática de tokens expirados
    logger.info("✅ Optimizaciones de rendimiento inicializadas")
    yield
    # Shutdown: Limpiar recursos
    await http_pool_instance.close()
    logger.info("✅ Recursos de optimización cerrados")

# Inicializar FastAPI con lifespan
app = FastAPI(
    title="Chatbot IMSS API",
    description="API asíncrona para análisis médico con LM Studio y LangChain",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS para permitir conexiones remotas
# Permitir conexiones desde cualquier origen para desarrollo remoto y túneles SSH (Cloudflare, etc.)
# En producción, configurar con lista específica de orígenes permitidos
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
# Si CORS_ORIGINS es "*", permitir todos los orígenes (útil para túneles SSH)
if CORS_ORIGINS == "*":
    # Cuando allow_origins=["*"], allow_credentials debe ser False
    # Esto permite todos los orígenes sin credenciales (adecuado para desarrollo y túneles SSH)
    allow_origins = ["*"]
    allow_credentials = False
    allow_methods = ["*"]
    allow_headers = ["*"]
    # Permitir explícitamente el header Authorization para autenticación
    logger.info("✅ CORS configurado para permitir todos los orígenes (útil para túneles SSH)")
else:
    # Con orígenes específicos, podemos usar allow_credentials=True
    # pero debemos especificar métodos y headers explícitamente (no usar "*")
    allow_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]
    allow_credentials = True
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    allow_headers = ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
    logger.info(f"✅ CORS configurado para orígenes específicos: {allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)

# Inicializar componentes
memory_manager = get_memory_manager()
auth_manager = get_auth_manager()
security = HTTPBearer()

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
    json_mode: bool = False


class ImageAnalysisRequest(BaseModel):
    image_data: str
    image_format: str = "jpeg"
    prompt: str = "Analiza esta imagen médica del IMSS"
    session_id: Optional[str] = None
    user_id: Optional[str] = None


class TranscribeRequest(BaseModel):
    audio_data: str
    audio_format: str = "webm"
    language: Optional[str] = None


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
    authorization: Optional[str] = Header(None),
    request: Request = None
) -> Optional[Dict[str, Any]]:
    """Obtener usuario actual desde token con cache"""
    if not authorization:
        return None
    
    try:
        # Extraer token del header "Bearer <token>"
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
        
        # Verificar cache primero
        from optimizations import get_token_cache
        token_cache = get_token_cache()
        cached_user = token_cache.get(token)
        if cached_user:
            return cached_user
        
        # Si no está en cache, verificar con auth_manager
        user = auth_manager.verify_token(token)
        if user:
            # Guardar en cache
            token_cache.set(token, user)
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
async def chat_endpoint(
    req: ChatRequest, 
    user: Dict[str, Any] = Depends(require_auth),
    request: Request = None
):
    """Endpoint principal para chat con soporte de imágenes - Requiere autenticación"""
    try:
        # Rate limiting
        if request:
            client_ip = request.client.host if request.client else "unknown"
            from optimizations import get_rate_limiter
            rate_limiter = get_rate_limiter()
            if not rate_limiter.is_allowed(client_ip):
                raise HTTPException(
                    status_code=429, 
                    detail=f"Rate limit exceeded. Máximo {rate_limiter.max_requests} peticiones por minuto."
                )
        
        logger.info(f"📥 Nuevo mensaje - User: {user.get('email')}, Session: {req.session_id}, Tiene imagen: {req.image is not None}")
        
        # Validar que haya mensaje o imagen
        if not req.message and not req.image:
            raise HTTPException(status_code=400, detail="Message or image is required")
        
        # Generar session_id si no existe
        session_id = req.session_id or str(uuid.uuid4())
        # SIEMPRE usar el user_id del usuario autenticado (del token)
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        # Asegurar conversación con el user_id del usuario autenticado
        memory_manager.ensure_conversation(user_id, session_id)
        
        # Procesar imagen si existe
        if req.image:
            logger.info("🖼️ Procesando imagen médica")
            
            # Procesar imagen sin streaming
            start_ts = int(time.time() * 1000)
            # Guardar mensaje del usuario en historial antes del análisis
            try:
                memory_manager.add_message_to_conversation(session_id, "user", req.message or "[Imagen enviada]", {"has_image": True})
            except Exception as _e:
                logger.warning(f"⚠️ No se pudo persistir mensaje de usuario (imagen): {_e}")

            analysis_result = await analyze_image_with_fallback(
                req.image,
                req.image_format,
                req.message or "Analiza esta radiografía médica del IMSS"
            )
            
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

            return ChatResponse(
                response=analysis_result.get('analysis', ''),
                session_id=session_id,
                is_image_analysis=True,
                model_used=analysis_result.get('model', 'unknown'),
                provider=analysis_result.get('provider', 'unknown')
            )
        
        # Procesar mensaje de texto
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
            return ChatResponse(
                response=json.dumps(result_json, ensure_ascii=False),
                session_id=session_id
            )
        else:
            start_ts = int(time.time() * 1000)
            response = await medical_chain.process_chat(req.message, session_id)
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
            
            return ChatResponse(
                response=response,
                session_id=session_id
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en chat_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/image-analysis")
async def image_analysis_endpoint(req: ImageAnalysisRequest):
    """Endpoint específico para análisis de imágenes"""
    try:
        logger.info("🔍 Analizando imagen")
        
        analysis_result = await analyze_image_with_fallback(
            req.image_data,
            req.image_format,
            req.prompt
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


@app.get("/api/history")
async def get_history(
    session_id: Optional[str] = Query(None, description="Filtrar por session_id"),
    user: Dict[str, Any] = Depends(require_auth)
):
    """Obtener historial de conversaciones desde SQLite - Requiere autenticación"""
    try:
        if not session_id:
            return {"conversations": []}
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        # SIEMPRE validar pertenencia de la conversación al usuario autenticado
        if not memory_manager.conversation_belongs_to_user(session_id, user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Conversation does not belong to user")
        messages = memory_manager.get_conversation_history(session_id=session_id, limit=200)
        return {"session_id": session_id, "messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics")
async def get_metrics(
    session_id: Optional[str] = Query(None, description="Filtrar por session_id"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require_auth)
):
    """Obtener métricas desde SQLite - Requiere autenticación"""
    try:
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        # Si se proporciona session_id, validar que pertenece al usuario
        if session_id and not memory_manager.conversation_belongs_to_user(session_id, user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Conversation does not belong to user")
        data = memory_manager.query_metrics(session_id=session_id, limit=limit, offset=offset)
        return {"metrics": data, "count": len(data)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo métricas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = None


@app.post("/api/conversations")
async def create_conversation(
    req: ConversationCreateRequest,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Crear nueva conversación - Requiere autenticación"""
    try:
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        session_id = memory_manager.create_conversation(user_id=user_id, title=req.title or "Nueva conversación")
        return {"session_id": session_id, "title": req.title or "Nueva conversación"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations")
async def list_conversations(
    limit: int = Query(100),
    offset: int = Query(0),
    user: Dict[str, Any] = Depends(require_auth)
):
    """Listar conversaciones del usuario autenticado - Requiere autenticación"""
    try:
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        items = memory_manager.list_conversations(user_id=user_id, limit=limit, offset=offset)
        return {"conversations": items}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error listando conversaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/conversations")
async def delete_conversations(
    user: Dict[str, Any] = Depends(require_auth)
):
    """Eliminar todas las conversaciones del usuario autenticado - Requiere autenticación"""
    try:
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        deleted = memory_manager.delete_all_conversations(user_id=user_id)
        return {"deleted": deleted}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando conversaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ConversationRenameRequest(BaseModel):
    title: str


@app.patch("/api/conversations/{session_id}")
async def rename_conversation(
    session_id: str,
    req: ConversationRenameRequest,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Renombrar conversación - Requiere autenticación y validación de pertenencia"""
    try:
        user_id = user.get('id') or user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        # Validar que la conversación pertenece al usuario
        if not memory_manager.conversation_belongs_to_user(session_id, user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Conversation does not belong to user")
        ok = memory_manager.rename_conversation(session_id=session_id, user_id=user_id, new_title=req.title)
        if not ok:
            raise HTTPException(status_code=403, detail="Forbidden or not found")
        return {"session_id": session_id, "title": req.title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error renombrando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transcribe")
async def transcribe_endpoint(
    req: TranscribeRequest,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Transcribir audio usando Whisper - Requiere autenticación"""
    try:
        logger.info(f"🎤 Transcripción solicitada por usuario {user.get('email')}")
        
        result = transcribe_audio(
            audio_data=req.audio_data,
            audio_format=req.audio_format,
            language=req.language
        )
        
        if result.get("success"):
            return {
                "success": True,
                "text": result.get("text", ""),
                "language": result.get("language", "unknown")
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Error en la transcripción")
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en transcripción: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Configuración optimizada para alto rendimiento
    # Variables de entorno para controlar el modo
    workers = int(os.getenv("UVICORN_WORKERS", "4"))  # 4 workers por defecto
    is_dev = os.getenv("ENV", "production") == "development"
    
    if is_dev:
        # Modo desarrollo: 1 worker con reload
        uvicorn.run(
            "main:app",  # Usar string de importación para reload
            host="0.0.0.0", 
            port=5001,
            reload=True
        )
    else:
        # Modo producción: múltiples workers optimizados
        # IMPORTANTE: Para usar workers, se debe pasar el string de importación
        # Ejecutar con: ENV=production UVICORN_WORKERS=4 python main.py
        # O mejor aún: uvicorn main:app --host 0.0.0.0 --port 5001 --workers 4
        uvicorn.run(
            "main:app",  # String de importación necesario para workers
            host="0.0.0.0",
            port=5001,
            workers=workers,
            timeout_keep_alive=30,
            backlog=2048,
            log_level="info"
        )

