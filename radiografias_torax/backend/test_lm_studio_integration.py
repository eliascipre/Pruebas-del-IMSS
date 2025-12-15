#!/usr/bin/env python3
"""
Script de prueba para verificar la integración con LM Studio y MedGemma
"""

import json
import logging
import requests
from local_llm_client import LocalMedGemmaLLMClient

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_lm_studio_connection():
    """Prueba la conexión básica con LM Studio"""
    try:
        response = requests.get("http://localhost:1234/v1/models", timeout=10)
        if response.status_code == 200:
            logger.info("✅ LM Studio está corriendo correctamente")
            models = response.json()
            logger.info(f"Modelos disponibles: {[model.get('id', 'unknown') for model in models.get('data', [])]}")
            return True
        else:
            logger.error(f"❌ LM Studio respondió con código {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        logger.error("❌ No se puede conectar a LM Studio. ¿Está corriendo en localhost:1234?")
        return False
    except Exception as e:
        logger.error(f"❌ Error inesperado: {e}")
        return False

def test_medgemma_vision():
    """Prueba MedGemma con una imagen simple"""
    try:
        client = LocalMedGemmaLLMClient()
        
        # Datos de prueba
        test_case_data = {
            'download_image_url': 'https://via.placeholder.com/300x300.png?text=Test+X-Ray',
            'ground_truth_labels': {
                'condition': 'test_condition',
                'findings': ['test_finding']
            }
        }
        
        # Generar preguntas (esto debería fallar graciosamente si hay problemas)
        questions = client.generate_all_questions(
            case_data=test_case_data,
            guideline_context="Test guideline context"
        )
        
        if questions:
            logger.info(f"✅ MedGemma generó {len(questions)} preguntas correctamente")
            return True
        else:
            logger.warning("⚠️ MedGemma no generó preguntas, pero no hubo error fatal")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error al probar MedGemma: {e}")
        return False

def main():
    """Función principal de prueba"""
    logger.info("🔍 Iniciando pruebas de integración con LM Studio...")
    
    # Prueba 1: Conexión básica
    logger.info("\n1. Probando conexión con LM Studio...")
    connection_ok = test_lm_studio_connection()
    
    if not connection_ok:
        logger.error("❌ No se puede continuar sin conexión a LM Studio")
        return
    
    # Prueba 2: MedGemma con visión
    logger.info("\n2. Probando MedGemma con soporte de visión...")
    vision_ok = test_medgemma_vision()
    
    # Resumen
    logger.info("\n📊 Resumen de pruebas:")
    logger.info(f"   Conexión LM Studio: {'✅ OK' if connection_ok else '❌ FALLO'}")
    logger.info(f"   MedGemma Visión: {'✅ OK' if vision_ok else '❌ FALLO'}")
    
    if connection_ok and vision_ok:
        logger.info("\n🎉 ¡Todas las pruebas pasaron! La integración está funcionando correctamente.")
    else:
        logger.warning("\n⚠️ Algunas pruebas fallaron. Revisa la configuración de LM Studio.")

if __name__ == "__main__":
    main()
