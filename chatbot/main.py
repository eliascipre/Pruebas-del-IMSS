"""
FastAPI Backend para Chatbot IMSS
Totalmente asíncrono y escalable
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import uuid
import json
import logging
import asyncio

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar componentes
memory_manager = get_memory_manager()
medical_chain = get_medical_chain()


# Modelos Pydantic
class ChatRequest(BaseModel):
    message: Optional[str] = ""
    image: Optional[str] = None
    image_format: str = "jpeg"
    session_id: Optional[str] = None
    stream: bool = False


class ImageAnalysisRequest(BaseModel):
    image_data: str
    image_format: str = "jpeg"
    prompt: str = "Analiza esta imagen médica del IMSS"
    session_id: Optional[str] = None


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
            response = await medical_chain.process_chat(req.message, session_id)
            
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
        async for chunk in medical_chain.stream_chat(message, session_id):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        
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
async def get_history():
    """Obtener historial de conversaciones"""
    return {"conversations": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)

