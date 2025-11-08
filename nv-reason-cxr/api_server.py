"""
FastAPI Backend para NV-Reason-CXR con traducción a español usando MedGemma
"""
from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64
import io
import os
import logging
import httpx
import sqlite3
import uuid
import time
from PIL import Image
import torch
from transformers import AutoProcessor, AutoModelForImageTextToText, TextIteratorStreamer
from threading import Thread

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="NV-Reason-CXR API",
    description="API para análisis de radiografías de tórax con traducción a español",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración
DEFAULT_MODEL_ID = "nvidia/NV-Reason-CXR-3B"
VLLM_ENDPOINT = os.getenv("VLLM_ENDPOINT", os.getenv("OLLAMA_ENDPOINT", "http://localhost:8000/v1/"))
if not VLLM_ENDPOINT.endswith("/v1/"):
    if VLLM_ENDPOINT.endswith("/"):
        VLLM_ENDPOINT = VLLM_ENDPOINT + "v1/"
    else:
        VLLM_ENDPOINT = VLLM_ENDPOINT + "/v1/"

SYSTEM_PROMPT = (
    "Eres un radiologo asistente especializado en radiografias de torax. "
    "Analiza la imagen recibida y responde unicamente en espanol utilizando terminologia medica."
)

# Variables globales para el modelo
model = None
processor = None
device = None

# Base de datos para conversaciones
DB_PATH = os.getenv("NV_REASON_DB_PATH", "nv_reason_cxr.db")

def init_database():
    """Inicializar base de datos SQLite"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Tabla para mensajes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                metadata TEXT
            )
        """)
        
        # Tabla para conversaciones
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)
        
        # Índices
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)")
        
        conn.commit()
        conn.close()
        logger.info(f"[nv-reason-cxr] Base de datos inicializada: {DB_PATH}")
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error inicializando base de datos: {e}")

# Inicializar base de datos
init_database()

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

def load_model_and_processor():
    """Cargar modelo NV-Reason-CXR-3B"""
    global model, processor, device
    
    model_path = os.environ.get("NV_REASON_MODEL_PATH") or os.environ.get("MODEL") or DEFAULT_MODEL_ID
    allow_downloads = get_env_flag("NV_REASON_ALLOW_DOWNLOADS", default=False)
    
    if model_path == DEFAULT_MODEL_ID:
        allow_downloads = True
    
    local_files_only = not allow_downloads
    force_cpu = get_env_flag("FORCE_CPU", default=True)
    force_cuda = get_env_flag("FORCE_CUDA", default=False)
    
    if force_cpu or not force_cuda:
        device = "cpu"
        logger.info("[nv-reason-cxr] Usando CPU/RAM por defecto")
    elif force_cuda and torch.cuda.is_available():
        device = "cuda"
        logger.info("[nv-reason-cxr] Usando GPU")
    else:
        device = "cpu"
        logger.info("[nv-reason-cxr] Usando CPU/RAM")
    
    if device == "cuda":
        torch_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    else:
        torch_dtype = torch.float32
    
    logger.info(f"[nv-reason-cxr] Cargando modelo desde: {model_path}")
    
    load_kwargs = {
        "dtype": torch_dtype,
        "local_files_only": local_files_only,
    }
    
    if device == "cuda":
        load_kwargs["device_map"] = {"": device}
    
    try:
        model = AutoModelForImageTextToText.from_pretrained(model_path, **load_kwargs)
        model = model.eval()
        if device != "cuda":
            model = model.to(device)
        
        processor = AutoProcessor.from_pretrained(
            model_path,
            use_fast=True,
            local_files_only=local_files_only,
        )
        
        logger.info("[nv-reason-cxr] Modelo cargado exitosamente")
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error cargando modelo: {e}")
        raise

# Cargar modelo al iniciar
try:
    load_model_and_processor()
except Exception as e:
    logger.error(f"[nv-reason-cxr] Error inicializando modelo: {e}")

async def translate_with_medgemma(text: str) -> str:
    """Traducir texto de inglés a español usando MedGemma"""
    try:
        translation_prompt = (
            "Eres un traductor médico especializado. Traduce el siguiente análisis de radiografía "
            "de tórax del inglés al español, manteniendo la terminología médica precisa y el formato. "
            "Responde únicamente con la traducción, sin comentarios adicionales.\n\n"
            f"Texto a traducir:\n{text}"
        )
        
        messages = [
            {
                "role": "system",
                "content": "Eres un traductor médico especializado en radiología."
            },
            {
                "role": "user",
                "content": translation_prompt
            }
        ]
        
        payload = {
            "model": "google/medgemma-27b",
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 4096,
            "stream": False,
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{VLLM_ENDPOINT}chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                translated_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if translated_text:
                    return translated_text
                else:
                    logger.warning("[nv-reason-cxr] MedGemma no devolvió traducción, usando texto original")
                    return text
            else:
                logger.error(f"[nv-reason-cxr] Error en traducción con MedGemma: {response.status_code}")
                return text
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error traduciendo con MedGemma: {e}")
        return text

def analyze_xray_with_nv_reason(image: Image.Image, text: str) -> str:
    """Analizar radiografía con NV-Reason-CXR-3B"""
    global model, processor, device
    
    if model is None or processor is None:
        raise HTTPException(status_code=500, detail="Modelo no cargado")
    
    try:
        conversation = [
            {
                "role": "user",
                "content": [{"type": "image"}, {"type": "text", "text": text.strip()}],
            }
        ]
        
        messages = [
            {
                "role": "system",
                "content": [{"type": "text", "text": SYSTEM_PROMPT}],
            },
            *conversation,
        ]
        
        prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
        inputs = processor(text=prompt, images=[image], return_tensors="pt")
        inputs = inputs.to(device)
        
        MAX_NEW_TOKENS = parse_int_env("NV_REASON_MAX_NEW_TOKENS", 2048)
        
        with torch.inference_mode():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=MAX_NEW_TOKENS,
                do_sample=False,
            )
        
        generated_text = processor.batch_decode(
            generated_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )[0]
        
        # Extraer solo la respuesta generada (sin el prompt)
        if prompt in generated_text:
            response = generated_text.split(prompt)[-1].strip()
        else:
            response = generated_text.strip()
        
        return response
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error en análisis: {e}")
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")

class AnalyzeRequest(BaseModel):
    message: str
    image: str  # base64 encoded
    image_format: Optional[str] = "jpeg"
    session_id: Optional[str] = None
    user_id: Optional[str] = None

@app.post("/api/analyze")
async def analyze_xray(request: AnalyzeRequest):
    """Analizar radiografía y traducir respuesta"""
    try:
        # Decodificar imagen
        try:
            image_data = base64.b64decode(request.image)
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error decodificando imagen: {str(e)}")
        
        # Analizar con NV-Reason-CXR (responde en inglés)
        logger.info("[nv-reason-cxr] Iniciando análisis con NV-Reason-CXR-3B...")
        english_response = analyze_xray_with_nv_reason(image, request.message)
        logger.info(f"[nv-reason-cxr] Análisis completado (longitud: {len(english_response)} caracteres)")
        
        # Traducir con MedGemma
        logger.info("[nv-reason-cxr] Iniciando traducción con MedGemma...")
        spanish_response = await translate_with_medgemma(english_response)
        logger.info(f"[nv-reason-cxr] Traducción completada (longitud: {len(spanish_response)} caracteres)")
        
        # Guardar mensajes en la base de datos si hay session_id
        if request.session_id:
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                now = int(time.time())
                
                # Guardar mensaje del usuario
                cursor.execute("""
                    INSERT INTO messages (session_id, role, content, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (request.session_id, "user", request.message, now, "{}"))
                
                # Guardar mensaje del asistente
                cursor.execute("""
                    INSERT INTO messages (session_id, role, content, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (request.session_id, "assistant", spanish_response, now, "{}"))
                
                # Actualizar updated_at de la conversación
                cursor.execute("""
                    UPDATE conversations
                    SET updated_at = ?
                    WHERE id = ?
                """, (now, request.session_id))
                
                conn.commit()
                conn.close()
            except Exception as e:
                logger.warning(f"[nv-reason-cxr] Error guardando mensajes: {e}")
        
        return {
            "response": spanish_response,
            "analysis": spanish_response,
            "success": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error en endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando solicitud: {str(e)}")

@app.get("/api/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "model_loaded": model is not None and processor is not None
    }

# Endpoints de conversaciones
class ConversationCreateRequest(BaseModel):
    user_id: str
    title: Optional[str] = "Nueva conversación"

class ConversationRenameRequest(BaseModel):
    user_id: str
    title: str

class ConversationDeleteRequest(BaseModel):
    user_id: str

@app.post("/api/conversations")
async def create_conversation(req: ConversationCreateRequest):
    """Crear nueva conversación"""
    try:
        session_id = str(uuid.uuid4())
        now = int(time.time())
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO conversations (id, user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (session_id, req.user_id, req.title or "Nueva conversación", now, now))
        conn.commit()
        conn.close()
        
        return {"session_id": session_id, "title": req.title or "Nueva conversación"}
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error creando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations")
async def list_conversations(user_id: str = Query(...), limit: int = 100, offset: int = 0):
    """Listar conversaciones de un usuario"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, updated_at
            FROM conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        """, (user_id, limit, offset))
        
        items = []
        for row in cursor.fetchall():
            items.append({
                "id": row[0],
                "title": row[1],
                "updated_at": row[2]
            })
        conn.close()
        
        return {"conversations": items}
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error listando conversaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversations")
async def delete_conversations(user_id: str = Query(...)):
    """Eliminar todas las conversaciones de un usuario"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM conversations WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM messages WHERE session_id IN (SELECT id FROM conversations WHERE user_id = ?)", (user_id,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        
        return {"deleted": deleted}
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error eliminando conversaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/conversations/{session_id}")
async def rename_conversation(session_id: str, req: ConversationRenameRequest):
    """Renombrar conversación"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verificar que la conversación pertenece al usuario
        cursor.execute("SELECT user_id FROM conversations WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        if not row or row[0] != req.user_id:
            conn.close()
            raise HTTPException(status_code=403, detail="Forbidden or not found")
        
        now = int(time.time())
        cursor.execute("""
            UPDATE conversations
            SET title = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (req.title, now, session_id, req.user_id))
        conn.commit()
        conn.close()
        
        return {"session_id": session_id, "title": req.title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error renombrando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversations/{session_id}")
async def delete_conversation(session_id: str, req: ConversationDeleteRequest):
    """Eliminar una conversación individual"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verificar que la conversación pertenece al usuario
        cursor.execute("SELECT user_id FROM conversations WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        if not row or row[0] != req.user_id:
            conn.close()
            raise HTTPException(status_code=403, detail="Forbidden or not found")
        
        cursor.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (session_id, req.user_id))
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
        
        return {"session_id": session_id, "deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error eliminando conversación: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(session_id: Optional[str] = Query(None), user_id: Optional[str] = Query(None)):
    """Obtener historial de conversación"""
    try:
        if not session_id:
            return {"conversations": []}
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verificar pertenencia si se proporciona user_id
        if user_id:
            cursor.execute("SELECT user_id FROM conversations WHERE id = ?", (session_id,))
            row = cursor.fetchone()
            if not row or row[0] != user_id:
                conn.close()
                raise HTTPException(status_code=403, detail="Forbidden")
        
        cursor.execute("""
            SELECT role, content, timestamp, metadata
            FROM messages
            WHERE session_id = ?
            ORDER BY timestamp ASC
            LIMIT 200
        """, (session_id,))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "role": row[0],
                "content": row[1],
                "timestamp": row[2],
                "metadata": row[3] if row[3] else {}
            })
        conn.close()
        
        return {"session_id": session_id, "messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[nv-reason-cxr] Error obteniendo historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = parse_int_env("PORT", 7860)
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)

