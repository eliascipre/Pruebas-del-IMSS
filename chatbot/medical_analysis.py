"""
Sistema de análisis médico para imágenes - vLLM con Ray Serve
"""

import base64
import logging
import os
import httpx
from typing import Dict, Any, Optional
import json
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Configuración - Prioridad: VLLM_ENDPOINT > OLLAMA_ENDPOINT > LM_STUDIO_ENDPOINT
VLLM_ENDPOINT = os.getenv("VLLM_ENDPOINT", os.getenv("OLLAMA_ENDPOINT", os.getenv("LM_STUDIO_ENDPOINT", "http://localhost:8000/v1/")))
# Asegurar que termine con /v1/ para compatibilidad con OpenAI API
if not VLLM_ENDPOINT.endswith("/v1/"):
    if VLLM_ENDPOINT.endswith("/"):
        VLLM_ENDPOINT = VLLM_ENDPOINT + "v1/"
    else:
        VLLM_ENDPOINT = VLLM_ENDPOINT + "/v1/"
MODEL_NAME = "google/medgemma-27b-it"

# Límites para imágenes
MAX_IMAGE_SIZE_MB = 2  # 2MB máximo en bytes originales
MAX_IMAGE_DIMENSION = 512  # Máximo 512px en cualquier dimensión
MAX_IMAGE_QUALITY = 85  # Calidad JPEG (0-100)
MAX_IMAGE_TOKENS = 4500  # ~3500 tokens máximo para imagen en base64 (aumentado para permitir imágenes más grandes)


def compress_image(image_data: str, max_dimension: int = MAX_IMAGE_DIMENSION, quality: int = MAX_IMAGE_QUALITY) -> str:
    """Comprimir imagen a tamaño máximo y calidad para reducir tokens"""
    try:
        # Decodificar base64
        image_bytes = base64.b64decode(image_data)
        original_size = len(image_bytes)
        
        # Abrir imagen
        image = Image.open(io.BytesIO(image_bytes))
        original_mode = image.mode
        
        # Convertir a RGB si es necesario (JPEG solo soporta RGB)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Redimensionar si es muy grande
        if max(image.size) > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            logger.info(f"📐 Imagen redimensionada a {image.size}")
        
        # Comprimir a JPEG
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        # Codificar a base64
        compressed_base64 = base64.b64encode(output.read()).decode('utf-8')
        compressed_size = len(compressed_base64)
        
        # Calcular reducción
        reduction = ((original_size - len(base64.b64decode(compressed_base64))) / original_size) * 100 if original_size > 0 else 0
        
        logger.info(f"📦 Imagen comprimida: {original_size / 1024:.1f}KB → {len(base64.b64decode(compressed_base64)) / 1024:.1f}KB ({reduction:.1f}% reducción)")
        logger.info(f"📊 Tamaño base64: {len(image_data)} → {compressed_size} caracteres")
        
        return compressed_base64
    except Exception as e:
        logger.error(f"❌ Error comprimiendo imagen: {e}")
        # Si falla la compresión, devolver la imagen original
        return image_data


def validate_image_size(image_data: str) -> tuple[bool, Optional[str]]:
    """Validar que la imagen no exceda el límite de tokens"""
    try:
        # Decodificar para obtener tamaño en bytes
        image_bytes = base64.b64decode(image_data)
        size_mb = len(image_bytes) / (1024 * 1024)
        
        # Validar tamaño en MB
        if size_mb > MAX_IMAGE_SIZE_MB:
            return False, f"Imagen muy grande ({size_mb:.2f}MB). Máximo permitido: {MAX_IMAGE_SIZE_MB}MB"
        
        # Estimar tokens (base64 es ~33% más grande que bytes originales)
        # Aproximación: 4 caracteres base64 = 1 token
        estimated_tokens = len(image_data) // 4
        
        if estimated_tokens > MAX_IMAGE_TOKENS:
            return False, f"Imagen excede límite de tokens estimados ({estimated_tokens}). Máximo: {MAX_IMAGE_TOKENS} tokens"
        
        logger.info(f"✅ Imagen validada: {size_mb:.2f}MB, ~{estimated_tokens} tokens estimados")
        return True, None
    except Exception as e:
        logger.error(f"❌ Error validando imagen: {e}")
        return False, f"Error validando imagen: {str(e)}"


class MedicalImageAnalysis:
    """Sistema de análisis de imágenes médicas con vLLM con Ray Serve"""
    
    def __init__(self):
        logger.info(f"✅ Configurado para usar vLLM con Ray Serve en: {VLLM_ENDPOINT}")
        logger.info(f"✅ Modelo: {MODEL_NAME}")
    
    async def analyze_with_ollama(self, image_data: str, prompt: str) -> Dict[str, Any]:
        """Analizar imagen usando vLLM con Ray Serve con formato multimodal"""
        try:
            logger.info(f"🤖 Analizando con vLLM: {MODEL_NAME}")
            
            # Validar tamaño de imagen
            is_valid, error_msg = validate_image_size(image_data)
            if not is_valid:
                logger.warning(f"⚠️ {error_msg}. Comprimiendo imagen...")
                # Comprimir imagen si es muy grande
                image_data = compress_image(image_data)
                # Validar nuevamente después de compresión
                is_valid, error_msg = validate_image_size(image_data)
                if not is_valid:
                    return {
                        "success": False,
                        "error": f"Imagen demasiado grande incluso después de compresión: {error_msg}",
                        "provider": "vllm"
                    }
            
            # Decodificar imagen para obtener metadata
            image_bytes = base64.b64decode(image_data)
            image_size = len(image_bytes)
            
            # Crear el prompt médico mejorado
            system_prompt = """Eres un radiólogo asistente especializado del IMSS.
Analiza la imagen médica proporcionada y proporciona:
1. Descripción de estructuras anatómicas visibles
2. Hallazgos normales y anormales
3. Posibles patologías o alteraciones
4. Recomendaciones profesionales
5. Siempre remitir a consulta médica para confirmación

Responde en español de manera detallada y profesional."""
            
            # Preparar mensaje multimodal según formato LangChain
            user_prompt_text = prompt if prompt else "Analiza esta radiografía médica en detalle"
            
            # Formato multimodal: content es un array
            multimodal_content = [
                {
                    "type": "text",
                    "text": user_prompt_text
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data}"
                    }
                }
            ]
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": multimodal_content}
            ]
            
            logger.info(f"📏 Enviando imagen (tamaño: {image_size} bytes) con formato multimodal")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{VLLM_ENDPOINT}chat/completions",
                    json={
                        "model": MODEL_NAME,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2048,  # Aumentado de 100 a 2048 para respuestas más completas
                        "stream": False
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    analysis = result["choices"][0]["message"]["content"]
                    
                    # Logging detallado de la respuesta
                    logger.info(f"✅ vLLM response recibida (análisis multimodal)")
                    logger.info(f"📝 Respuesta del modelo (primeros 200 caracteres): {analysis[:200]}...")
                    logger.info(f"📊 Tamaño de la respuesta: {len(analysis)} caracteres")
                    
                    # Verificar si la respuesta parece ser un análisis real o solo texto genérico
                    if len(analysis) < 50:
                        logger.warning(f"⚠️ Respuesta muy corta ({len(analysis)} caracteres). El modelo puede no estar procesando la imagen correctamente.")
                    
                    return {
                        "success": True,
                        "analysis": analysis,
                        "model": MODEL_NAME,
                        "provider": "vllm"
                    }
                else:
                    error_text = response.text[:2000]  # Limitar tamaño del error
                    logger.error(f"❌ Error en vLLM: {response.status_code}")
                    logger.error(f"📋 Detalles del error: {error_text}")
                    
                    # Intentar parsear error si es JSON
                    try:
                        error_json = json.loads(error_text)
                        error_detail = error_json.get('error', {}).get('message', error_text) if isinstance(error_json.get('error'), dict) else error_text
                    except:
                        error_detail = error_text
                    
                    return {
                        "success": False,
                        "error": f"Error del servidor ({response.status_code}): {error_detail[:500]}",
                        "provider": "vllm"
                    }
        except Exception as e:
            logger.error(f"❌ Error en análisis con vLLM: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "provider": "vllm"
            }
    
    async def analyze_with_fallback(self, image_data: str, image_format: str, prompt: str) -> Dict[str, Any]:
        """Análisis de imagen con vLLM con Ray Serve"""
        return await self.analyze_with_ollama(image_data, prompt)


# Instancia global
medical_analyzer = MedicalImageAnalysis()


async def analyze_image_with_fallback(image_data: str, image_format: str, prompt: str) -> Dict[str, Any]:
    """Función helper para análisis de imagen con vLLM con Ray Serve"""
    return await medical_analyzer.analyze_with_fallback(image_data, image_format, prompt)
