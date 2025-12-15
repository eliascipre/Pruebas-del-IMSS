# Estrategias de Optimización de VRAM - Análisis Detallado

**Fecha:** 8 de Noviembre 2025  
**Contexto:** 16 nodos disponibles, cada uno con 4 GPUs (NVIDIA A10, 23 GB cada una)

## 📊 Situación Actual

- **Nodo 0:** 4 GPUs con modelo vLLM (medgemma-27b) corriendo
  - Consumo actual: ~82.9 GB por nodo
  - `gpu_memory_utilization=0.95` (95% de VRAM)
  - `tensor_parallel_size=4` (1 réplica usa 4 GPUs)
- **Nodos 1-15:** Disponibles para configurar
- **Objetivo:** Montar medgemma-4b en el nodo 0 o encontrar equilibrio

---

## 🎯 Estrategia 1: Reducir `gpu_memory_utilization` a 0.90 o 0.93 en Nodo 0

### Análisis de Viabilidad

#### Opción A: Reducir a 0.90

**Cálculo de VRAM liberada:**
- GPU Total: 23 GB (23,552 MiB)
- Actual: `gpu_memory_utilization=0.95` → 21.85 GB por GPU (22,374 MiB)
- Propuesto: `gpu_memory_utilization=0.90` → 20.70 GB por GPU (21,197 MiB)
- **VRAM liberada por GPU:** ~1.15 GB (1,178 MiB)
- **Total liberado en 4 GPUs:** ~4.60 GB
- **VRAM libre total con 0.90:** ~9.20 GB (en 4 GPUs)
- **Necesario para medgemma-4b:** ~5.0 GB

**Cálculo detallado:**
- Consumo con 0.90 en 4 GPUs: ~82.80 GB
- VRAM total en 4 GPUs: ~92.00 GB
- VRAM libre: ~9.20 GB
- medgemma-4b necesita: ~5.0 GB
- **Margen disponible:** ~4.20 GB ✅

#### Opción B: Reducir a 0.93

**Cálculo de VRAM liberada:**
- GPU Total: 23 GB (23,552 MiB)
- Actual: `gpu_memory_utilization=0.95` → 21.85 GB por GPU (22,374 MiB)
- Propuesto: `gpu_memory_utilization=0.93` → 21.39 GB por GPU (21,903 MiB)
- **VRAM liberada por GPU:** ~0.46 GB (471 MiB)
- **Total liberado en 4 GPUs:** ~1.84 GB
- **VRAM libre total con 0.93:** ~6.44 GB (en 4 GPUs)
- **Necesario para medgemma-4b:** ~5.0 GB

**Cálculo detallado:**
- Consumo con 0.93 en 4 GPUs: ~85.56 GB
- VRAM total en 4 GPUs: ~92.00 GB
- VRAM libre: ~6.44 GB
- medgemma-4b necesita: ~5.0 GB
- **Margen disponible:** ~1.44 GB ⚠️

### ✅ Viabilidad: **POSIBLE y VIABLE (con diferencias)**

| Configuración | VRAM Libre | Margen para medgemma-4b | Recomendación |
|---------------|------------|-------------------------|---------------|
| **0.90** | ~9.20 GB | ~4.20 GB | ✅ Recomendado (más seguro) |
| **0.93** | ~6.44 GB | ~1.44 GB | ⚠️ Ajustado (funciona pero con poco margen) |

**Ventajas:**
- Cambio simple (solo modificar un parámetro)
- No requiere reconfiguración del cluster
- Mantiene el modelo 27B corriendo
- **0.90:** Mayor margen de seguridad (~4.2 GB)
- **0.93:** Menor impacto en rendimiento del modelo 27B

**Desventajas:**
- Puede afectar el rendimiento del modelo 27B (menos KV cache)
- **0.90:** Impacto moderado en rendimiento
- **0.93:** Impacto mínimo en rendimiento, pero margen muy ajustado (~1.44 GB)

**Implementación:**

**Opción A (0.90 - Recomendada):**
```python
# En serve_medgemma.py, línea 84
gpu_memory_utilization=0.90,  # Reducir de 0.95 a 0.90
```

**Opción B (0.93 - Más conservadora):**
```python
# En serve_medgemma.py, línea 84
gpu_memory_utilization=0.93,  # Reducir de 0.95 a 0.93
```

**Recomendación:**
- **0.90:** ✅ **VIABLE y RECOMENDADO** - Con margen de ~4.2 GB, es suficiente para medgemma-4b. La reducción de KV cache puede afectar ligeramente el rendimiento, pero es aceptable.
- **0.93:** ⚠️ **VIABLE pero AJUSTADO** - Con margen de solo ~1.44 GB, funciona pero es muy ajustado. Mejor rendimiento del modelo 27B, pero mayor riesgo de OOM si hay picos de uso.

---

## 🎯 Estrategia 2: Excluir Nodo 0 de vLLM, Solo Correr medgemma-27b en Nodo 0

### Análisis de Viabilidad

**Concepto:**
- Nodo 0: Solo medgemma-27b (sin vLLM para otros modelos)
- Nodos 1-15: vLLM con medgemma-27b (o medgemma-4b)

**Configuración necesaria:**
1. **Crear dos deployments separados:**
   - `MedGemma27BDeployment`: Para nodos 1-15 (con autoscaling)
   - `MedGemma27BNode0Deployment`: Solo para nodo 0 (sin autoscaling)

2. **Usar Ray Placement Groups para excluir nodo 0:**
   - Ray Serve permite especificar en qué nodos correr deployments
   - Usar `ray.util.placement_group` o `ray_actor_options` con `resources`

### ✅ Viabilidad: **POSIBLE, pero complejo**

**Ventajas:**
- Nodo 0 dedicado exclusivamente a medgemma-27b
- Nodos 1-15 pueden correr vLLM con autoscaling
- Separación clara de recursos

**Desventajas:**
- Requiere modificar la arquitectura de Ray Serve
- Necesita dos deployments separados
- Configuración más compleja

**Implementación detallada:**

#### Opción A: Usar Placement Groups (Recomendado)

```python
# serve_medgemma.py - Modificar para soportar exclusión de nodo 0

from ray.util.placement_group import placement_group, remove_placement_group
from ray.util.scheduling_strategies import PlacementGroupSchedulingStrategy

# Crear placement group que excluye nodo 0
# Esto requiere identificar nodo 0 por su IP o hostname
NODE_0_HOSTNAME = os.environ.get("NODE_0_HOSTNAME", "node-0")

# Configuración para nodos 1-15 (excluye nodo 0)
@serve.deployment(
    name="MedGemma27BDeployment",
    autoscaling_config={
        "min_replicas": 1,
        "max_replicas": 15,  # Solo 15 nodos (excluye nodo 0)
        "target_ongoing_requests": 5
    },
    ray_actor_options={
        "num_gpus": 4,
        "resources": {"node_id": "!node_0"}  # Excluir nodo 0
    }
)
class VLLMDeploymentNodes1_15:
    # ... mismo código que VLLMDeployment ...
    pass

# Configuración para nodo 0 (solo medgemma-27b, sin autoscaling)
@serve.deployment(
    name="MedGemma27BNode0Deployment",
    num_replicas=1,  # Solo 1 réplica en nodo 0
    ray_actor_options={
        "num_gpus": 4,
        "resources": {"node_id": "node_0"}  # Solo nodo 0
    }
)
class VLLMDeploymentNode0:
    # ... mismo código que VLLMDeployment ...
    pass
```

#### Opción B: Usar Ray Cluster Labels (Más simple)

```python
# En el script de inicio de Ray, etiquetar nodo 0
# ray start --head --labels={"node_type":"dedicated_27b"}

@serve.deployment(
    name="MedGemma27BDeployment",
    autoscaling_config={
        "min_replicas": 1,
        "max_replicas": 15,
        "target_ongoing_requests": 5
    },
    ray_actor_options={
        "num_gpus": 4,
        "resources": {"node_type": "!dedicated_27b"}  # Excluir nodo 0
    }
)
```

**Recomendación:** ✅ **Factible** - Requiere configuración de Ray cluster, pero es la solución más limpia.

---

## 🎯 Estrategia 3: Equilibrio entre vLLM y medgemma-4b en Nodo 0

### Análisis de Viabilidad

**Concepto:**
- Nodo 0: medgemma-27b (vLLM) + medgemma-4b (Ollama o vLLM separado)
- Nodos 1-15: vLLM con medgemma-27b (autoscaling)

**Cálculo de VRAM necesario:**
- medgemma-27b (vLLM): ~82.9 GB (4 GPUs)
- medgemma-4b (Ollama): ~5.0 GB (1 GPU)
- **Total necesario:** ~87.9 GB en 4 GPUs

**Problema:**
- Cada GPU tiene 23 GB
- 4 GPUs = 92 GB total
- medgemma-27b usa ~20.7 GB por GPU = ~82.8 GB
- medgemma-4b necesita ~5.0 GB
- **Total:** ~87.8 GB (muy ajustado, solo ~4.2 GB libres)

### ✅ Viabilidad: **POSIBLE, pero muy ajustado**

**Opciones de implementación:**

#### Opción A: medgemma-27b con `tensor_parallel_size=3` + medgemma-4b en 1 GPU

**Cálculo:**
- medgemma-27b en 3 GPUs: ~20.7 GB × 3 = ~62.1 GB
- medgemma-4b en 1 GPU: ~5.0 GB
- **Total:** ~67.1 GB (margen: ~24.9 GB)

**Implementación:**
```python
# Deployment 1: medgemma-27b en 3 GPUs (nodo 0)
@serve.deployment(
    name="MedGemma27BNode0",
    num_replicas=1,
    ray_actor_options={
        "num_gpus": 3,  # Solo 3 GPUs
        "resources": {"node_id": "node_0"}
    }
)
class VLLMDeployment27B:
    def __init__(self):
        engine_args = AsyncEngineArgs(
            model="google/medgemma-27b-it",
            tensor_parallel_size=3,  # 3 GPUs en lugar de 4
            gpu_memory_utilization=0.90,
            # ... resto de configuración
        )
        self.engine = AsyncLLMEngine.from_engine_args(engine_args)

# Deployment 2: medgemma-4b en 1 GPU (nodo 0)
@serve.deployment(
    name="MedGemma4BNode0",
    num_replicas=1,
    ray_actor_options={
        "num_gpus": 1,  # Solo 1 GPU
        "resources": {"node_id": "node_0"}
    }
)
class VLLMDeployment4B:
    def __init__(self):
        engine_args = AsyncEngineArgs(
            model="amsaravi/medgemma-4b-it:q8",
            tensor_parallel_size=1,  # 1 GPU
            gpu_memory_utilization=0.85,
            # ... resto de configuración
        )
        self.engine = AsyncLLMEngine.from_engine_args(engine_args)
```

**Ventajas:**
- Ambos modelos en nodo 0
- Margen de seguridad adecuado
- medgemma-27b sigue funcionando (aunque más lento con 3 GPUs)

**Desventajas:**
- medgemma-27b más lento (3 GPUs vs 4 GPUs)
- Configuración más compleja

#### Opción B: medgemma-27b con `gpu_memory_utilization=0.85` + medgemma-4b en Ollama

**Cálculo:**
- medgemma-27b: ~20.7 GB × 4 GPUs × 0.85/0.95 = ~18.5 GB × 4 = ~74 GB
- medgemma-4b (Ollama): ~5.0 GB (puede correr en CPU o 1 GPU)
- **Total:** ~79 GB (margen: ~13 GB)

**Implementación:**
```python
# Deployment 1: medgemma-27b con menos memoria
@serve.deployment(
    name="MedGemma27BNode0",
    num_replicas=1,
    ray_actor_options={
        "num_gpus": 4,
        "resources": {"node_id": "node_0"}
    }
)
class VLLMDeployment27B:
    def __init__(self):
        engine_args = AsyncEngineArgs(
            model="google/medgemma-27b-it",
            tensor_parallel_size=4,
            gpu_memory_utilization=0.85,  # Reducir a 85%
            # ... resto de configuración
        )
        self.engine = AsyncLLMEngine.from_engine_args(engine_args)

# Deployment 2: medgemma-4b con Ollama (separado, no vLLM)
# Esto requiere correr Ollama como servicio separado en el nodo 0
```

**Ventajas:**
- medgemma-27b mantiene 4 GPUs (mejor rendimiento)
- Ollama es más ligero que vLLM para modelos pequeños

**Desventajas:**
- Requiere Ollama corriendo en paralelo
- Dos sistemas diferentes (vLLM + Ollama)

**Recomendación:** ✅ **Factible** - Opción A es más limpia (todo en vLLM), Opción B es más simple (Ollama separado).

---

## 📋 Resumen de Estrategias

| Estrategia | Viabilidad | Complejidad | Rendimiento | Recomendación |
|------------|------------|-------------|-------------|---------------|
| **1A. Reducir a 0.90** | ✅ Viable | 🟢 Baja | 🟡 Medio | ✅ Recomendado (más seguro) |
| **1B. Reducir a 0.93** | ⚠️ Ajustado | 🟢 Baja | 🟢 Alto | ⚠️ Funciona pero con poco margen |
| **2. Excluir Nodo 0** | ✅ Factible | 🟡 Media | 🟢 Alto | ✅ Recomendado |
| **3A. 27B en 3 GPUs + 4B en 1 GPU** | ✅ Factible | 🟡 Media | 🟡 Medio | ✅ Recomendado |
| **3B. 27B 0.85 + 4B Ollama** | ✅ Factible | 🟢 Baja | 🟢 Alto | ✅ Recomendado |

---

## 🚀 Recomendación Final

### Opción Recomendada: **Estrategia 1A** (Reducir a 0.90) - **MÁS SIMPLE Y SEGURA**

**Razones:**
1. ✅ **Más simple:** Solo cambiar un parámetro
2. ✅ **Suficiente margen:** ~4.2 GB libres (más que suficiente para medgemma-4b)
3. ✅ **No requiere reconfiguración:** Mantiene la arquitectura actual
4. ✅ **Rápido de implementar:** Cambio mínimo en código
5. ✅ **Seguro:** Margen adecuado para evitar OOM

### Alternativa: **Estrategia 1B** (Reducir a 0.93) - **MÁS CONSERVADORA**

**Razones:**
1. ✅ **Más simple:** Solo cambiar un parámetro
2. ⚠️ **Margen ajustado:** ~1.44 GB libres (justo suficiente para medgemma-4b)
3. ✅ **No requiere reconfiguración:** Mantiene la arquitectura actual
4. ✅ **Mejor rendimiento:** Menor impacto en el modelo 27B (más KV cache)
5. ⚠️ **Riesgo:** Margen muy ajustado, mayor riesgo de OOM en picos de uso

**Recomendación entre 0.90 y 0.93:**
- **Usar 0.90** si priorizas seguridad y margen de error
- **Usar 0.93** si priorizas rendimiento del modelo 27B y estás dispuesto a aceptar el riesgo de margen ajustado

### Alternativa Recomendada: **Estrategia 3A** (27B en 3 GPUs + 4B en 1 GPU) - **MÁS SEGURA**

**Razones:**
1. ✅ **Mayor margen:** ~24.9 GB libres (más seguro)
2. ✅ **Mejor rendimiento:** medgemma-27b mantiene buen rendimiento en 3 GPUs
3. ✅ **Todo en vLLM:** Consistencia en la arquitectura
4. ✅ **Separación clara:** Cada modelo en sus GPUs dedicadas

### Implementación Detallada por Estrategia:

#### Estrategia 1: Reducir a 0.90 o 0.93 (MÁS SIMPLE)

**Opción A: Reducir a 0.90 (RECOMENDADA)**

**Pasos:**
1. Modificar `serve_medgemma.py`, línea 84:
   ```python
   gpu_memory_utilization=0.90,  # Cambiar de 0.95 a 0.90
   ```

2. Reiniciar el servicio vLLM

3. Montar medgemma-4b en Ollama o vLLM separado en el nodo 0

**Código exacto:**
```python
# vllm/serve_medgemma.py - Línea 79-89
engine_args = AsyncEngineArgs(
    model=MODEL_PATH,
    tensor_parallel_size=4,
    dtype="bfloat16",
    max_model_len=8192,
    gpu_memory_utilization=0.90,  # ← CAMBIO AQUÍ (de 0.95 a 0.90)
    enable_lora=False,
    enforce_eager=True,
    trust_remote_code=True,
    download_dir=MODELS_BASE_DIR,
)
```

**Ventajas:**
- ✅ Cambio mínimo (1 línea)
- ✅ No requiere reconfiguración de Ray
- ✅ Mantiene arquitectura actual
- ✅ Margen de seguridad adecuado (~4.2 GB)

**Desventajas:**
- ⚠️ Puede afectar rendimiento del modelo 27B (menos KV cache)

---

**Opción B: Reducir a 0.93 (MÁS CONSERVADORA)**

**Pasos:**
1. Modificar `serve_medgemma.py`, línea 84:
   ```python
   gpu_memory_utilization=0.93,  # Cambiar de 0.95 a 0.93
   ```

2. Reiniciar el servicio vLLM

3. Montar medgemma-4b en Ollama o vLLM separado en el nodo 0

**Código exacto:**
```python
# vllm/serve_medgemma.py - Línea 79-89
engine_args = AsyncEngineArgs(
    model=MODEL_PATH,
    tensor_parallel_size=4,
    dtype="bfloat16",
    max_model_len=8192,
    gpu_memory_utilization=0.93,  # ← CAMBIO AQUÍ (de 0.95 a 0.93)
    enable_lora=False,
    enforce_eager=True,
    trust_remote_code=True,
    download_dir=MODELS_BASE_DIR,
)
```

**Ventajas:**
- ✅ Cambio mínimo (1 línea)
- ✅ No requiere reconfiguración de Ray
- ✅ Mantiene arquitectura actual
- ✅ Menor impacto en rendimiento del modelo 27B (más KV cache)

**Desventajas:**
- ⚠️ Margen muy ajustado (~1.44 GB)
- ⚠️ Mayor riesgo de OOM si hay picos de uso

**Comparación:**

| Configuración | VRAM Libre | Margen | Impacto Rendimiento 27B | Recomendación |
|---------------|------------|--------|------------------------|---------------|
| **0.90** | ~9.20 GB | ~4.20 GB | Moderado | ✅ Recomendado |
| **0.93** | ~6.44 GB | ~1.44 GB | Mínimo | ⚠️ Ajustado |

---

#### Estrategia 2: Excluir Nodo 0 de vLLM

**Pasos:**
1. **Etiquetar nodo 0 en Ray cluster:**
   ```bash
   # Al iniciar Ray en nodo 0
   ray start --head --labels='{"node_type":"dedicated_27b"}'
   
   # Al iniciar Ray en nodos 1-15
   ray start --address=<head-node-address> --labels='{"node_type":"vllm_worker"}'
   ```

2. **Modificar `serve_medgemma.py` para crear dos deployments:**
   ```python
   # Deployment para nodos 1-15 (excluye nodo 0)
   @serve.deployment(
       name="MedGemma27BDeployment",
       autoscaling_config={
           "min_replicas": 1,
           "max_replicas": 15,  # Solo 15 nodos
           "target_ongoing_requests": 5
       },
       ray_actor_options={
           "num_gpus": 4,
           "resources": {"node_type": "vllm_worker"}  # Solo nodos 1-15
       }
   )
   class VLLMDeploymentNodes1_15:
       # ... código actual ...
       pass
   
   # Deployment para nodo 0 (solo medgemma-27b, sin autoscaling)
   @serve.deployment(
       name="MedGemma27BNode0Deployment",
       num_replicas=1,  # Solo 1 réplica en nodo 0
       ray_actor_options={
           "num_gpus": 4,
           "resources": {"node_type": "dedicated_27b"}  # Solo nodo 0
       }
   )
   class VLLMDeploymentNode0:
       # ... código actual ...
       pass
   ```

3. **Montar medgemma-4b en nodo 0** (Ollama o vLLM separado)

**Ventajas:**
- ✅ Nodo 0 dedicado exclusivamente a medgemma-27b
- ✅ Nodos 1-15 pueden usar autoscaling completo
- ✅ Separación clara de recursos

**Desventajas:**
- ⚠️ Requiere reconfiguración de Ray cluster
- ⚠️ Más complejo de mantener

---

#### Estrategia 3A: 27B en 3 GPUs + 4B en 1 GPU (MÁS SEGURA)

**Pasos:**
1. **Modificar `serve_medgemma.py` para crear dos deployments en nodo 0:**
   ```python
   # Deployment 1: medgemma-27b en 3 GPUs (nodo 0)
   @serve.deployment(
       name="MedGemma27BNode0",
       num_replicas=1,
       ray_actor_options={
           "num_gpus": 3,  # Solo 3 GPUs
           "resources": {"node_type": "dedicated_27b"}  # Solo nodo 0
       }
   )
   class VLLMDeployment27B:
       def __init__(self):
           engine_args = AsyncEngineArgs(
               model="google/medgemma-27b-it",
               tensor_parallel_size=3,  # 3 GPUs en lugar de 4
               dtype="bfloat16",
               max_model_len=8192,
               gpu_memory_utilization=0.90,
               enable_lora=False,
               enforce_eager=True,
               trust_remote_code=True,
           )
           self.engine = AsyncLLMEngine.from_engine_args(engine_args)
       # ... resto del código ...
   
   # Deployment 2: medgemma-4b en 1 GPU (nodo 0)
   @serve.deployment(
       name="MedGemma4BNode0",
       num_replicas=1,
       ray_actor_options={
           "num_gpus": 1,  # Solo 1 GPU
           "resources": {"node_type": "dedicated_27b"}  # Solo nodo 0
       }
   )
   class VLLMDeployment4B:
       def __init__(self):
           engine_args = AsyncEngineArgs(
               model="amsaravi/medgemma-4b-it:q8",
               tensor_parallel_size=1,  # 1 GPU
               dtype="bfloat16",
               max_model_len=8192,
               gpu_memory_utilization=0.85,
               enable_lora=False,
               enforce_eager=True,
               trust_remote_code=True,
           )
           self.engine = AsyncLLMEngine.from_engine_args(engine_args)
       # ... resto del código ...
   ```

2. **Mantener deployment para nodos 1-15:**
   ```python
   @serve.deployment(
       name="MedGemma27BDeployment",
       autoscaling_config={
           "min_replicas": 1,
           "max_replicas": 15,
           "target_ongoing_requests": 5
       },
       ray_actor_options={
           "num_gpus": 4,
           "resources": {"node_type": "vllm_worker"}  # Solo nodos 1-15
       }
   )
   class VLLMDeploymentNodes1_15:
       # ... código actual con tensor_parallel_size=4 ...
       pass
   ```

3. **Configurar routing en el frontend/API:**
   - Peticiones a medgemma-4b → `MedGemma4BNode0` (nodo 0)
   - Peticiones a medgemma-27b → `MedGemma27BDeployment` (nodos 1-15) o `MedGemma27BNode0` (nodo 0)

**Ventajas:**
- ✅ Mayor margen de seguridad (~24.9 GB libres)
- ✅ Ambos modelos en el mismo nodo
- ✅ Todo en vLLM (consistencia)

**Desventajas:**
- ⚠️ medgemma-27b más lento (3 GPUs vs 4 GPUs)
- ⚠️ Configuración más compleja

---

#### Estrategia 3B: 27B 0.85 + 4B Ollama

**Pasos:**
1. **Modificar `serve_medgemma.py` para nodo 0:**
   ```python
   # Deployment para nodo 0 con menos memoria
   @serve.deployment(
       name="MedGemma27BNode0",
       num_replicas=1,
       ray_actor_options={
           "num_gpus": 4,
           "resources": {"node_type": "dedicated_27b"}
       }
   )
   class VLLMDeployment27B:
       def __init__(self):
           engine_args = AsyncEngineArgs(
               model="google/medgemma-27b-it",
               tensor_parallel_size=4,
               gpu_memory_utilization=0.85,  # Reducir a 85%
               # ... resto de configuración ...
           )
           self.engine = AsyncLLMEngine.from_engine_args(engine_args)
   ```

2. **Instalar y correr Ollama en nodo 0:**
   ```bash
   # Instalar Ollama
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Correr medgemma-4b
   ollama run amsaravi/medgemma-4b-it:q8
   ```

3. **Configurar API para enrutar peticiones:**
   - medgemma-27b → vLLM deployment
   - medgemma-4b → Ollama API

**Ventajas:**
- ✅ medgemma-27b mantiene 4 GPUs (mejor rendimiento)
- ✅ Ollama es más ligero para modelos pequeños
- ✅ Separación de sistemas

**Desventajas:**
- ⚠️ Requiere Ollama corriendo en paralelo
- ⚠️ Dos sistemas diferentes (vLLM + Ollama)

---

## ⚠️ Consideraciones Importantes

1. **Identificación de Nodo 0:**
   - Ray necesita identificar qué nodo es el "nodo 0"
   - Usar hostname, IP, o labels de Ray cluster

2. **Routing de Peticiones:**
   - El frontend/API necesita saber a qué deployment enviar cada petición
   - Considerar usar diferentes endpoints o headers

3. **Monitoreo:**
   - Monitorear VRAM en tiempo real después de implementar
   - Ajustar `gpu_memory_utilization` si es necesario

4. **Pruebas:**
   - Probar con carga real antes de producción
   - Verificar que no hay OOM errors

---

## 📝 Próximos Pasos (Sin Implementar Aún)

1. ✅ Analizar estrategias (COMPLETADO)
2. ⏳ Decidir qué estrategia implementar
3. ⏳ Modificar `serve_medgemma.py` según estrategia elegida
4. ⏳ Configurar Ray cluster con labels/placement groups
5. ⏳ Modificar routing en frontend/API
6. ⏳ Probar y monitorear

