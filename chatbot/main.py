"""
FastAPI Backend para Chatbot IMSS
Totalmente asíncrono y escalable
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
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

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="Chatbot IMSS API",
    description="API asíncrona para análisis médico con LM Studio y LangChain",
    version="1.0.0"
)

# Configurar CORS para permitir conexiones remotas
# Permitir conexiones desde cualquier origen para desarrollo remoto
# En producción, configurar con lista específica de orígenes permitidos
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
if CORS_ORIGINS == "*":
    # Cuando allow_origins=["*"], allow_credentials debe ser False
    # Esto permite todos los orígenes sin credenciales (adecuado para desarrollo)
    allow_origins = ["*"]
    allow_credentials = False
    allow_methods = ["*"]
    allow_headers = ["*"]
else:
    # Con orígenes específicos, podemos usar allow_credentials=True
    # pero debemos especificar métodos y headers explícitamente (no usar "*")
    allow_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]
    allow_credentials = True
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    allow_headers = ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)

# Inicializar componentes
memory_manager = get_memory_manager()
medical_chain = get_medical_chain()

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


class ImageAnalysisRequest(BaseModel):
    image_data: str
    image_format: str = "jpeg"
    prompt: str = "Analiza esta imagen médica del IMSS"
    session_id: Optional[str] = None
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    is_image_analysis: Optional[bool] = False
    model_used: Optional[str] = None
    provider: Optional[str] = None


# Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"status": "ok", "service": "Chatbot IMSS API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "medical_analyzer": "enabled"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """Endpoint principal para chat con soporte de imágenes y streaming"""
    try:
        logger.info(f"📥 Nuevo mensaje - Session: {req.session_id}, Tiene imagen: {req.image is not None}")
        
        # Validar que haya mensaje o imagen
        if not req.message and not req.image:
            raise HTTPException(status_code=400, detail="Message or image is required")
        
        # Generar session_id si no existe
        session_id = req.session_id or str(uuid.uuid4())
        # Asegurar conversación si viene user_id
        if req.user_id:
            memory_manager.ensure_conversation(req.user_id, session_id)
        
        # Procesar imagen si existe
        if req.image:
            logger.info("🖼️ Procesando imagen médica")
            
            if req.stream:
                # Streaming con imagen
                return StreamingResponse(
                    process_image_stream(req.message, req.image, session_id),
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
        if req.stream:
            # Streaming con texto
            # Guardar mensaje del usuario antes de iniciar streaming
            try:
                memory_manager.add_message_to_conversation(session_id, "user", req.message or "", {"stream": True, "user_id": req.user_id})
            except Exception as _e:
                logger.warning(f"⚠️ No se pudo persistir mensaje de usuario (stream): {_e}")

            return StreamingResponse(
                process_text_stream(req.message, session_id),
                media_type="text/event-stream",
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
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
                        model=usage.get('model') if 'usage' in locals() and usage.get('model') else 'medgemma-4b-it',
                        provider='lm-studio',
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
                        model=usage.get('model') if 'usage' in locals() and usage.get('model') else 'medgemma-4b-it',
                        provider='lm-studio',
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


async def process_text_stream(message: str, session_id: str):
    """Procesar texto con streaming"""
    try:
        full_response = ""
        start_ts = int(time.time() * 1000)
        async for chunk in medical_chain.stream_chat(message, session_id):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        
        # Persistir respuesta completa al finalizar el stream
        try:
            memory_manager.add_message_to_conversation(session_id, "assistant", full_response, {"stream": True})
        except Exception as _e:
            logger.warning(f"⚠️ No se pudo persistir respuesta del asistente (stream): {_e}")
        # Métricas
        try:
            end_ts = int(time.time() * 1000)
            memory_manager.log_chat_metrics(
                session_id=session_id,
                input_chars=len(message or ''),
                output_chars=len(full_response or ''),
                started_at=start_ts,
                ended_at=end_ts,
                duration_ms=end_ts - start_ts,
                model='medgemma-4b-it',
                provider='lm-studio',
                stream=True,
                is_image=False,
                success=True,
            )
        except Exception as _e:
            logger.warning(f"⚠️ No se pudieron registrar métricas (stream): {_e}")

        yield f"data: {json.dumps({'content': '', 'done': True, 'session_id': session_id})}\n\n"
    except Exception as e:
        logger.error(f"❌ Error en streaming de texto: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def process_image_stream(message: str, image_data: str, session_id: str):
    """Procesar imagen con streaming"""
    try:
        async for chunk in medical_chain.stream_medical_analysis(message, image_data, session_id):
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        
        yield f"data: {json.dumps({'content': '', 'done': True, 'session_id': session_id})}\n\n"
    except Exception as e:
        logger.error(f"❌ Error en streaming de imagen: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)

