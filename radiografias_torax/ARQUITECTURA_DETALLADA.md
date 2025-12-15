# Documentación de Arquitectura - Radiology Learning Companion

## Resumen del Proyecto

El **Radiology Learning Companion** es una aplicación web educativa diseñada para ayudar a estudiantes de medicina a mejorar sus habilidades de interpretación de radiografías de tórax (CXR). La aplicación utiliza MedGemma, un modelo de IA multimodal, para crear una experiencia de aprendizaje interactiva.

## Arquitectura General

### Componentes Principales

1. **Frontend (React)**: Interfaz de usuario interactiva
2. **Backend (Flask)**: Servidor API y lógica de negocio
3. **Sistema RAG**: Recuperación de información basada en guías clínicas
4. **Cache Persistente**: Almacenamiento de preguntas y respuestas generadas
5. **Modelo MedGemma**: IA multimodal para análisis de imágenes médicas

### Diagrama de Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   RAG System    │
│   (React)       │◄──►│   (Flask)       │◄──►│   (Knowledge    │
│                 │    │                 │    │    Base)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Cache         │    │   MedGemma      │
                       │   (DiskCache)   │    │   (LM Studio)   │
                       └─────────────────┘    └─────────────────┘
```

## Estructura Detallada del Proyecto

### Backend (`/backend/`)

#### Archivos Principales

- **`app.py`**: Punto de entrada principal de la aplicación Flask
- **`config.py`**: Configuración de la aplicación y variables de entorno
- **`routes.py`**: Definición de endpoints de la API
- **`cache_manager.py`**: Gestión del cache persistente
- **`llm_client.py`**: Cliente para comunicación con MedGemma
- **`local_llm_client.py`**: Implementación local del cliente LLM

#### Sistema RAG (`/backend/rag/`)

- **`knowledge_base.py`**: Construcción y gestión de la base de conocimiento
- **`model_manager.py`**: Gestión de modelos de embedding
- **`rag_context_engine.py`**: Motor de recuperación de contexto
- **`siglip_embedder.py`**: Modelo de embedding para imágenes

#### Datos (`/backend/data/`)

- **`reports_manifest.csv`**: Metadatos de casos de radiografías
- **`reports/`**: Reportes de casos individuales
- **`who_chestxray_guideline_9241546778_eng.pdf`**: Guías clínicas de la OMS

### Frontend (`/frontend/`)

#### Estructura de Componentes

- **`App.jsx`**: Componente principal de la aplicación
- **`screens/`**: Pantallas principales de la aplicación
  - `LandingScreen.jsx`: Pantalla de inicio
  - `JourneySelectionScreen.jsx`: Selección de casos
  - `ChatScreen.jsx`: Interfaz de chat interactivo
  - `SummaryScreen.jsx`: Resumen del aprendizaje
- **`components/`**: Componentes reutilizables
  - `ChatMessage.jsx`: Mensajes del chat
  - `MCQOption.jsx`: Opciones de preguntas múltiples
  - `DetailsOverlay.jsx`: Overlay de detalles

## Flujo de Funcionamiento

### 1. Inicialización del Sistema

```python
# app.py - create_app()
def create_app():
    # 1. Configurar cliente LLM
    application.config["LLM_CLIENT"] = _get_llm_client()
    
    # 2. Cargar casos disponibles
    application.config["AVAILABLE_REPORTS"] = case_util.get_available_reports()
    
    # 3. Inicializar cache
    _initialize_demo_cache(application)
    
    # 4. Inicializar sistema RAG en background
    task_manager.start_task(key="rag_system", target_func=_initialize_rag_system)
```

### 2. Proceso de Aprendizaje

1. **Selección de Caso**: El usuario selecciona una radiografía de tórax
2. **Generación de Preguntas**: El sistema genera preguntas MCQ basadas en:
   - La imagen de la radiografía
   - Guías clínicas (RAG)
   - Contexto médico relevante
3. **Interacción**: El usuario responde las preguntas
4. **Análisis**: MedGemma analiza las respuestas
5. **Resumen**: Se genera un resumen educativo personalizado

### 3. Sistema de Cache

```python
# cache_manager.py
class CacheManager:
    def get_all_mcqs_sequence(self, case_id: str) -> list[ClinicalMCQ]:
        # Recupera preguntas desde cache
    
    def add_all_mcqs_to_case(self, case_id: str, all_mcqs: list[ClinicalMCQ]):
        # Almacena preguntas en cache
```

## Configuración y Variables de Entorno

### Variables Principales

```bash
# env.list
EMBEDDING_MODEL_ID=jinaai/jina-embeddings-v2-base-es
USE_CACHE=true
RANDOMIZE_CHOICES=true
CACHE_DIR=./persistent_cache
```

### Configuración de MedGemma

- **Ubicación**: LM Studio (localhost:1234)
- **Modelo**: MedGemma-4B
- **Endpoint**: `http://localhost:1234/v1/chat/completions`

## API Endpoints

### Principales Endpoints

1. **`GET /api/case/stub`**: Obtener lista de casos disponibles
2. **`GET /api/case/<case_id>/stub`**: Obtener detalles de un caso específico
3. **`GET /api/case/<case_id>/all-questions`**: Generar preguntas MCQ para un caso
4. **`POST /api/case/<case_id>/summarize`**: Generar resumen del aprendizaje
5. **`GET /app/download_cache`**: Descargar cache del sistema

## Características Técnicas

### Multimodalidad
- **Entrada**: Imágenes CXR + texto clínico
- **Procesamiento**: MedGemma analiza tanto imagen como contexto
- **Salida**: Preguntas educativas contextualizadas

### Sistema RAG
- **Base de Conocimiento**: Guías clínicas de la OMS
- **Embeddings**: Modelo Jina para texto en español
- **Recuperación**: Contexto relevante para cada caso

### Cache Inteligente
- **Persistencia**: Almacenamiento en disco usando DiskCache
- **Optimización**: Evita regeneración de preguntas
- **Eficiencia**: Respuestas rápidas para casos conocidos

## Instalación y Ejecución

### Prerrequisitos
- Docker
- LM Studio con MedGemma-4B
- Python 3.11+

### Ejecución Local

```bash
# 1. Configurar variables de entorno
cp env.list.example env.list

# 2. Ejecutar con Docker
./run_local.sh

# 3. Acceder a la aplicación
# http://localhost:7860
```

### Verificación de Configuración

```bash
# Verificar LM Studio y MedGemma
python backend/check_config.py
```

## Casos de Uso

### Para Estudiantes de Medicina
- Aprendizaje interactivo de interpretación radiológica
- Evaluación de conocimientos con feedback inmediato
- Acceso a guías clínicas contextualizadas

### Para Desarrolladores
- Ejemplo de implementación de IA multimodal en medicina
- Integración de sistemas RAG con modelos de lenguaje
- Arquitectura escalable para aplicaciones educativas

## Consideraciones de Seguridad

- **Disclaimer**: Solo para fines educativos y demostrativos
- **No Clínico**: No debe usarse para diagnóstico real
- **Datos**: Imágenes no-DICOM para demostración

## Extensibilidad

### Nuevos Casos
- Agregar imágenes CXR en `/backend/data/images/`
- Actualizar `reports_manifest.csv`
- El sistema generará automáticamente preguntas

### Nuevas Guías
- Reemplazar PDF en `/backend/data/`
- El sistema RAG se adaptará automáticamente

### Personalización
- Modificar prompts en `/backend/prompts.py`
- Ajustar configuración en `/backend/config.py`
- Personalizar UI en `/frontend/src/`

## Monitoreo y Logs

- **Logs**: Sistema de logging integrado con Flask
- **Métricas**: Estadísticas de cache y rendimiento
- **Debug**: Modo debug disponible para desarrollo

## Conclusión

El Radiology Learning Companion demuestra cómo la IA multimodal puede revolucionar la educación médica, proporcionando una experiencia de aprendizaje interactiva y personalizada que combina análisis de imágenes, conocimiento clínico y retroalimentación educativa.
