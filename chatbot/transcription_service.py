"""
Servicio de transcripción de audio usando Whisper large-v3-turbo de Hugging Face
Ejecuta en CPU por defecto
"""

import logging
import os
import base64
import tempfile
from typing import Optional, Dict, Any
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

logger = logging.getLogger(__name__)

# Modelo Whisper (cargado bajo demanda)
_whisper_pipeline = None
_model_id = "openai/whisper-large-v3-turbo"
# Directorio donde se guardará el modelo (en la carpeta chatbot)
_model_cache_dir = os.path.join(os.path.dirname(__file__), "models", "whisper-large-v3-turbo")

def get_whisper_pipeline():
    """Obtener o cargar el pipeline de Whisper usando Hugging Face Transformers"""
    global _whisper_pipeline
    if _whisper_pipeline is None:
        try:
            logger.info(f"📥 Cargando modelo Whisper '{_model_id}' (CPU)...")
            
            # Forzar CPU
            device = "cpu"
            torch_dtype = torch.float32  # CPU no soporta float16
            
            # Crear directorio de cache si no existe
            os.makedirs(_model_cache_dir, exist_ok=True)
            
            # Cargar modelo y procesador
            logger.info(f"📥 Descargando modelo a: {_model_cache_dir}")
            model = AutoModelForSpeechSeq2Seq.from_pretrained(
                _model_id,
                dtype=torch_dtype,  # Usar dtype en lugar de torch_dtype (deprecado)
                low_cpu_mem_usage=True,
                use_safetensors=True,
                cache_dir=_model_cache_dir
            )
            model.to(device)
            
            processor = AutoProcessor.from_pretrained(
                _model_id,
                cache_dir=_model_cache_dir
            )
            
            # Crear pipeline
            _whisper_pipeline = pipeline(
                "automatic-speech-recognition",
                model=model,
                tokenizer=processor.tokenizer,
                feature_extractor=processor.feature_extractor,
                dtype=torch_dtype,  # Usar dtype en lugar de torch_dtype (deprecado)
                device=device,
            )
            
            logger.info(f"✅ Modelo Whisper cargado en {device}")
        except Exception as e:
            logger.error(f"❌ Error cargando modelo Whisper: {e}")
            raise
    return _whisper_pipeline

def transcribe_audio(
    audio_data: str,
    audio_format: str = "webm",
    language: Optional[str] = "es"  # Por defecto español
) -> Dict[str, Any]:
    """
    Transcribir audio usando Whisper large-v3-turbo de Hugging Face
    
    Args:
        audio_data: Audio en base64
        audio_format: Formato del audio (webm, wav, mp3, etc.)
        language: Idioma del audio (opcional, Whisper lo detecta automáticamente)
    
    Returns:
        Dict con success, text, y error (si hay)
    """
    try:
        # Decodificar audio de base64
        audio_bytes = base64.b64decode(audio_data)
        
        # Guardar temporalmente en un archivo
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio_format}") as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        try:
            # Cargar pipeline de Whisper
            pipe = get_whisper_pipeline()
            
            # Transcribir
            logger.info(f"🎤 Transcribiendo audio ({audio_format})...")
            
            # Preparar argumentos de generación
            # max_new_tokens debe ser menor que 448 porque el modelo tiene un límite de 448 tokens totales
            # (incluyendo los tokens iniciales). Con 4 tokens iniciales, máximo es 444.
            generate_kwargs = {
                "max_new_tokens": 444,  # Reducido de 448 a 444 para evitar exceder el límite
                "num_beams": 1,
                "condition_on_prev_tokens": False,
                "compression_ratio_threshold": 1.35,
                "temperature": (0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
                "logprob_threshold": -1.0,
                "no_speech_threshold": 0.6,
                "language": language if language else "es",  # Por defecto español, o usar el especificado
                "task": "transcribe",  # Transcribir (no traducir)
            }
            
            # Transcribir usando el pipeline
            # El pipeline de transformers puede manejar directamente archivos de audio
            result = pipe(
                temp_file_path,
                generate_kwargs=generate_kwargs
            )
            
            # El resultado del pipeline es un dict con "text"
            if isinstance(result, dict):
                text = result.get("text", "").strip()
            elif isinstance(result, str):
                text = result.strip()
            else:
                # Si es otro tipo, intentar convertirlo a string
                text = str(result).strip()
            
            logger.info(f"✅ Transcripción completada: {len(text)} caracteres")
            
            return {
                "success": True,
                "text": text,
                "language": language or "es"  # Por defecto español
            }
        finally:
            # Limpiar archivo temporal
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"⚠️ No se pudo eliminar archivo temporal: {e}")
    
    except Exception as e:
        logger.error(f"❌ Error en transcripción: {e}")
        return {
            "success": False,
            "text": "",
            "error": str(e)
        }

