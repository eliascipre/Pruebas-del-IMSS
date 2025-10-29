#!/bin/bash

# 🚀 Script con Concurrently - Suite IMSS
# Instala concurrently si no está disponible y ejecuta todos los servicios

echo "🏥 SUITE IMSS - CONCURRENTLY"
echo "============================="

# Verificar si concurrently está instalado
if ! command -v concurrently &> /dev/null; then
    echo "📦 Instalando concurrently..."
    npm install -g concurrently
fi

# Crear directorio de logs
mkdir -p logs

# Limpiar puertos anteriores
echo "🧹 Limpiando puertos anteriores..."
for port in 3000 5001 5002 5003 5004; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Matando proceso en puerto $port"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

sleep 2

echo "🚀 Iniciando todos los servicios con concurrently..."

# Ejecutar todos los servicios con concurrently
concurrently \
    --names "Gateway,Chatbot,Educacion,Simulacion,Radiografias" \
    --prefix-colors "blue,green,yellow,red,magenta" \
    --kill-others \
    --restart-tries 3 \
    "cd UI_IMSS && npm run dev" \
    "cd servicios/chatbot && python app.py" \
    "cd Educacion_radiografia && python app.py" \
    "cd Simulacion && python app.py" \
    "cd radiografias_torax/backend && python app.py"
