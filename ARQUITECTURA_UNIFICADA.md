# 🏗️ Arquitectura Unificada IMSS - Suite de IA Médica

## 📋 Visión General

Esta arquitectura unifica todos los proyectos IMSS en un solo sistema desplegable con microservicios, evitando conflictos de puertos y proporcionando una experiencia de usuario integrada.

## 🎯 Estructura de Microservicios

### **1. Gateway Principal (Next.js)**
- **Puerto**: 3000
- **Función**: Frontend unificado y proxy reverso
- **Rutas**:
  - `/` - Landing page principal
  - `/chat` - Chatbot principal (redirige a servicio-chat)
  - `/educacion-radiografia` - Proxy a servicio-educacion
  - `/simulacion` - Proxy a servicio-simulacion  
  - `/radiografias-torax` - Proxy a servicio-radiografias

### **2. Servicio Chatbot (Flask)**
- **Puerto**: 5001
- **Función**: Chatbot principal de IA médica
- **Endpoints**:
  - `/api/chat` - Conversación con MedGemma
  - `/api/health` - Health check

### **3. Servicio Educación Radiológica (Flask)**
- **Puerto**: 5002
- **Función**: Sistema educativo interactivo
- **Endpoints**:
  - `/api/reports` - Lista de reportes disponibles
  - `/api/reports/<id>` - Detalles de reporte específico
  - `/api/explain` - Explicación de términos médicos

### **4. Servicio Simulación (Flask)**
- **Puerto**: 5003
- **Función**: Simulador de entrevistas médicas
- **Endpoints**:
  - `/api/patients` - Lista de pacientes virtuales
  - `/api/stream_conversation` - Streaming de entrevista
  - `/api/evaluate_report` - Evaluación de reportes

### **5. Servicio Radiografías (Flask + React)**
- **Puerto**: 5004
- **Función**: Análisis de radiografías con RAG
- **Endpoints**:
  - `/api/cases` - Casos disponibles
  - `/api/cases/<id>/questions` - Generación de preguntas MCQ
  - `/api/cases/<id>/analyze` - Análisis de radiografía

## 🔄 Flujo de Datos

```
Usuario → Gateway (Next.js:3000) → Microservicio Específico (Flask:500X)
```

### **Ejemplo de Flujo Completo:**
1. Usuario accede a `http://localhost:3000/radiografias-torax`
2. Gateway Next.js sirve la página principal
3. Frontend hace llamadas a `/api/cases` 
4. Gateway proxy las llamadas a `http://servicio-radiografias:5004/api/cases`
5. Servicio procesa y retorna datos
6. Frontend muestra la interfaz

## 🐳 Configuración Docker

### **Docker Compose Principal**
```yaml
version: '3.8'
services:
  gateway:
    build: ./UI_IMSS
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      - servicio-chatbot
      - servicio-educacion
      - servicio-simulacion
      - servicio-radiografias

  servicio-chatbot:
    build: ./servicios/chatbot
    ports:
      - "5001:5001"
    environment:
      - FLASK_ENV=production
      - MEDGEMMA_ENDPOINT=${MEDGEMMA_ENDPOINT}

  servicio-educacion:
    build: ./servicios/educacion-radiografia
    ports:
      - "5002:5002"
    environment:
      - FLASK_ENV=production
      - LM_STUDIO_URL=${LM_STUDIO_URL}

  servicio-simulacion:
    build: ./servicios/simulacion
    ports:
      - "5003:5003"
    environment:
      - FLASK_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GCP_MEDGEMMA_ENDPOINT=${GCP_MEDGEMMA_ENDPOINT}

  servicio-radiografias:
    build: ./servicios/radiografias-torax
    ports:
      - "5004:5004"
    environment:
      - FLASK_ENV=production
      - LM_STUDIO_URL=${LM_STUDIO_URL}
      - CHROMA_DB_PATH=/app/data/chroma_db
    volumes:
      - ./data/chroma_db:/app/data/chroma_db
```

## ☸️ Configuración Kubernetes

### **Namespace y ConfigMaps**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: imss-ai-suite

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: imss-config
  namespace: imss-ai-suite
data:
  MEDGEMMA_ENDPOINT: "https://your-medgemma-endpoint"
  LM_STUDIO_URL: "http://lm-studio:1234"
  GEMINI_API_KEY: "your-gemini-key"
```

### **Deployments y Services**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
  namespace: imss-ai-suite
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: imss/gateway:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: imss-config

---
apiVersion: v1
kind: Service
metadata:
  name: gateway-service
  namespace: imss-ai-suite
spec:
  selector:
    app: gateway
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 🔧 Implementación Paso a Paso

### **Paso 1: Reestructurar Directorios**
```
IMSS/
├── gateway/                    # UI_IMSS renombrado
│   ├── app/
│   ├── components/
│   ├── public/
│   └── package.json
├── servicios/
│   ├── chatbot/               # Nuevo servicio unificado
│   ├── educacion-radiografia/ # Movido desde Educacion_radiografia/
│   ├── simulacion/           # Movido desde Simulacion/
│   └── radiografias-torax/   # Movido desde radiografias_torax/
├── shared/                    # Recursos compartidos
│   ├── models/
│   ├── utils/
│   └── config/
├── docker-compose.yml
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── deployments.yaml
│   └── services.yaml
└── scripts/
    ├── start-local.sh
    └── deploy-k8s.sh
```

### **Paso 2: Crear Gateway con Proxy**
```typescript
// gateway/app/api/proxy/[...path]/route.ts
import { NextRequest } from 'next/server'

const SERVICE_URLS = {
  chatbot: 'http://servicio-chatbot:5001',
  educacion: 'http://servicio-educacion:5002',
  simulacion: 'http://servicio-simulacion:5003',
  radiografias: 'http://servicio-radiografias:5004'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const [service, ...path] = params.path
  const serviceUrl = SERVICE_URLS[service as keyof typeof SERVICE_URLS]
  
  if (!serviceUrl) {
    return new Response('Service not found', { status: 404 })
  }

  const url = new URL(request.url)
  const targetUrl = `${serviceUrl}/api/${path.join('/')}${url.search}`
  
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  })
  
  return response
}
```

### **Paso 3: Adaptar Servicios**
Cada servicio Flask se adapta para:
- Usar puertos únicos (5001-5004)
- Exponer solo endpoints `/api/*`
- Configuración mediante variables de entorno
- Health checks en `/api/health`

### **Paso 4: Scripts de Despliegue**
```bash
#!/bin/bash
# scripts/start-local.sh

echo "🚀 Iniciando Suite IMSS..."

# Verificar dependencias
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado"
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cat > .env << EOF
MEDGEMMA_ENDPOINT=https://your-medgemma-endpoint
LM_STUDIO_URL=http://lm-studio:1234
GEMINI_API_KEY=your-gemini-api-key
GCP_MEDGEMMA_ENDPOINT=https://your-gcp-endpoint
EOF
fi

# Construir y ejecutar servicios
echo "🔨 Construyendo servicios..."
docker-compose build

echo "🚀 Iniciando servicios..."
docker-compose up -d

echo "✅ Suite IMSS iniciada!"
echo "🌐 Accede a: http://localhost:3000"
echo "📊 Monitoreo: docker-compose logs -f"
```

## 🎯 Beneficios de esta Arquitectura

### **1. Unificación**
- Un solo punto de entrada (puerto 3000)
- Experiencia de usuario consistente
- Navegación fluida entre servicios

### **2. Escalabilidad**
- Cada servicio puede escalarse independientemente
- Load balancing por servicio
- Recursos optimizados por funcionalidad

### **3. Mantenibilidad**
- Código separado por responsabilidad
- Despliegue independiente de servicios
- Testing individual por servicio

### **4. Despliegue Simplificado**
- Un comando para iniciar todo (`docker-compose up`)
- Despliegue en Kubernetes con manifiestos
- Configuración centralizada

### **5. Desarrollo**
- Desarrollo local con hot-reload
- Debugging independiente por servicio
- CI/CD por servicio

## 🔄 Migración de la UI Actual

### **Cambios en page.tsx:**
```typescript
// Cambiar enlaces para usar proxy interno
<Link href="/api/proxy/chatbot">
  <Button>Acceder al Chatbot</Button>
</Link>

<Link href="/api/proxy/educacion">
  <Button>Explorar Educación</Button>
</Link>

<Link href="/api/proxy/simulacion">
  <Button>Probar Simulador</Button>
</Link>

<Link href="/api/proxy/radiografias">
  <Button>Analizar Radiografías</Button>
</Link>
```

### **Reordenar Secciones:**
1. Agente de Inteligencia Artificial
2. **Radiografías de Tórax** (mover antes de Entornos de aprendizaje)
3. Entornos de aprendizaje
4. Simulador de conversaciones

## 📊 Monitoreo y Observabilidad

### **Health Checks**
```yaml
# En cada servicio Flask
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'servicio-name',
        'timestamp': datetime.utcnow().isoformat()
    })
```

### **Logging Centralizado**
```yaml
# docker-compose.yml
services:
  gateway:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🚀 Próximos Pasos

1. **Crear estructura de directorios**
2. **Implementar gateway con proxy**
3. **Adaptar servicios Flask**
4. **Crear Dockerfiles**
5. **Configurar docker-compose.yml**
6. **Crear manifiestos Kubernetes**
7. **Scripts de despliegue**
8. **Testing y validación**

Esta arquitectura proporciona una solución robusta, escalable y fácil de desplegar que unifica todos los proyectos IMSS en un solo sistema integrado.
