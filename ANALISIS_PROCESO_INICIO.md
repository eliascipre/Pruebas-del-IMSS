# 📋 Análisis Detallado del Proceso de Inicio - Suite IMSS

## 🎯 Resumen Ejecutivo

El script `start-all.sh` es un sistema unificado que inicia **6 servicios** de la Suite IMSS de forma coordinada:

1. **Chatbot** (Puerto 5001) - FastAPI backend con LangChain y vLLM/Ollama
2. **Educación** (Puerto 5002) - Flask app para educación en radiografías
3. **Simulación** (Puerto 5003) - Flask app para simulación de entrevistas médicas
4. **Radiografías** (Puerto 5004) - Flask app con RAG para análisis de radiografías
5. **NV-Reason-CXR** (Puerto 5005) - Gradio service para análisis de radiografías con NVIDIA
6. **Gateway** (Puerto 3001) - Next.js frontend que actúa como gateway unificado

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Gateway (Next.js)                         │
│                    Puerto: 3001                             │
│                    http://localhost:3001                     │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├───► Chatbot (FastAPI) - Puerto 5001
               ├───► Educación (Flask) - Puerto 5002
               ├───► Simulación (Flask) - Puerto 5003
               ├───► Radiografías (Flask) - Puerto 5004
               └───► NV-Reason-CXR (Gradio) - Puerto 5005
```

---

## 📦 Servicios Detallados

### 1. **Chatbot** (Puerto 5001)

**Tecnología:** FastAPI (Python)
**Archivo principal:** `chatbot/main.py`
**Comando de inicio:**
```bash
cd chatbot && source ../venv/bin/activate && python3 main.py
```

**Características:**
- Backend asíncrono con FastAPI
- Integración con LangChain para gestión de conversaciones
- Soporte para vLLM (MedGemma 27B) para texto
- Soporte para Ollama (MedGemma 4B) para imágenes
- Sistema de memoria conversacional con SQLite
- Almacenamiento de medios (imágenes, audio, video)
- Transcripción de audio con Whisper
- Análisis médico de imágenes con Ollama
- Streaming de respuestas
- Sistema de cancelación de requests

**Endpoints principales:**
- `POST /api/chat` - Chat con streaming
- `POST /api/chat/image` - Chat con imágenes
- `POST /api/chat/audio` - Chat con audio
- `GET /health` - Health check
- `POST /api/cancel` - Cancelar request activo

**Dependencias:**
- Python 3.x
- FastAPI, uvicorn
- LangChain, langchain-openai
- httpx (para Ollama)
- SQLite (para memoria)
- Whisper (para transcripción)

**Variables de entorno:**
- `VLLM_ENDPOINT` - Endpoint de vLLM (default: http://localhost:8000/v1/)
- `OLLAMA_ENDPOINT` - Endpoint de Ollama (default: http://localhost:11434)
- `OLLAMA_IMAGE_MODEL` - Modelo de Ollama para imágenes (default: amsaravi/medgemma-4b-it:q8)

---

### 2. **Educación** (Puerto 5002)

**Tecnología:** Flask (Python)
**Archivo principal:** `Educacion_radiografia/app.py`
**Comando de inicio:**
```bash
cd Educacion_radiografia && python3 app.py
```

**Características:**
- Aplicación Flask para educación en radiografías
- Sistema de caché para respuestas
- Cliente LLM local (MedGemma)
- Interfaz web con templates HTML
- Generación de reportes educativos

**Endpoints principales:**
- `GET /api/health` - Health check
- `POST /api/analyze` - Análisis de radiografía
- `GET /` - Interfaz web principal

**Dependencias:**
- Python 3.x
- Flask, flask-cors
- Cliente LLM local

---

### 3. **Simulación** (Puerto 5003)

**Tecnología:** Flask (Python) + React (Frontend)
**Archivo principal:** `Simulacion/app.py`
**Comando de inicio:**
```bash
cd Simulacion && python3 app.py
```

**Características:**
- Simulador de entrevistas médicas
- Frontend React compilado
- Integración con Gemini TTS para voz
- Sistema de evaluación de reportes
- Caché de conversaciones
- Simulación de pacientes con condiciones médicas

**Endpoints principales:**
- `GET /api/health` - Health check
- `GET /api/stream_conversation` - Streaming de conversación
- `GET /api/evaluate` - Evaluación de reporte
- `GET /` - Interfaz web principal

**Dependencias:**
- Python 3.x
- Flask, flask-cors
- Gemini TTS
- Cliente LLM local (MedGemma/Gemini)

---

### 4. **Radiografías** (Puerto 5004)

**Tecnología:** Flask (Python) + React (Frontend)
**Archivo principal:** `radiografias_torax/backend/app.py`
**Comando de inicio:**
```bash
cd radiografias_torax/backend && source ../../venv/bin/activate && FORCE_CPU=1 python3 app.py
```

**Características:**
- Sistema RAG (Retrieval-Augmented Generation) para radiografías
- Base de conocimiento con ChromaDB
- Embeddings con SigLIP
- Análisis de radiografías de tórax
- Frontend React con Vite
- Sistema de caché persistente
- Gestión de casos médicos

**Endpoints principales:**
- `GET /api/health` - Health check
- `POST /api/analyze` - Análisis de radiografía
- `GET /api/cases` - Lista de casos
- `GET /` - Interfaz web principal

**Dependencias:**
- Python 3.x
- Flask, flask-cors
- ChromaDB (para RAG)
- SigLIP (para embeddings)
- Cliente LLM local (MedGemma)

**Variables de entorno:**
- `FORCE_CPU=1` - Forzar uso de CPU (evita problemas de VRAM)

---

### 5. **NV-Reason-CXR** (Puerto 5005)

**Tecnología:** Gradio (Python)
**Archivo principal:** `nv-reason-cxr/app.py`
**Script de inicio:** `nv-reason-cxr/run_local.sh`
**Comando de inicio:**
```bash
cd nv-reason-cxr && source ../venv/bin/activate && PORT=5005 FORCE_CPU=1 NV_REASON_ALLOW_DOWNLOADS=0 bash run_local.sh --skip-venv
```

**Características:**
- Servicio Gradio para análisis de radiografías
- Modelo NVIDIA NV-Reason-CXR-3B
- Interfaz web interactiva con Gradio
- Soporte para modo offline (sin descargas)
- Detección automática de modelo local

**Endpoints principales:**
- `GET /` - Interfaz web Gradio
- API de Gradio para análisis de imágenes

**Dependencias:**
- Python 3.x
- Gradio
- Transformers, torch
- Modelo NV-Reason-CXR-3B

**Variables de entorno:**
- `PORT` - Puerto HTTP (default: 5005)
- `FORCE_CPU=1` - Forzar uso de CPU
- `NV_REASON_ALLOW_DOWNLOADS` - Permitir descargas (0=offline, 1=online)
- `NV_REASON_MODEL_PATH` - Ruta al modelo local
- `MODEL` - Nombre del modelo (default: nvidia/NV-Reason-CXR-3B)

**Resolución de modelo:**
1. Busca en `NV_REASON_MODEL_PATH` (si está definido)
2. Busca en `~/.cache/huggingface/hub/models--nvidia--NV-Reason-CXR-3B`
3. Si no encuentra, permite descarga (si `NV_REASON_ALLOW_DOWNLOADS=1`)

---

### 6. **Gateway** (Puerto 3001)

**Tecnología:** Next.js (TypeScript/React)
**Archivo principal:** `UI_IMSS/package.json` (npm run dev)
**Comando de inicio:**
```bash
cd UI_IMSS && HOSTNAME=0.0.0.0 SERVICIO_CHATBOT_URL=http://[LOCAL_IP]:5001 SERVICIO_EDUCACION_URL=http://[LOCAL_IP]:5002 SERVICIO_SIMULACION_URL=http://[LOCAL_IP]:5003 SERVICIO_RADIOGRAFIAS_URL=http://[LOCAL_IP]:5004 npm run dev
```

**Características:**
- Frontend unificado con Next.js 16
- Gateway que conecta todos los servicios backend
- Interfaz de usuario moderna con Tailwind CSS
- Sistema de autenticación
- Páginas: Chat, Educación, Simulación, Radiografías, DICOM, etc.
- Modo oscuro/claro
- Responsive design

**Páginas principales:**
- `/` - Página de inicio
- `/chat` - Chat médico con IA
- `/home` - Dashboard principal
- `/login` - Autenticación
- `/radiografias` - Análisis de radiografías
- `/dicom` - Visor DICOM
- `/dicom-ohif` - Visor DICOM con OHIF

**Dependencias:**
- Node.js, npm
- Next.js 16
- React 19
- Tailwind CSS
- TypeScript

**Variables de entorno:**
- `HOSTNAME=0.0.0.0` - Escuchar en todas las interfaces
- `SERVICIO_CHATBOT_URL` - URL del servicio Chatbot
- `SERVICIO_EDUCACION_URL` - URL del servicio Educación
- `SERVICIO_SIMULACION_URL` - URL del servicio Simulación
- `SERVICIO_RADIOGRAFIAS_URL` - URL del servicio Radiografías

---

## 🔄 Flujo de Inicio del Script

### Fase 1: Preparación
1. **Verificación de dependencias:**
   - Python 3.x
   - Node.js
   - npm

2. **Limpieza de procesos anteriores:**
   - Mata procesos en puertos 3000, 3001, 5001-5005
   - Limpia archivos PID en `logs/`

3. **Detección de IP local:**
   - Linux: `ip route get 1.1.1.1`
   - macOS: `route get default`
   - Fallback: `192.168.1.26`

4. **Creación de directorio de logs:**
   - Crea `logs/` si no existe

### Fase 2: Inicio de Servicios Backend

**Orden de inicio:**
1. **Chatbot** (5001) - Primero porque es el más crítico
2. **Educación** (5002)
3. **Simulación** (5003)
4. **Radiografías** (5004)
5. **NV-Reason-CXR** (5005)

**Proceso para cada servicio:**
1. Verifica si existe `venv/`
2. Si existe, activa el venv
3. Ejecuta el comando en background con `nohup`
4. Guarda PID en `logs/[servicio].pid`
5. Redirige stdout/stderr a `logs/[servicio].log`

**Espera inicial:**
- Espera 8 segundos después de iniciar todos los backends

### Fase 3: Inicio del Gateway

1. **Inicia Gateway Next.js:**
   - Configura variables de entorno con IPs locales
   - Ejecuta `npm run dev` en background
   - Guarda PID en `logs/gateway.pid`

2. **Espera adicional:**
   - Espera 5 segundos para que el gateway se inicie

### Fase 4: Verificación de Servicios

**Health checks (en paralelo, no bloqueantes):**
- `http://localhost:5001/health` - Chatbot
- `http://localhost:5002/api/health` - Educación
- `http://localhost:5003/api/health` - Simulación
- `http://localhost:5004/api/health` - Radiografías
- `http://localhost:5005` - NV-Reason-CXR

**Detección de puerto del Gateway:**
- Busca en puertos 3001, 3000, 3002, 3003
- Verifica con `ss` o `check_port`
- Si no encuentra, usa 3001 como default

### Fase 5: Monitoreo Continuo

**Loop de monitoreo:**
- Cada 60 segundos verifica que todos los servicios estén activos
- Si algún servicio se cae, muestra advertencia
- Muestra estado actualizado

**Manejo de señales:**
- `Ctrl+C` (SIGINT) → Limpia todos los servicios y sale
- `SIGTERM` → Limpia todos los servicios y sale

---

## 📊 Gestión de Logs

**Estructura de logs:**
```
logs/
├── chatbot.log
├── educacion.log
├── simulacion.log
├── radiografias.log
├── nv-reason-cxr.log
├── gateway.log
├── chatbot.pid
├── educacion.pid
├── simulacion.pid
├── radiografias.pid
├── nv-reason-cxr.pid
└── gateway.pid
```

**Ver logs en tiempo real:**
```bash
tail -f logs/chatbot.log
tail -f logs/gateway.log
```

**Ver todos los logs:**
```bash
tail -f logs/*.log
```

---

## 🛠️ Comandos Útiles

### Iniciar todos los servicios:
```bash
./start-all.sh
```

### Ver estado de servicios:
```bash
./start-all.sh status
```

### Detener todos los servicios:
```bash
./start-all.sh stop
# O
./stop-all.sh
```

### Reiniciar todos los servicios:
```bash
./start-all.sh restart
```

### Verificar puertos:
```bash
lsof -i :5001  # Chatbot
lsof -i :5002  # Educación
lsof -i :5003  # Simulación
lsof -i :5004  # Radiografías
lsof -i :5005  # NV-Reason-CXR
lsof -i :3001  # Gateway
```

---

## 🌐 URLs de Acceso

### Local (localhost):
- **Gateway:** http://localhost:3001
- **Chatbot:** http://localhost:5001
- **Educación:** http://localhost:5002
- **Simulación:** http://localhost:5003
- **Radiografías:** http://localhost:5004
- **NV-Reason-CXR:** http://localhost:5005

### Red Local:
- **Gateway:** http://[LOCAL_IP]:3001
- **Chatbot:** http://[LOCAL_IP]:5001
- **Educación:** http://[LOCAL_IP]:5002
- **Simulación:** http://[LOCAL_IP]:5003
- **Radiografías:** http://[LOCAL_IP]:5004
- **NV-Reason-CXR:** http://[LOCAL_IP]:5005

---

## ⚙️ Configuraciones Importantes

### Variables de Entorno del Gateway

El gateway necesita conocer las IPs locales de los servicios backend:

```bash
HOSTNAME=0.0.0.0
SERVICIO_CHATBOT_URL=http://[LOCAL_IP]:5001
SERVICIO_EDUCACION_URL=http://[LOCAL_IP]:5002
SERVICIO_SIMULACION_URL=http://[LOCAL_IP]:5003
SERVICIO_RADIOGRAFIAS_URL=http://[LOCAL_IP]:5004
```

### Entorno Virtual (venv)

Todos los servicios Python pueden usar un venv compartido:
- Ruta: `Pruebas-del-IMSS/venv/`
- Si existe, se activa automáticamente
- Si no existe, usa Python del sistema

### Forzar CPU

Algunos servicios usan `FORCE_CPU=1` para evitar problemas de VRAM:
- Radiografías: `FORCE_CPU=1`
- NV-Reason-CXR: `FORCE_CPU=1`

---

## 🔍 Troubleshooting

### Problema: Puerto ya en uso
**Solución:**
```bash
# El script automáticamente mata procesos en puertos ocupados
# Si persiste, manualmente:
lsof -ti:5001 | xargs kill -9
```

### Problema: Servicio no inicia
**Solución:**
1. Verificar logs: `tail -f logs/[servicio].log`
2. Verificar dependencias: `pip list` o `npm list`
3. Verificar Python/Node: `python3 --version`, `node --version`

### Problema: Gateway no conecta con backends
**Solución:**
1. Verificar IP local: El script la detecta automáticamente
2. Verificar variables de entorno del gateway
3. Verificar que los backends estén escuchando en `0.0.0.0` o IP local

### Problema: NV-Reason-CXR no encuentra modelo
**Solución:**
1. Verificar que el modelo esté en `~/.cache/huggingface/hub/`
2. O definir `NV_REASON_MODEL_PATH`
3. O permitir descargas: `NV_REASON_ALLOW_DOWNLOADS=1`

---

## 📝 Notas Importantes

1. **Orden de inicio:** Los backends se inician primero, luego el gateway
2. **Esperas:** Hay esperas estratégicas para que los servicios se inicien
3. **Health checks:** No bloquean el inicio, solo verifican
4. **Monitoreo:** El script se mantiene ejecutando para monitorear servicios
5. **Limpieza:** Al presionar Ctrl+C, limpia todos los procesos automáticamente

---

## 🎯 Resumen de Comandos de Inicio

| Servicio | Comando | Puerto | Venv |
|----------|---------|--------|------|
| Chatbot | `cd chatbot && python3 main.py` | 5001 | ✅ |
| Educación | `cd Educacion_radiografia && python3 app.py` | 5002 | ❌ |
| Simulación | `cd Simulacion && python3 app.py` | 5003 | ❌ |
| Radiografías | `cd radiografias_torax/backend && FORCE_CPU=1 python3 app.py` | 5004 | ✅ |
| NV-Reason-CXR | `cd nv-reason-cxr && PORT=5005 FORCE_CPU=1 bash run_local.sh` | 5005 | ✅ |
| Gateway | `cd UI_IMSS && npm run dev` | 3001 | ❌ |

---

## ✅ Checklist de Inicio

- [ ] Python 3.x instalado
- [ ] Node.js y npm instalados
- [ ] Dependencias Python instaladas (venv o sistema)
- [ ] Dependencias Node.js instaladas (`npm install` en UI_IMSS)
- [ ] Modelos descargados (si es necesario)
- [ ] Puertos libres (3001, 5001-5005)
- [ ] Permisos de ejecución: `chmod +x start-all.sh`
- [ ] Directorio `logs/` existe o se creará automáticamente

---

**Última actualización:** 2025-11-10
**Versión del script:** 1.0






