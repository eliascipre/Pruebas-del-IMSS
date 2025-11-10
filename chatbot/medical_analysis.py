"""
Sistema de análisis médico para imágenes - Ollama para imágenes, vLLM para texto
Usa Ollama (medgemma-4b) para análisis de imágenes manteniendo toda la arquitectura Langchain
"""

import base64
import logging
import os
import httpx
import asyncio
from typing import Dict, Any, Optional
import json
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Configuración para Ollama (imágenes)
OLLAMA_ENDPOINT = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_IMAGE_MODEL", "amsaravi/medgemma-4b-it:q8")

# Configuración para vLLM (texto) - mantener para compatibilidad
VLLM_ENDPOINT = os.getenv("VLLM_ENDPOINT", os.getenv("LM_STUDIO_ENDPOINT", "http://localhost:8000/v1/"))
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
MAX_IMAGE_TOKENS = 15000  # Tokens máximo para imagen en base64 (aumentado para permitir imágenes médicas más grandes)


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
    """Sistema de análisis de imágenes médicas con Ollama (medgemma-4b) manteniendo arquitectura Langchain"""
    
    def __init__(self, system_prompt: Optional[str] = None):
        self.system_prompt = system_prompt
        logger.info(f"✅ Configurado para usar Ollama en: {OLLAMA_ENDPOINT}")
        logger.info(f"✅ Modelo de imágenes: {OLLAMA_MODEL}")
    
    def _load_medical_prompt(self) -> str:
        """Cargar prompt médico desde archivo (igual que langchain_system.py)"""
        try:
            prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'medico.md')
            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Extraer el system prompt principal
                if '## System Prompt Principal' in content:
                    start = content.find('## System Prompt Principal') + len('## System Prompt Principal')
                    end = content.find('##', start)
                    if end > start:
                        return content[start:end].strip()
                return content
        except Exception as e:
            logger.warning(f"⚠️ Error cargando prompt médico: {e}")
        
        # Fallback
        return """Eres un asistente médico especializado del IMSS que proporciona información médica general, 
interpretación de síntomas y guías de salud preventiva. 

IMPORTANTE: Siempre recomiendas consultar con profesionales de la salud del IMSS para diagnósticos específicos 
y tratamientos médicos. Responde en español."""
    
    async def analyze_with_ollama(self, image_data: str, prompt: str, session_id: Optional[str] = None, 
                                  conversation_history: Optional[list] = None, 
                                  entity_context: Optional[str] = None,
                                  abort_controller: Optional[Any] = None) -> Dict[str, Any]:
        """
        Analizar imagen usando Ollama (medgemma-4b) manteniendo toda la arquitectura Langchain
        
        Args:
            image_data: Imagen en base64
            prompt: Prompt del usuario
            session_id: ID de sesión para contexto
            conversation_history: Historial de conversación (opcional)
            entity_context: Contexto de entidades extraídas (opcional)
        """
        try:
            logger.info(f"🤖 Analizando con Ollama: {OLLAMA_MODEL}")
            
            # Validar tamaño de imagen
            is_valid, error_msg = validate_image_size(image_data)
            if not is_valid:
                logger.warning(f"⚠️ {error_msg}. Comprimiendo imagen...")
                # Comprimir imagen si es muy grande (primera compresión con calidad 85)
                image_data = compress_image(image_data, quality=85)
                # Validar nuevamente después de compresión
                is_valid, error_msg = validate_image_size(image_data)
                if not is_valid:
                    # Si aún es muy grande, comprimir más agresivamente (calidad 70)
                    logger.warning(f"⚠️ Imagen aún muy grande después de primera compresión. Comprimiendo más agresivamente...")
                    image_data = compress_image(image_data, quality=70, max_dimension=512)
                    # Validar nuevamente después de segunda compresión
                    is_valid, error_msg = validate_image_size(image_data)
                    if not is_valid:
                        # Si aún es muy grande, comprimir aún más agresivamente (calidad 60, dimensión 400)
                        logger.warning(f"⚠️ Imagen aún muy grande después de segunda compresión. Comprimiendo muy agresivamente...")
                        image_data = compress_image(image_data, quality=60, max_dimension=400)
                        # Validar nuevamente después de tercera compresión
                        is_valid, error_msg = validate_image_size(image_data)
                        if not is_valid:
                            return {
                                "success": False,
                                "error": f"Imagen demasiado grande incluso después de compresión agresiva: {error_msg}",
                                "provider": "ollama"
                            }
            
            # Decodificar imagen para obtener metadata
            image_bytes = base64.b64decode(image_data)
            image_size = len(image_bytes)
            
            # Cargar system prompt (igual que langchain_system.py)
            system_prompt = self.system_prompt or self._load_medical_prompt()
            
            # Construir prompt completo con contexto de entidades si existe
            full_system_prompt = system_prompt
            if entity_context:
                full_system_prompt = f"{system_prompt}\n\n{entity_context}"
            
            # Agregar contexto de historial si existe
            if conversation_history and len(conversation_history) > 0:
                # Tomar últimos 3 mensajes del historial
                recent_history = conversation_history[-3:] if len(conversation_history) > 3 else conversation_history
                history_text = "\n\n## Contexto de la conversación:\n"
                for msg in recent_history:
                    if hasattr(msg, 'content'):
                        role = "Usuario" if hasattr(msg, '__class__') and 'Human' in str(type(msg)) else "Asistente"
                        history_text += f"{role}: {msg.content}\n"
                full_system_prompt = f"{full_system_prompt}\n{history_text}"
            
            # Construir prompt final para análisis de imagen
            analysis_prompt = f"""{full_system_prompt}

IMPORTANTE: El usuario ha compartido una radiografía/imagen médica.
Analiza la imagen proporcionada y proporciona:
1. Descripción de estructuras anatómicas visibles
2. Hallazgos normales vs anormales
3. Posibles patologías o alteraciones
4. Recomendaciones profesionales
5. Siempre remitir a consulta médica del IMSS para confirmación

Prompt del usuario: {prompt if prompt else 'Analiza esta radiografía médica en detalle'}"""
            
            logger.info(f"📏 Enviando imagen a Ollama (tamaño: {image_size} bytes)")
            logger.info(f"📝 Prompt del usuario: {prompt[:100] if prompt else 'Sin prompt'}...")
            
            # Preparar payload para Ollama (formato del script de ejemplo)
            # Formato: {"model": "...", "prompt": "...", "images": [base64_image], "stream": False}
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": analysis_prompt,
                "images": [image_data],  # Array de strings base64
                "stream": False
            }
            
            # Enviar petición a Ollama con soporte para cancelación
            timeout = httpx.Timeout(600.0, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout) as client:  # 10 minutos de timeout para análisis de imágenes
                logger.info(f"🚀 Enviando imagen a {OLLAMA_ENDPOINT}/api/generate")
                
                # Verificar si fue cancelado antes de enviar
                if abort_controller and abort_controller.signal.aborted:
                    logger.info("🛑 Request cancelado antes de enviar a Ollama")
                    return {
                        "success": False,
                        "error": "Request cancelado por el usuario",
                        "provider": "ollama",
                        "cancelled": True
                    }
                
                try:
                    response = await client.post(
                        f"{OLLAMA_ENDPOINT}/api/generate",
                        json=payload
                    )
                except asyncio.CancelledError:
                    logger.info("🛑 Request cancelado durante envío a Ollama")
                    return {
                        "success": False,
                        "error": "Request cancelado por el usuario",
                        "provider": "ollama",
                        "cancelled": True
                    }
                
                if response.status_code == 200:
                    result = response.json()
                    analysis = result.get('response', '')
                    
                    if not analysis:
                        logger.error(f"❌ No se recibió respuesta del modelo")
                        logger.warning(f"Respuesta completa: {result}")
                        return {
                            "success": False,
                            "error": "No se recibió respuesta del modelo",
                            "provider": "ollama"
                        }
                    
                    # Logging detallado de la respuesta
                    logger.info(f"✅ Ollama response recibida (análisis de imagen)")
                    logger.info(f"📝 Respuesta del modelo (primeros 200 caracteres): {analysis[:200]}...")
                    logger.info(f"📊 Tamaño de la respuesta: {len(analysis)} caracteres")
                    
                    # Verificar si la respuesta parece ser un análisis real o solo texto genérico
                    if len(analysis) < 50:
                        logger.warning(f"⚠️ Respuesta muy corta ({len(analysis)} caracteres). El modelo puede no estar procesando la imagen correctamente.")
                    
                    return {
                        "success": True,
                        "analysis": analysis,
                        "model": OLLAMA_MODEL,
                        "provider": "ollama"
                    }
                else:
                    error_text = response.text[:2000]  # Limitar tamaño del error
                    logger.error(f"❌ Error en Ollama: {response.status_code}")
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
                        "provider": "ollama"
                    }
        except httpx.TimeoutException:
            logger.error(f"❌ Timeout esperando respuesta de Ollama (más de 10 minutos)")
            return {
                "success": False,
                "error": "Timeout esperando respuesta del servidor. El análisis de imágenes puede tardar varios minutos.",
                "provider": "ollama"
            }
        except Exception as e:
            logger.error(f"❌ Error en análisis con Ollama: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "provider": "ollama"
            }
    
    async def analyze_with_fallback(self, image_data: str, image_format: str, prompt: str, 
                                     session_id: Optional[str] = None,
                                     conversation_history: Optional[list] = None,
                                     entity_context: Optional[str] = None,
                                     abort_controller: Optional[Any] = None) -> Dict[str, Any]:
        """Análisis de imagen con Ollama (medgemma-4b) manteniendo arquitectura Langchain"""
        return await self.analyze_with_ollama(image_data, prompt, session_id, conversation_history, entity_context, abort_controller)


# Instancia global (se inicializará con system_prompt cuando se necesite)
_medical_analyzer: Optional[MedicalImageAnalysis] = None


def get_medical_analyzer(system_prompt: Optional[str] = None) -> MedicalImageAnalysis:
    """Obtener instancia del analizador médico (singleton)"""
    global _medical_analyzer
    if _medical_analyzer is None:
        _medical_analyzer = MedicalImageAnalysis(system_prompt=system_prompt)
    elif system_prompt and not _medical_analyzer.system_prompt:
        _medical_analyzer.system_prompt = system_prompt
    return _medical_analyzer


async def analyze_image_with_fallback(image_data: str, image_format: str, prompt: str, 
                                       session_id: Optional[str] = None,
                                       conversation_history: Optional[list] = None,
                                       entity_context: Optional[str] = None,
                                       system_prompt: Optional[str] = None,
                                       abort_controller: Optional[Any] = None) -> Dict[str, Any]:
    """
    Función helper para análisis de imagen con Ollama manteniendo arquitectura Langchain
    
    Args:
        image_data: Imagen en base64
        image_format: Formato de la imagen (jpeg, png, etc.)
        prompt: Prompt del usuario
        session_id: ID de sesión para contexto
        conversation_history: Historial de conversación (opcional)
        entity_context: Contexto de entidades extraídas (opcional)
        system_prompt: System prompt personalizado (opcional)
    """
    analyzer = get_medical_analyzer(system_prompt=system_prompt)
    return await analyzer.analyze_with_fallback(image_data, image_format, prompt, session_id, conversation_history, entity_context, abort_controller)
