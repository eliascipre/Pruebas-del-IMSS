#!/usr/bin/env python3
"""
Script para analizar imágenes con medgemma-4b en Ollama
Verifica si Ollama está corriendo antes de ejecutar el modelo
Envía una imagen y analiza su contenido
"""

import subprocess
import sys
import socket
import os
import base64
import requests
import json
from pathlib import Path
from typing import Optional

# Colores para output
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'  # No Color


def check_ollama_running() -> bool:
    """Verifica si Ollama está corriendo (puerto 11434 o proceso)"""
    # Verificar si el puerto 11434 está en uso
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('127.0.0.1', 11434))
        sock.close()
        if result == 0:
            return True
    except Exception:
        pass
    
    # Verificar si hay procesos de Ollama
    try:
        result = subprocess.run(
            ['pgrep', '-x', 'ollama'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return True
    except Exception:
        pass
    
    return False


def check_model_available() -> bool:
    """Verifica si el modelo medgemma-4b está disponible"""
    try:
        result = subprocess.run(
            ['ollama', 'list'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and 'medgemma-4b' in result.stdout:
            return True
    except subprocess.TimeoutExpired:
        print(f"{RED}❌ Timeout al verificar modelos${NC}")
    except Exception as e:
        print(f"{RED}❌ Error al verificar modelos: {e}${NC}")
    
    return False


def encode_image_to_base64(image_path: str) -> Optional[str]:
    """Codifica una imagen a base64"""
    try:
        with open(image_path, 'rb') as image_file:
            image_data = image_file.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
            return base64_image
    except FileNotFoundError:
        print(f"{RED}❌ Imagen no encontrada: {image_path}${NC}")
        return None
    except Exception as e:
        print(f"{RED}❌ Error al leer la imagen: {e}${NC}")
        return None


def analyze_image_with_ollama(image_path: str, prompt: str = "Analiza esta imagen médica en detalle y proporciona todos los hallazgos relevantes.") -> Optional[str]:
    """Envía una imagen a Ollama para análisis"""
    # Codificar la imagen
    print(f"{YELLOW}📷 Codificando imagen...{NC}")
    base64_image = encode_image_to_base64(image_path)
    if not base64_image:
        return None
    
    print(f"{GREEN}✅ Imagen codificada{NC}")
    
    # Preparar el payload para la API de Ollama
    # Formato que funciona (basado en el curl exitoso):
    # - Usar /api/generate
    # - Enviar imágenes como array de strings base64
    # - El prompt va en el campo "prompt"
    payload = {
        "model": "amsaravi/medgemma-4b-it:q8",
        "prompt": prompt,
        "images": [base64_image],
        "stream": False
    }
    
    # Enviar la petición a Ollama
    print(f"{YELLOW}🚀 Enviando imagen a medgemma-4b para análisis...{NC}")
    print(f"{YELLOW}⏳ Esto puede tomar varios minutos...{NC}")
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=600  # 10 minutos de timeout para análisis de imágenes
        )
        response.raise_for_status()
        
        result = response.json()
        response_text = result.get('response', '')
        
        if not response_text:
            print(f"{RED}❌ No se recibió respuesta del modelo{NC}")
            print(f"{YELLOW}Respuesta completa: {result}${NC}")
            return None
        
        return response_text
    except requests.exceptions.RequestException as e:
        print(f"{RED}❌ Error al comunicarse con Ollama: {e}${NC}")
        return None
    except json.JSONDecodeError as e:
        print(f"{RED}❌ Error al decodificar la respuesta: {e}${NC}")
        return None


def main():
    """Función principal"""
    print(f"{YELLOW}Verificando si Ollama está corriendo...{NC}")
    
    # Verificar si Ollama está corriendo
    if not check_ollama_running():
        print(f"{RED}❌ Ollama no está corriendo{NC}")
        print(f"{YELLOW}💡 Inicia Ollama primero con: ollama serve{NC}")
        sys.exit(1)
    
    print(f"{GREEN}✅ Ollama está corriendo{NC}")
    
    # Verificar si el modelo está disponible
    print(f"{YELLOW}Verificando si el modelo medgemma-4b está disponible...{NC}")
    
    if not check_model_available():
        print(f"{RED}❌ Modelo medgemma-4b no encontrado{NC}")
        print(f"{YELLOW}💡 Descarga el modelo primero con: ollama pull amsaravi/medgemma-4b-it:q8{NC}")
        sys.exit(1)
    
    print(f"{GREEN}✅ Modelo medgemma-4b disponible{NC}")
    
    # Ruta de la imagen
    script_dir = Path(__file__).parent.parent
    image_path = script_dir / "chatbot" / "media" / "image" / "20251107_115233_8756e717.jpg"
    
    # Verificar que la imagen existe
    if not image_path.exists():
        print(f"{RED}❌ Imagen no encontrada: {image_path}${NC}")
        sys.exit(1)
    
    print(f"{GREEN}✅ Imagen encontrada: {image_path}${NC}")
    print("")
    
    # Prompt para análisis médico
    prompt = """Analiza esta imagen médica en detalle. Proporciona:
1. Tipo de imagen (radiografía, tomografía, etc.)
2. Hallazgos principales
3. Anomalías detectadas
4. Recomendaciones clínicas
5. Cualquier otro detalle relevante"""
    
    # Analizar la imagen
    print(f"{GREEN}🔍 Analizando imagen con medgemma-4b...{NC}")
    print("")
    
    result = analyze_image_with_ollama(str(image_path), prompt)
    
    if result:
        print(f"{GREEN}{'='*80}{NC}")
        print(f"{GREEN}📋 RESULTADO DEL ANÁLISIS:{NC}")
        print(f"{GREEN}{'='*80}{NC}")
        print("")
        print(result)
        print("")
        print(f"{GREEN}{'='*80}{NC}")
    else:
        print(f"{RED}❌ No se pudo obtener el análisis de la imagen{NC}")
        sys.exit(1)


if __name__ == "__main__":
    main()

