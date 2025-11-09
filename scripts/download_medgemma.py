#!/usr/bin/env python3
"""
Script para pre-descargar el modelo MedGemma-27B-IT
Esto evita que cada réplica de vLLM intente descargar el modelo desde Hugging Face
"""

import os
import sys
from pathlib import Path
from huggingface_hub import snapshot_download
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuración
MODEL_NAME = "google/medgemma-27b-it"
MODELS_BASE_DIR = os.environ.get("VLLM_MODELS_DIR", os.path.expanduser("~/models"))
MODEL_DIR = os.path.join(MODELS_BASE_DIR, "medgemma-27b-it")

def download_model():
    """Descargar el modelo MedGemma-27B-IT a un directorio local"""
    try:
        logger.info(f"📥 Descargando modelo {MODEL_NAME}...")
        logger.info(f"📁 Directorio de destino: {MODEL_DIR}")
        
        # Crear directorio si no existe
        os.makedirs(MODELS_BASE_DIR, exist_ok=True)
        
        # Verificar si el modelo ya existe
        if os.path.exists(MODEL_DIR):
            required_files = ["config.json", "tokenizer_config.json"]
            has_model = all(os.path.exists(os.path.join(MODEL_DIR, f)) for f in required_files)
            if has_model:
                logger.info(f"✅ Modelo ya existe en {MODEL_DIR}")
                logger.info("💡 Si quieres re-descargar, elimina el directorio primero")
                return True
        
        # Descargar modelo usando snapshot_download
        logger.info("📥 Iniciando descarga (esto puede tardar varios minutos)...")
        snapshot_download(
            repo_id=MODEL_NAME,
            local_dir=MODEL_DIR,
            local_dir_use_symlinks=False,  # Copiar archivos en lugar de usar symlinks
            resume_download=True,  # Reanudar descarga si se interrumpe
        )
        
        logger.info(f"✅ Modelo descargado exitosamente en: {MODEL_DIR}")
        logger.info("💡 Ahora puedes usar el modelo local configurando VLLM_MODELS_DIR")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error descargando modelo: {e}")
        logger.error("💡 Asegúrate de tener conexión a internet y permisos de escritura")
        return False

def verify_model():
    """Verificar que el modelo descargado esté completo"""
    try:
        required_files = [
            "config.json",
            "tokenizer_config.json",
            "tokenizer.json",
        ]
        
        missing_files = []
        for file in required_files:
            file_path = os.path.join(MODEL_DIR, file)
            if not os.path.exists(file_path):
                missing_files.append(file)
        
        if missing_files:
            logger.warning(f"⚠️ Archivos faltantes: {', '.join(missing_files)}")
            return False
        
        # Verificar archivos del modelo (pueden ser .safetensors o .bin)
        model_files = [
            f for f in os.listdir(MODEL_DIR)
            if f.endswith(('.safetensors', '.bin')) or f.startswith('model')
        ]
        
        if not model_files:
            logger.warning("⚠️ No se encontraron archivos del modelo (.safetensors o .bin)")
            return False
        
        logger.info(f"✅ Modelo verificado: {len(model_files)} archivos del modelo encontrados")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error verificando modelo: {e}")
        return False

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Script de Descarga de Modelo MedGemma-27B-IT")
    logger.info("=" * 60)
    logger.info(f"Modelo: {MODEL_NAME}")
    logger.info(f"Directorio: {MODEL_DIR}")
    logger.info("=" * 60)
    
    # Descargar modelo
    success = download_model()
    
    if success:
        # Verificar modelo
        if verify_model():
            logger.info("=" * 60)
            logger.info("✅ Descarga completada exitosamente")
            logger.info("=" * 60)
            logger.info("💡 Para usar el modelo local, configura:")
            logger.info(f"   export VLLM_MODELS_DIR={MODELS_BASE_DIR}")
            logger.info("=" * 60)
            sys.exit(0)
        else:
            logger.warning("⚠️ Descarga completada pero el modelo puede estar incompleto")
            sys.exit(1)
    else:
        logger.error("❌ Error en la descarga del modelo")
        sys.exit(1)

