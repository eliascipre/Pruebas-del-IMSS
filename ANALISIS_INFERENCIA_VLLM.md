# 📊 Análisis de Arquitectura de Inferencia vLLM con Ray Serve

## 🏗️ Arquitectura Actual

### Configuración del Servicio Principal

**Ubicación**: `/home/administrador/vllm/serve_medgemma.py`

**Modelo**: `google/medgemma-27b-it`

**Configuración del Motor**:
```python
engine_args = AsyncEngineArgs(
    model="google/medgemma-27b-it",
    tensor_parallel_size=4,        # Usa 4 GPUs por réplica
    dtype="bfloat16",
    max_model_len=8192,
    gpu_memory_utilization=0.95,
    enable_lora=False,
    enforce_eager=True,
    trust_remote_code=True,
)
```

**Configuración de Deployment**:
- **Autoscaling**: min 2 réplicas, max 16 réplicas
- **Target Ongoing Requests**: 5 (escala cuando hay 5+ peticiones en cola)
- **GPUs por Réplica**: 4 GPUs
- **Puerto**: 8000
- **Endpoint**: `http://localhost:8000/v1/chat/completions`

### Topología de Red

**Nodo Maestro**: `10.105.20.1`
- Ejecuta Ray Serve y coordina todos los workers
- Puerto 8000 expone la API OpenAI-compatible

**Nodos Workers** (16 nodos):
- `10.105.20.2` hasta `10.105.20.20`
- Cada nodo tiene 4 GPUs NVIDIA A10
- Cada réplica de vLLM usa las 4 GPUs de un nodo completo

### Estado Actual del Nodo Maestro

Según `nvidia-smi` mostrado:
```
GPU 0: VLLM::Worker_TP0 - 20730MiB / 23028MiB
GPU 1: VLLM::Worker_TP1 - 20730MiB / 23028MiB
GPU 2: VLLM::Worker_TP2 - 20730MiB / 23028MiB
GPU 3: VLLM::Worker_TP3 - 20730MiB / 23028MiB
```

**Análisis**:
- Cada GPU está usando ~20.7GB de memoria (90% de capacidad)
- El modelo `medgemma-27b-it` está distribuido en 4 GPUs usando Tensor Parallelism
- Las 4 GPUs del nodo maestro están completamente ocupadas por una réplica

---

## 🔍 Análisis de Capacidad

### Recursos Disponibles

**Nodo Maestro (10.105.20.1)**:
- 4 GPUs NVIDIA A10
- Cada GPU: 23028MiB memoria total
- Estado: 4 GPUs ocupadas por medgemma-27b-it

**Nodos Workers (10.105.20.2-20)**:
- 16 nodos disponibles
- Cada nodo: 4 GPUs NVIDIA A10
- Capacidad total: 64 GPUs (16 nodos × 4 GPUs)

### Opciones para Cargar un Segundo Modelo

#### Opción 1: Usar un Nodo Worker Dedicado (RECOMENDADO)

**Ventajas**:
- ✅ No afecta el rendimiento del modelo principal
- ✅ Aislamiento completo de recursos
- ✅ Escalado independiente
- ✅ Configuración más simple

**Configuración**:
- Asignar un nodo worker específico (ej: `10.105.20.2`) para el segundo modelo
- Crear un segundo deployment de Ray Serve en el mismo cluster
- Usar un puerto diferente (ej: 8001)

#### Opción 2: Compartir GPUs en el Nodo Maestro (NO RECOMENDADO)

**Desventajas**:
- ❌ Requiere reducir `tensor_parallel_size` a 2 para cada modelo
- ❌ Menor rendimiento por modelo
- ❌ Posible fragmentación de memoria
- ❌ Mayor latencia

**Configuración**:
- `tensor_parallel_size=2` para medgemma-27b-it (2 GPUs)
- `tensor_parallel_size=2` para segundo modelo (2 GPUs restantes)

#### Opción 3: Usar un Nodo Worker con GPU Selection (INTERMEDIO)

**Ventajas**:
- ✅ Mantiene el rendimiento del modelo principal
- ✅ Flexibilidad para escalar

**Configuración**:
- Usar Ray con selección específica de GPUs
- Asignar GPUs específicas a cada deployment

---

## 🎯 Recomendación: Cargar NV-Reason-CXR en un Nodo Worker

### Modelo Objetivo: NV-Reason-CXR-3B

**Características**:
- Modelo más pequeño: 3B parámetros vs 27B de MedGemma
- Puede funcionar con 1-2 GPUs (no requiere 4)
- Especializado en análisis de radiografías de tórax

### Configuración Propuesta

**Opción A: Deployment Independiente en Ray Serve** (Mejor para integración)

Crear un segundo deployment en el mismo cluster Ray:
- **Puerto**: 8001
- **Nodo asignado**: `10.105.20.2` (o cualquier worker disponible)
- **Tensor Parallelism**: 2 GPUs (suficiente para 3B)
- **Endpoint**: `http://10.105.20.1:8001/v1/chat/completions`

**Opción B: Servicio Separado con Transformers** (Actual)

Mantener el servicio actual en `nv-reason-cxr` que usa transformers directamente:
- **Puerto**: 5005
- **Ventaja**: No requiere Ray Serve, más simple
- **Desventaja**: No aprovecha la optimización de vLLM

---

## 📝 Plan de Implementación

### Paso 1: Crear Deployment para NV-Reason-CXR con vLLM

1. Crear archivo `serve_nv_reason.py` similar a `serve_medgemma.py`
2. Configurar con `tensor_parallel_size=2` (2 GPUs son suficientes)
3. Asignar a un nodo worker específico
4. Exponer en puerto 8001

### Paso 2: Integrar con el Chatbot

1. Modificar `chatbot/langchain_system.py` para usar el nuevo endpoint
2. Agregar fallback automático entre modelos
3. Actualizar `medical_analysis.py` para routing inteligente

### Paso 3: Configurar Load Balancing

1. Usar Ray Serve para distribuir carga entre modelos
2. Implementar routing basado en tipo de consulta:
   - Texto general → MedGemma 27B (puerto 8000)
   - Radiografías → NV-Reason-CXR (puerto 8001)

---

## 🔧 Configuración Técnica Detallada

### Arquitectura de Red

```
┌─────────────────────────────────────────────────────────┐
│  Nodo Maestro (10.105.20.1)                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Ray Serve Controller                             │  │
│  │  - MedGemma Deployment (puerto 8000)              │  │
│  │  - NV-Reason Deployment (puerto 8001)            │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  GPUs 0-3: MedGemma 27B (TP=4)                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ├─→ Worker 1 (10.105.20.2)
         │   ┌───────────────────────────────────────┐
         │   │  GPUs 0-1: NV-Reason-CXR (TP=2)        │
         │   │  GPUs 2-3: Disponibles                │
         │   └───────────────────────────────────────┘
         │
         ├─→ Worker 2-16 (10.105.20.3-20)
         │   ┌───────────────────────────────────────┐
         │   │  GPUs 0-3: MedGemma Workers (TP=4)    │
         │   └───────────────────────────────────────┘
```

### Memoria Estimada

**MedGemma 27B**:
- 4 GPUs × 20.7GB = ~83GB total
- bfloat16: ~54GB modelo + ~29GB activaciones/KV cache

**NV-Reason-CXR 3B**:
- 2 GPUs × ~10GB = ~20GB total
- bfloat16: ~6GB modelo + ~14GB activaciones/KV cache

**Capacidad disponible**:
- Nodo Worker típico: 4 GPUs × 23GB = 92GB
- NV-Reason usaría: ~20GB (22% de capacidad)
- Espacio restante: ~72GB (disponible para otro modelo pequeño)

---

## ✅ Conclusión

**Respuesta a tu pregunta**: Sí, es posible cargar otro modelo en el nodo 1, pero **NO es recomendable** porque:

1. El nodo maestro ya está usando las 4 GPUs para MedGemma 27B
2. Compartir GPUs reduciría el rendimiento de ambos modelos
3. Mejor usar un nodo worker dedicado (ej: `10.105.20.2`)

**Recomendación Final**:
- **Mantener MedGemma 27B** en el nodo maestro (4 GPUs)
- **Cargar NV-Reason-CXR** en un nodo worker (2 GPUs suficientes)
- **Crear segundo deployment** en Ray Serve para mejor integración
- **Mantener servicio actual** en puerto 5005 como fallback

