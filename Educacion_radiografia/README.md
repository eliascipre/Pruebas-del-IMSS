# Sistema de Educación Radiológica - Construido con MedGemma

## 🩺 Descripción General

Este proyecto es una aplicación web educativa diseñada para mejorar el aprendizaje en radiología mediante la interacción inteligente con imágenes médicas y reportes radiológicos. Utiliza el modelo MedGemma-4B de Google para proporcionar explicaciones detalladas y contextualizadas de términos médicos y hallazgos radiológicos.

## 🚀 Características Principales

### Interfaz Interactiva
- **Selección de Casos**: Interfaz con pestañas para casos de Rayos X (CXR) y Tomografía Computarizada (CT)
- **Visualización de Imágenes**: Visualización clara de imágenes radiológicas con anotaciones contextuales
- **Texto Interactivo**: Reportes radiológicos con oraciones clickeables para obtener explicaciones detalladas
- **Explicaciones Dinámicas**: Panel flotante que proporciona explicaciones en tiempo real

### Funcionalidades del Sistema
- **Análisis Multimodal**: Combina análisis de texto e imagen para explicaciones precisas
- **Cache Inteligente**: Sistema de caché para optimizar respuestas y reducir latencia
- **Interfaz Responsiva**: Diseño adaptativo para diferentes dispositivos
- **Sistema de Errores**: Manejo robusto de errores con mensajes informativos

## 🏗️ Arquitectura del Sistema

### Backend (Flask)
```
app.py                 # Punto de entrada principal de la aplicación
routes.py              # Rutas y lógica de endpoints
config.py              # Configuración y carga de datos
llm_client.py          # Cliente para API externa de MedGemma
local_llm_client.py    # Cliente para MedGemma local (LM Studio)
utils.py               # Utilidades para procesamiento de imágenes
cache_store.py         # Sistema de caché con diskcache
```

### Frontend
```
templates/index.html   # Plantilla principal de la interfaz
static/css/style.css   # Estilos y diseño responsivo
static/js/demo.js      # Lógica JavaScript para interactividad
static/images/         # Imágenes radiológicas de ejemplo
static/reports/        # Reportes de texto correspondientes
```

### Datos
```
static/reports_manifest.csv  # Configuración de casos disponibles
```

## 🔧 Configuración y Instalación

### Requisitos del Sistema
- Python 3.10+
- Docker (opcional)
- LM Studio o API de MedGemma

### Dependencias
```
flask          # Framework web
gunicorn       # Servidor WSGI
Pillow         # Procesamiento de imágenes
diskcache      # Sistema de caché
requests       # Cliente HTTP
```

### Instalación Local

1. **Clonar el repositorio**:
```bash
git clone <repository-url>
cd Educacion_radiografia
```

2. **Instalar dependencias**:
```bash
pip install -r requirements.txt
```

3. **Configurar MedGemma local**:
   - Instalar LM Studio
   - Cargar el modelo MedGemma-4B
   - Iniciar el servidor en `localhost:1234`

4. **Ejecutar la aplicación**:
```bash
python app.py
```

### Instalación con Docker

1. **Construir la imagen**:
```bash
docker build -t educacion-radiologia .
```

2. **Ejecutar el contenedor**:
```bash
docker run -p 7860:7860 educacion-radiologia
```

## 📊 Casos de Estudio Incluidos

El sistema incluye 6 casos de estudio preconfigurados:

| Tipo | Nombre del Caso | Descripción |
|------|----------------|-------------|
| CT | Tumor | Caso de tumor en tomografía computarizada |
| CXR | Effusion | Derrame pleural en radiografía de tórax |
| CXR | Infection | Infección pulmonar |
| CXR | Lymphadenopathy | Linfadenopatía |
| CXR | Nodule A | Nódulo pulmonar (caso A) |
| CXR | Nodule B | Nódulo pulmonar (caso B) |

## 🔄 Flujo de Trabajo

### 1. Inicialización
- La aplicación carga la configuración desde `reports_manifest.csv`
- Se inicializa el cliente LLM (local o remoto)
- Se configura el sistema de caché

### 2. Selección de Caso
- El usuario selecciona un caso desde las pestañas de navegación
- Se cargan la imagen y el reporte correspondiente
- Se actualiza la interfaz con la información del caso

### 3. Interacción Educativa
- El usuario hace clic en cualquier oración del reporte
- El sistema envía la oración y la imagen al modelo MedGemma
- Se genera una explicación contextualizada
- La explicación se muestra en el panel flotante

### 4. Procesamiento de Respuestas
- Las respuestas se procesan en streaming para mejor UX
- Se implementa caché para respuestas frecuentes
- Manejo de errores y estados de carga

## 🎯 Características Técnicas

### Sistema de Caché
- Utiliza `diskcache` para almacenar respuestas frecuentes
- Claves de caché basadas en reporte y oración
- Persistencia entre sesiones

### Procesamiento de Imágenes
- Conversión automática a Base64 para API
- Soporte para múltiples formatos de imagen
- Validación de archivos antes del procesamiento

### Manejo de Errores
- Validación de archivos y configuraciones
- Mensajes de error informativos
- Recuperación automática de fallos

## 🌐 API Endpoints

### `GET /`
- Página principal con selección de casos

### `GET /get_report_details/<report_name>`
- Obtiene detalles de un reporte específico
- Retorna: texto del reporte, ruta de imagen, tipo de imagen

### `POST /explain`
- Genera explicación para una oración específica
- Parámetros: `sentence`, `report_name`
- Retorna: explicación generada por MedGemma

### `GET /download_cache`
- Descarga el directorio de caché como archivo ZIP

## 🔧 Configuración Avanzada

### Variables de Entorno
```bash
HF_TOKEN=your_huggingface_token          # Para API remota
MEDGEMMA_ENDPOINT_URL=your_endpoint_url  # URL del endpoint
CACHE_DIR=/path/to/cache                 # Directorio de caché
```

### Personalización de Casos
Para agregar nuevos casos, edita `static/reports_manifest.csv`:
```csv
image_type,case_display_name,image_path,report_path
CXR,Nuevo Caso,static/images/nuevo.jpg,static/reports/nuevo.txt
```

## 🚀 Despliegue

### Desarrollo Local
```bash
python app.py
# Acceder a http://localhost:7860
```

### Producción con Gunicorn
```bash
gunicorn --bind 0.0.0.0:7860 --workers 1 --threads 4 app:app
```

### Docker
```bash
docker run -p 7860:7860 --env-file env.list educacion-radiologia
```

## 📝 Notas de Desarrollo

### Estructura de Archivos
- **Backend**: Lógica de negocio y API
- **Frontend**: Interfaz de usuario y interactividad
- **Static**: Recursos estáticos y datos
- **Templates**: Plantillas HTML

### Mejoras Futuras
- [ ] Traducción completa de la interfaz al español
- [ ] Soporte para más tipos de imágenes médicas
- [ ] Sistema de autenticación de usuarios
- [ ] Análisis de progreso del aprendizaje
- [ ] Integración con bases de datos médicas

## ⚠️ Disclaimer

Esta demostración es únicamente para fines educativos e ilustrativos. No representa un producto terminado o aprobado, no está destinado a diagnosticar o sugerir tratamiento de ninguna enfermedad o condición, y no debe ser utilizado para consejo médico. Cualquier aplicación del mundo real requeriría desarrollo, entrenamiento y adaptación adicionales.

## 📚 Enlaces Útiles

- [MedGemma en HuggingFace](https://huggingface.co/collections/google/medgemma-release-680aade845f90bec6a3f60c4)
- [MedGemma DevSite](https://developers.google.com/health-ai-developer-foundations/medgemma)
- [MedGemma ModelGarden](https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/medgemma)
- [HAI-DEF Models](https://developers.google.com/health-ai-developer-foundations)

## 📄 Licencia

Licenciado bajo Apache License 2.0. Ver archivo LICENSE para más detalles.
