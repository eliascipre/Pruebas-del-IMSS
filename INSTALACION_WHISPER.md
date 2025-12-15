# Instalación de Whisper large-v3-turbo

## Cambios Implementados

Se ha actualizado el servicio de transcripción para usar **Hugging Face Transformers** en lugar de `openai-whisper`, siguiendo la documentación oficial de [Whisper large-v3-turbo](https://huggingface.co/openai/whisper-large-v3-turbo).

## Instalación

### 1. Instalar Dependencias

```bash
cd chatbot
pip install -r requirements.txt
```

O instalar manualmente:

```bash
pip install --upgrade transformers datasets[audio] accelerate torch torchaudio
```

### 2. Descargar el Modelo

El modelo se descargará automáticamente la primera vez que se use. Se guardará en:
```
chatbot/models/whisper-large-v3-turbo/
```

**Nota**: El modelo pesa aproximadamente 1.5GB, así que la primera descarga puede tardar unos minutos.

### 3. Verificar Instalación

El modelo se cargará automáticamente cuando se haga la primera transcripción. Verás en los logs:

```
INFO:transcription_service:📥 Cargando modelo Whisper 'openai/whisper-large-v3-turbo' (CPU)...
INFO:transcription_service:📥 Descargando modelo a: /ruta/a/chatbot/models/whisper-large-v3-turbo
INFO:transcription_service:✅ Modelo Whisper cargado en cpu
```

## Características

- ✅ **Modelo**: `whisper-large-v3-turbo` (optimizado para velocidad)
- ✅ **Ejecución**: CPU (torch.float32)
- ✅ **Cache local**: El modelo se guarda en `chatbot/models/whisper-large-v3-turbo/`
- ✅ **Auto-detección de idioma**: Detecta automáticamente el idioma del audio
- ✅ **Optimizaciones**: Usa `low_cpu_mem_usage=True` y `use_safetensors=True`

## Uso

El endpoint `/api/transcribe` está disponible y requiere autenticación:

```python
POST /api/transcribe
{
    "audio_data": "base64_encoded_audio",
    "audio_format": "webm",
    "language": "es"  # opcional
}
```

## Configuración Avanzada

### Cambiar el Modelo

Para usar un modelo diferente, edita `chatbot/transcription_service.py`:

```python
_model_id = "openai/whisper-base"  # Modelo más pequeño y rápido
# o
_model_id = "openai/whisper-large-v3"  # Modelo más grande y preciso
```

### Usar GPU (si está disponible)

Para usar GPU, modifica `get_whisper_pipeline()`:

```python
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
```

## Solución de Problemas

### Error: "No module named 'transformers'"

```bash
pip install transformers>=4.40.0
```

### Error: "No module named 'torch'"

```bash
pip install torch>=2.0.0 torchaudio>=2.0.0
```

### El modelo no se descarga

Verifica que tienes conexión a internet y espacio en disco (al menos 2GB libres).

### Error de memoria

Si tienes problemas de memoria, usa un modelo más pequeño:

```python
_model_id = "openai/whisper-base"  # ~150MB
```

## Referencias

- [Documentación oficial de Whisper large-v3-turbo](https://huggingface.co/openai/whisper-large-v3-turbo)
- [Hugging Face Transformers](https://huggingface.co/docs/transformers)





