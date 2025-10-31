# Configuración de Ollama con MedGemma

## 📋 Resumen de Cambios

Se ha configurado el backend para usar **Ollama** con el modelo `amsaravi/medgemma-4b-it:q8` en lugar de LM Studio.

## 🏗️ Arquitectura del Backend

### Flujo Actual del Backend:

1. **Backend Principal**: `main.py` (FastAPI)
   - Puerto: `5001`
   - Endpoints: `/api/chat`, `/api/image-analysis`, `/api/history`, etc.

2. **Sistema LLM**: `langchain_system.py`
   - Usa LangChain con `ChatOpenAI` (compatible con API de OpenAI)
   - Se conecta a Ollama mediante su endpoint compatible con OpenAI API
   - Modelo: `amsaravi/medgemma-4b-it:q8`

3. **Análisis de Imágenes**: `medical_analysis.py`
   - Usa httpx para hacer requests directos a Ollama
   - Soporta análisis multimodal (texto + imágenes)

4. **Variables de Entorno**: 
   - `OLLAMA_ENDPOINT`: URL del endpoint de Ollama (default: `http://localhost:11434/v1/`)
   - `LM_STUDIO_URL`: Compatible hacia atrás (se usa si no existe `OLLAMA_ENDPOINT`)

## ✅ Cambios Realizados

### 1. `langchain_system.py`
- ✅ Cambiado `FallbackLLM` para usar Ollama en lugar de LM Studio
- ✅ Endpoint actualizado: `http://localhost:11434/v1/` (puerto estándar de Ollama)
- ✅ Modelo actualizado: `amsaravi/medgemma-4b-it:q8`
- ✅ Todas las referencias a LM Studio reemplazadas por Ollama

### 2. `medical_analysis.py`
- ✅ Configurado para usar Ollama
- ✅ Endpoint: `OLLAMA_ENDPOINT` o `LM_STUDIO_URL` como fallback
- ✅ Modelo: `amsaravi/medgemma-4b-it:q8`

### 3. `main.py`
- ✅ Inicialización de `medical_chain` ahora lee `OLLAMA_ENDPOINT` desde variables de entorno
- ✅ Provider actualizado: `ollama` en lugar de `lm-studio`
- ✅ Modelo actualizado en métricas: `amsaravi/medgemma-4b-it:q8`

### 4. `env.local`
- ✅ `OLLAMA_ENDPOINT=http://localhost:11434/v1/`
- ✅ `LM_STUDIO_URL=http://localhost:11434` (compatibilidad)

## 🚀 Cómo Iniciar

### 1. Verificar que Ollama esté instalado

```bash
ollama --version
```

### 2. Verificar que el modelo esté disponible

```bash
ollama ls
```

Deberías ver:
```
amsaravi/medgemma-4b-it:q8    905dc0be940a    5.0 GB
```

Si no está listado, descárgalo:
```bash
ollama pull amsaravi/medgemma-4b-it:q8
```

### 3. Iniciar Ollama (si no está corriendo)

Ollama normalmente se ejecuta como servicio en segundo plano. Si necesitas iniciarlo manualmente:

```bash
ollama serve
```

Esto iniciará el servidor en `http://localhost:11434`

### 4. Verificar que Ollama esté funcionando

```bash
curl http://localhost:11434/api/tags
```

O probar una consulta simple:
```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "amsaravi/medgemma-4b-it:q8",
    "messages": [
      {
        "role": "user",
        "content": "Hola, ¿cómo estás?"
      }
    ]
  }'
```

### 5. Iniciar el Backend

Desde el directorio raíz del proyecto:

```bash
cd chatbot
python main.py
```

O usando el script de inicio:
```bash
./start-all.sh
```

## 🔍 Verificación de la Conexión

### Logs del Backend

Al iniciar el backend, deberías ver en los logs:

```
✅ Configurado para usar Ollama local en: http://localhost:11434/v1/
✅ Modelo: amsaravi/medgemma-4b-it:q8
```

### Probar el Chat

1. Abre el frontend (Gateway Next.js) en `http://localhost:3001` (o el puerto configurado)
2. Envía un mensaje de prueba
3. Deberías ver respuestas del modelo medgemma

### Probar Análisis de Imágenes

1. Sube una imagen médica (por ejemplo, una radiografía)
2. El sistema debería analizar la imagen usando Ollama con medgemma

## 🐛 Troubleshooting

### Error: "Connection refused" o "Connection timeout"

**Problema**: Ollama no está corriendo o no está accesible

**Solución**:
```bash
# Verificar si Ollama está corriendo
ps aux | grep ollama

# Iniciar Ollama si no está corriendo
ollama serve
```

### Error: "Model not found"

**Problema**: El modelo `amsaravi/medgemma-4b-it:q8` no está disponible

**Solución**:
```bash
# Listar modelos disponibles
ollama ls

# Descargar el modelo si no está disponible
ollama pull amsaravi/medgemma-4b-it:q8
```

### Error: "Invalid endpoint"

**Problema**: La URL del endpoint no es correcta

**Solución**: Verificar que `OLLAMA_ENDPOINT` termine con `/v1/`:
```bash
# En env.local o variables de entorno
OLLAMA_ENDPOINT=http://localhost:11434/v1/
```

### El backend sigue usando LM Studio

**Problema**: Variables de entorno no cargadas correctamente

**Solución**:
1. Verificar que `env.local` existe en el directorio raíz
2. Asegurar que las variables se carguen:
   ```bash
   export OLLAMA_ENDPOINT=http://localhost:11434/v1/
   ```
3. Reiniciar el backend

## 📝 Notas Importantes

1. **Puerto de Ollama**: El puerto por defecto de Ollama es `11434`, diferente de LM Studio (`1234`)

2. **API Compatible**: Ollama es compatible con la API de OpenAI, por eso funciona con LangChain `ChatOpenAI`

3. **Modelo**: El modelo `amsaravi/medgemma-4b-it:q8` es una versión cuantizada (q8) del modelo MedGemma-4B

4. **Multimodal**: El modelo soporta análisis de imágenes (multimodal), por lo que el análisis de radiografías debería funcionar

5. **Performance**: El modelo q8 es una versión cuantizada que balancea calidad y velocidad

## 🔄 Migración desde LM Studio

Si antes usabas LM Studio:

1. ✅ Ya no necesitas ejecutar LM Studio
2. ✅ Ejecuta `ollama serve` en su lugar
3. ✅ Actualiza las variables de entorno (`OLLAMA_ENDPOINT` en lugar de `LM_STUDIO_URL`)
4. ✅ Descarga el modelo: `ollama pull amsaravi/medgemma-4b-it:q8`

## 📚 Referencias

- [Documentación de Ollama](https://ollama.ai/docs)
- [MedGemma en Ollama](https://ollama.ai/library/medgemma)
- [API de Ollama compatible con OpenAI](https://ollama.ai/docs/api)

