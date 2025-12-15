# Análisis del Error al Procesar Imágenes

## 🔍 Problema Identificado

El error "Lo siento, hubo un error al procesar tu mensaje" ocurre al intentar procesar imágenes de radiografías.

## 📊 Análisis del Problema

### 1. **Límite de Contexto del Modelo**
- **Configuración actual**: `max_model_len=8192` tokens
- **Problema**: Una imagen en base64 puede ser muy grande:
  - Imagen JPG de 1MB → ~1.3MB en base64 → ~1,000,000 caracteres
  - Aproximación: 4 caracteres = 1 token
  - **1MB de imagen ≈ 250,000 tokens** (¡30x el límite!)

### 2. **Formato Multimodal**
El código actual envía imágenes en formato multimodal:
```python
multimodal_content = [
    {"type": "text", "text": "Analiza esta radiografía"},
    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
]
```

### 3. **MedGemma-27b y Soporte de Imágenes**
- MedGemma-27b **NO tiene capacidades de visión nativas**
- Es un modelo de lenguaje puro (text-only)
- El formato multimodal puede no ser procesado correctamente

## 🚨 Causas Probables del Error

1. **Tamaño de imagen excede límite de contexto** (más probable)
2. **Modelo no soporta formato multimodal** (probable)
3. **Error en el procesamiento del servidor vLLM** (posible)
4. **Error de parsing en el frontend** (posible)

## ✅ Soluciones Propuestas

### Solución 1: Reducir Tamaño de Imagen (RECOMENDADO)
Comprimir/redimensionar la imagen antes de enviarla:

```python
from PIL import Image
import io
import base64

def compress_image(image_data: str, max_size: int = 512, quality: int = 85) -> str:
    """Comprimir imagen a tamaño máximo y calidad"""
    # Decodificar base64
    image_bytes = base64.b64decode(image_data)
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convertir a RGB si es necesario
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Redimensionar si es muy grande
    if max(image.size) > max_size:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Comprimir a JPEG
    output = io.BytesIO()
    image.save(output, format='JPEG', quality=quality, optimize=True)
    output.seek(0)
    
    # Codificar a base64
    return base64.b64encode(output.read()).decode('utf-8')
```

### Solución 2: Usar Modelo de Visión Especializado
Si MedGemma no soporta imágenes, usar un modelo especializado:
- NV-Reason-CXR-3B (ya está disponible en el proyecto)
- O usar un servicio de análisis de imágenes separado

### Solución 3: Validar Tamaño Antes de Enviar
Agregar validación en el frontend y backend:

```python
MAX_IMAGE_SIZE_MB = 2  # 2MB máximo
MAX_IMAGE_TOKENS = 1000  # ~1000 tokens máximo para imagen

def validate_image_size(image_data: str) -> bool:
    """Validar que la imagen no exceda el límite"""
    image_bytes = base64.b64decode(image_data)
    size_mb = len(image_bytes) / (1024 * 1024)
    
    if size_mb > MAX_IMAGE_SIZE_MB:
        return False
    
    # Estimar tokens (base64 es ~33% más grande)
    estimated_tokens = len(image_data) // 4
    if estimated_tokens > MAX_IMAGE_TOKENS:
        return False
    
    return True
```

### Solución 4: Mejorar Manejo de Errores
Agregar logging detallado y mensajes de error más informativos.

## 🔧 Implementación Inmediata

1. **Agregar compresión de imagen** en `medical_analysis.py`
2. **Validar tamaño** antes de enviar al modelo
3. **Mejorar manejo de errores** en frontend y backend
4. **Agregar logging detallado** para debugging


