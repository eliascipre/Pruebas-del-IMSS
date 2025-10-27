"""
Sistema de análisis médico para imágenes - SOLO LM Studio
"""

import base64
import logging
import os
import httpx
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

# Configuración
LM_STUDIO_ENDPOINT = os.getenv("LM_STUDIO_ENDPOINT", "http://localhost:1234/v1/")
MODEL_NAME = "medgemma-4b-it-mlx"


class MedicalImageAnalysis:
    """Sistema de análisis de imágenes médicas con LM Studio"""
    
    def __init__(self):
        logger.info(f"✅ Configurado para usar LM Studio en: {LM_STUDIO_ENDPOINT}")
    
    async def analyze_with_lm_studio(self, image_data: str, prompt: str) -> Dict[str, Any]:
        """Analizar imagen usando LM Studio local con formato multimodal"""
        try:
            logger.info(f"🤖 Analizando con LM Studio: {MODEL_NAME}")
            
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
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{LM_STUDIO_ENDPOINT}chat/completions",
                    json={
                        "model": MODEL_NAME,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": -1,
                        "stream": False
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    analysis = result["choices"][0]["message"]["content"]
                    
                    logger.info(f"✅ LM Studio response recibida (análisis multimodal)")
                    return {
                        "success": True,
                        "analysis": analysis,
                        "model": MODEL_NAME,
                        "provider": "lm_studio"
                    }
                else:
                    error_text = response.text
                    logger.error(f"❌ Error en LM Studio: {response.status_code} - {error_text}")
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {error_text}",
                        "provider": "lm_studio"
                    }
        except Exception as e:
            logger.error(f"❌ Error en análisis con LM Studio: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "provider": "lm_studio"
            }
    
    async def analyze_with_fallback(self, image_data: str, image_format: str, prompt: str) -> Dict[str, Any]:
        """Análisis de imagen con LM Studio"""
        return await self.analyze_with_lm_studio(image_data, prompt)


# Instancia global
medical_analyzer = MedicalImageAnalysis()


async def analyze_image_with_fallback(image_data: str, image_format: str, prompt: str) -> Dict[str, Any]:
    """Función helper para análisis de imagen con LM Studio"""
    return await medical_analyzer.analyze_with_fallback(image_data, image_format, prompt)
