#!/bin/bash

# 🚀 Script Simple de Inicio - Suite IMSS
# Usando uvicorn para Flask y npm para Next.js

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para matar procesos en puertos
cleanup_ports() {
    print_status "Limpiando puertos..."
    for port in 3000 5001 5002 5003 5004; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_status "Matando proceso en puerto $port"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
    sleep 2
}

# Función para iniciar servicio con uvicorn
start_uvicorn_service() {
    local service_name=$1
    local port=$2
    local directory=$3
    local app_file=$4
    
    print_status "Iniciando $service_name en puerto $port..."
    
    cd "$directory"
    
    # Verificar que el archivo existe
    if [ ! -f "$app_file" ]; then
        print_error "Archivo $app_file no encontrado en $directory"
        return 1
    fi
    
    # Instalar dependencias si es necesario
    if [ ! -d "venv" ] && [ -f "requirements.txt" ]; then
        print_status "Instalando dependencias para $service_name..."
        pip install -r requirements.txt
    fi
    
    # Iniciar con uvicorn en background
    nohup uvicorn "$app_file:app" --host 0.0.0.0 --port $port --reload > "../logs/${service_name}.log" 2>&1 &
    local pid=$!
    echo $pid > "../logs/${service_name}.pid"
    
    print_success "$service_name iniciado con PID $pid"
    cd ..
}

# Función para iniciar Next.js
start_nextjs() {
    local port=$1
    local directory=$2
    
    print_status "Iniciando Gateway Next.js en puerto $port..."
    
    cd "$directory"
    
    # Instalar dependencias si es necesario
    if [ ! -d "node_modules" ]; then
        print_status "Instalando dependencias de Next.js..."
        npm install
    fi
    
    # Configurar puerto
    export PORT=$port
    
    # Iniciar Next.js en background
    nohup npm run dev > "../logs/gateway.log" 2>&1 &
    local pid=$!
    echo $pid > "../logs/gateway.pid"
    
    print_success "Gateway Next.js iniciado con PID $pid"
    cd ..
}

# Función principal
main() {
    echo "🏥 SUITE IMSS - INICIO SIMPLE"
    echo "=============================="
    
    # Crear directorio de logs
    mkdir -p logs
    
    # Limpiar puertos
    cleanup_ports
    
    # Configurar trap para cleanup
    trap cleanup_ports EXIT INT TERM
    
    print_status "Iniciando todos los servicios..."
    
    # Iniciar servicios Flask con uvicorn
    start_uvicorn_service "chatbot" 5001 "servicios/chatbot" "app"
    start_uvicorn_service "educacion" 5002 "Educacion_radiografia" "app"
    start_uvicorn_service "simulacion" 5003 "Simulacion" "app"
    start_uvicorn_service "radiografias" 5004 "radiografias_torax/backend" "app"
    
    # Esperar un poco
    sleep 3
    
    # Iniciar Gateway Next.js
    start_nextjs 3000 "UI_IMSS"
    
    # Esperar un poco más
    sleep 5
    
    print_success "🎉 ¡Todos los servicios están ejecutándose!"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "   Gateway:     http://localhost:3000"
    echo "   Chatbot:    http://localhost:5001"
    echo "   Educación:  http://localhost:5002"
    echo "   Simulación: http://localhost:5003"
    echo "   Radiografías: http://localhost:5004"
    echo ""
    print_status "Presiona Ctrl+C para detener todos los servicios"
    
    # Mantener ejecutándose
    wait
}

# Manejar argumentos
case "${1:-}" in
    "stop")
        cleanup_ports
        print_success "Servicios detenidos"
        ;;
    "restart")
        cleanup_ports
        sleep 2
        main
        ;;
    *)
        main
        ;;
esac
