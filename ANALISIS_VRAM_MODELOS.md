# Análisis de VRAM y Viabilidad de Modelos

**Fecha:** 8 de Noviembre 2025, 20:31  
**Estado del Sistema:** Modelo vLLM activo con tensor_parallel_size=4

## 📊 Estado Actual de VRAM

### Consumo de VRAM por Nodo

**Tu nodo tiene 4 GPUs (NVIDIA A10 con 23 GB cada una)**

| Componente | Consumo por GPU | Consumo Total (4 GPUs) |
|------------|-----------------|------------------------|
| **Workers vLLM** | ~20,730 MiB (~20.2 GB) | **82,920 MiB (~80.98 GB)** |
| **Proceso Python** | ~500 MiB | **~2,000 MiB (~1.95 GB)** |
| **Total por Nodo** | ~21,200 MiB (~20.7 GB) | **~84,920 MiB (~82.9 GB)** |

**Resumen:**
- **Consumo por nodo (4 GPUs):** ~82.9 GB
- **Consumo por réplica:** ~81 GB (1 réplica usa 4 GPUs con `tensor_parallel_size=4`)
- **Consumo por GPU individual:** ~20.7 GB

### Distribución de Memoria por GPU

| GPU | Memoria Usada | Memoria Total | Memoria Libre | Estado |
|-----|---------------|---------------|---------------|--------|
| 0   | 22,483 MiB    | 23,028 MiB    | **32 MiB**    | 🔴 Crítico |
| 1   | 21,259 MiB    | 23,028 MiB    | **1,256 MiB** | 🟡 Bajo |
| 2   | 21,261 MiB    | 23,028 MiB    | **1,254 MiB** | 🟡 Bajo |
| 3   | 21,151 MiB    | 23,028 MiB    | **1,364 MiB** | 🟡 Bajo |
| **Total** | **86,154 MiB** | **92,112 MiB** | **~3,906 MiB (~3.8 GB)** | ⚠️ |

### Procesos Activos

- **Modelo vLLM corriendo:** `tensor_parallel_size=4`
  - Worker_TP0: 20,730 MiB (GPU 0)
  - Worker_TP1: 20,730 MiB (GPU 1)
  - Worker_TP2: 20,730 MiB (GPU 2)
  - Worker_TP3: 20,730 MiB (GPU 3)
  - **Total workers vLLM:** 82,920 MiB (~80.98 GB)
- **Proceso Python adicional:** ~2,000 MiB distribuido

## 🤔 ¿Es Posible Correr los Modelos de Ollama?

### 1. `medgemma-27b-it:q8` (29 GB)

**❌ NO ES POSIBLE** con la configuración actual

**Razones:**
- Requiere ~29 GB de VRAM libre
- Solo hay ~3.9 GB disponibles
- Necesitarías liberar ~25 GB adicionales
- Con `tensor_parallel_size=4`, se distribuiría en 4 GPUs (~7.25 GB por GPU)
- Cada GPU solo tiene ~1.2 GB libre

**Solución:**
- Detener completamente el modelo actual
- Liberar toda la VRAM
- Luego cargar el modelo de 27B

### 2. `medgemma-4b-it:q8` (5.0 GB)

**⚠️ TÉCNICAMENTE POSIBLE, pero requiere cambios**

**Requisitos:**
- Necesita ~5.0 GB de VRAM libre
- Con `tensor_parallel_size=4`: ~1.25 GB por GPU
- Con `gpu_memory_utilization=0.95`: ~5.2 GB totales necesarios

**Problemas actuales:**
- Solo hay ~3.9 GB libres (insuficiente)
- GPU 0 tiene solo 32 MiB libres (crítico)

**Soluciones:**

#### Opción A: Detener modelo actual y cargar el 4B
```bash
# Detener el servicio actual
# Luego cargar medgemma-4b-it:q8
```

#### Opción B: Ajustar configuración para modelo más pequeño
- Reducir `gpu_memory_utilization` a 0.85-0.90
- Considerar `tensor_parallel_size=2` (2 GPUs en lugar de 4)
- Esto liberaría 2 GPUs para otros usos

## 📈 Comportamiento de VRAM con Más Peticiones

### Respuesta Corta: **NO aumenta el consumo de VRAM por petición**

### Explicación Detallada:

El consumo de VRAM en vLLM es **fijo por réplica**, no por petición:

1. **Carga del Modelo (una vez por réplica):**
   - Cada réplica carga el modelo completo en memoria
   - Esto consume ~20.7 GB × 4 GPUs = ~82.8 GB por réplica
   - **Este consumo NO cambia** con más peticiones

2. **Procesamiento de Peticiones:**
   - Las peticiones se procesan en **colas** dentro de la misma réplica
   - vLLM usa **PagedAttention** para manejar múltiples peticiones eficientemente
   - El consumo adicional es **mínimo** (solo tokens activos)

3. **Autoscaling:**
   - Con más peticiones, Ray Serve crea **nuevas réplicas**
   - Cada réplica nueva consume ~82.8 GB adicionales
   - Pero esto es **escalado horizontal**, no aumento de VRAM por petición

### Configuración Actual del Autoscaling:

```python
autoscaling_config={
    "min_replicas": 2,     # 2 réplicas siempre activas = ~165.6 GB
    "max_replicas": 16,    # Hasta 16 réplicas = ~1,324.8 GB
    "target_ongoing_requests": 5  # Nueva réplica si hay 5+ peticiones en cola
}
```

**Implicaciones:**
- **Con 1 réplica:** ~82.8 GB (4 GPUs)
- **Con 2 réplicas (mínimo):** ~165.6 GB (8 GPUs)
- **Con 16 réplicas (máximo):** ~1,324.8 GB (64 GPUs)

**⚠️ IMPORTANTE:** Con tu configuración actual, el autoscaling **NO puede funcionar** porque:
- Solo tienes 4 GPUs disponibles
- Cada réplica necesita 4 GPUs (`num_gpus=4`)
- Solo puedes tener **1 réplica activa** con 4 GPUs

## 🔧 Recomendaciones

### Para Correr `medgemma-4b-it:q8`:

1. **Detener el modelo actual:**
   ```bash
   # Detener el servicio vLLM actual
   ```

2. **Ajustar configuración para modelo más pequeño:**
   ```python
   engine_args = AsyncEngineArgs(
       model="amsaravi/medgemma-4b-it:q8",  # Modelo más pequeño
       tensor_parallel_size=2,  # Reducir a 2 GPUs
       dtype="bfloat16",
       max_model_len=8192,
       gpu_memory_utilization=0.85,  # Reducir a 85% para margen
       # ... resto de configuración
   )
   ```

3. **Ajustar autoscaling:**
   ```python
   autoscaling_config={
       "min_replicas": 1,     # 1 réplica mínima
       "max_replicas": 2,     # Máximo 2 réplicas (4 GPUs / 2 GPUs por réplica)
       "target_ongoing_requests": 3
   },
   ray_actor_options={
       "num_gpus": 2,  # Cambiar a 2 GPUs por réplica
   }
   ```

### Para Optimizar el Modelo Actual (27B):

1. **Reducir `gpu_memory_utilization`:**
   ```python
   gpu_memory_utilization=0.90,  # De 0.95 a 0.90
   ```
   Esto liberaría ~1 GB por GPU (~4 GB total)

2. **Ajustar autoscaling:**
   ```python
   autoscaling_config={
       "min_replicas": 1,     # Solo 1 réplica (no puedes tener más con 4 GPUs)
       "max_replicas": 1,     # Máximo 1 réplica
       "target_ongoing_requests": 10  # Aumentar umbral
   }
   ```

3. **Considerar `tensor_parallel_size=2`:**
   - Esto permitiría 2 réplicas simultáneas
   - Pero cada réplica sería más lenta
   - Útil si tienes muchas peticiones concurrentes

## 📝 Resumen

| Modelo | Tamaño | VRAM Necesaria | VRAM Disponible | ¿Posible? |
|--------|--------|----------------|-----------------|-----------|
| medgemma-27b-it:q8 | 29 GB | ~29 GB | ~3.9 GB | ❌ No |
| medgemma-4b-it:q8 | 5.0 GB | ~5.2 GB | ~3.9 GB | ⚠️ Con cambios |

**Consumo de VRAM con más peticiones:**
- ✅ **NO aumenta** por petición
- ✅ **Fijo por réplica** (~82.8 GB por réplica)
- ⚠️ **Aumenta con nuevas réplicas** (autoscaling)

**Recomendación final:**
- Para correr `medgemma-4b-it:q8`: Detener modelo actual y ajustar configuración
- Para optimizar modelo actual: Reducir `gpu_memory_utilization` y ajustar autoscaling

