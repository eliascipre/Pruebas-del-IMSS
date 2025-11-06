# Solución: Problema de Conexión en Túneles SSH de Cloudflare

## Problema Identificado

El error `ERR_CONNECTION_TIMED_OUT` indica que el backend no está accesible en el puerto 5001 a través del túnel SSH de Cloudflare.

## Causas Posibles

1. **El backend no está corriendo** en el puerto 5001
2. **El túnel SSH de Cloudflare no está exponiendo el puerto 5001**
3. **El backend está corriendo pero no está accesible desde el túnel**

## Soluciones

### Solución 1: Verificar que el Backend Esté Corriendo

```bash
# Verificar que el backend esté corriendo en el puerto 5001
ps aux | grep python
netstat -tulpn | grep 5001
# o
ss -tulpn | grep 5001
```

### Solución 2: Configurar el Túnel SSH de Cloudflare Correctamente

Si estás usando `cloudflared`, necesitas exponer el puerto 5001:

```bash
# Ejemplo: Exponer el puerto 5001 del backend
cloudflared tunnel --url http://localhost:5001
```

O si estás usando un túnel HTTP:

```bash
# Exponer múltiples servicios
cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001
```

### Solución 3: Configurar Variable de Entorno

Si el backend está en un túnel diferente o en una URL diferente, configura la variable de entorno:

En `UI_IMSS/.env.local`:
```bash
NEXT_PUBLIC_CHATBOT_URL=https://tu-backend-url.trycloudflare.com
```

O si el backend está en el mismo túnel pero en una ruta diferente:
```bash
NEXT_PUBLIC_CHATBOT_URL=https://park-planes-way-auction.trycloudflare.com/api
```

### Solución 4: Verificar que el Backend Esté Accesible

Prueba acceder directamente al backend desde el navegador:
```
https://park-planes-way-auction.trycloudflare.com:5001/health
```

Si no funciona, el backend no está accesible a través del túnel.

## Implementación de Speech-to-Text

Se ha implementado la funcionalidad de speech-to-text con Whisper:

### Frontend (`UI_IMSS/app/chat/page.tsx`)
- ✅ Botón de grabación de voz agregado
- ✅ Funciones de grabación y transcripción implementadas
- ✅ El texto transcrito se coloca automáticamente en el input

### Backend (`chatbot/main.py` y `chatbot/transcription_service.py`)
- ✅ Endpoint `/api/transcribe` creado
- ✅ Servicio de transcripción con Whisper implementado
- ✅ Ejecuta en CPU por defecto (modelo "base")

### Dependencias
- ✅ `openai-whisper` agregado a `requirements.txt`

## Próximos Pasos

1. **Instalar Whisper**:
   ```bash
   pip install openai-whisper
   ```

2. **Verificar que el backend esté corriendo** en el puerto 5001

3. **Configurar el túnel SSH de Cloudflare** para exponer el puerto 5001

4. **Probar la funcionalidad de speech-to-text**:
   - Hacer clic en el botón de micrófono
   - Hablar
   - Detener la grabación
   - El texto transcrito aparecerá en el input
   - Enviar el mensaje

## Notas

- El modelo Whisper "base" es rápido pero menos preciso que modelos más grandes
- Para mejor precisión, cambiar `_model_name = "base"` a `"small"` o `"medium"` en `transcription_service.py`
- La primera carga del modelo Whisper puede tardar unos segundos

