#!/bin/bash

# 🚀 Script de Inicio Unificado - Suite IMSS
# Este script levanta todos los servicios localmente con un solo comando

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Puerto en uso
    else
        return 1  # Puerto libre
    fi
}

# Función para matar procesos en puertos específicos
kill_port() {
    local port=$1
    if check_port $port; then
        print_warning "Puerto $port está en uso. Matando proceso..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Función para esperar que un servicio esté listo
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_status "Esperando que $service_name esté listo..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name está listo!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name no respondió después de $max_attempts intentos"
    return 1
}

# Función para iniciar un servicio Flask
start_flask_service() {
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
    
    # Iniciar servicio en background
    nohup python "$app_file" > "../logs/${service_name}.log" 2>&1 &
    local pid=$!
    echo $pid > "../logs/${service_name}.pid"
    
    print_success "$service_name iniciado con PID $pid"
    return 0
}

# Función para iniciar el servicio Next.js
start_nextjs_service() {
    local port=$1
    local directory=$2
    
    print_status "Iniciando Gateway Next.js en puerto $port..."
    
    cd "$directory"
    
    # Verificar que package.json existe
    if [ ! -f "package.json" ]; then
        print_error "package.json no encontrado en $directory"
        return 1
    fi
    
    # Instalar dependencias si es necesario
    if [ ! -d "node_modules" ]; then
        print_status "Instalando dependencias de Next.js..."
        npm install
    fi
    
    # Iniciar servicio en background
    nohup npm run dev > "../logs/gateway.log" 2>&1 &
    local pid=$!
    echo $pid > "../logs/gateway.pid"
    
    print_success "Gateway Next.js iniciado con PID $pid"
    return 0
}

# Función para mostrar el estado de los servicios
show_status() {
    echo ""
    echo "=========================================="
    echo "📊 ESTADO DE LOS SERVICIOS"
    echo "=========================================="
    
    local services=("Gateway:3000" "Chatbot:5001" "Educacion:5002" "Simulacion:5003" "Radiografias:5004")
    
    for service in "${services[@]}"; do
        local name=$(echo $service | cut -d: -f1)
        local port=$(echo $service | cut -d: -f2)
        
        if check_port $port; then
            print_success "$name (puerto $port): ✅ ACTIVO"
        else
            print_error "$name (puerto $port): ❌ INACTIVO"
        fi
    done
    
    echo ""
    echo "🌐 URLs de acceso:"
    echo "   Gateway:     http://localhost:3000"
    echo "   Chatbot:    http://localhost:5001"
    echo "   Educación:  http://localhost:5002"
    echo "   Simulación: http://localhost:5003"
    echo "   Radiografías: http://localhost:5004"
    echo ""
}

# Función para limpiar procesos
cleanup() {
    print_status "Limpiando procesos..."
    
    # Matar procesos por PID si existen
    for service in gateway chatbot educacion simulacion radiografias; do
        if [ -f "logs/${service}.pid" ]; then
            local pid=$(cat "logs/${service}.pid")
            if kill -0 $pid 2>/dev/null; then
                kill $pid 2>/dev/null || true
                print_success "Proceso $service (PID $pid) terminado"
            fi
            rm -f "logs/${service}.pid"
        fi
    done
    
    # Matar procesos por puerto como respaldo
    for port in 3000 5001 5002 5003 5004; do
        kill_port $port
    done
    
    print_success "Limpieza completada"
}

# Función principal
main() {
    echo "🏥 SUITE IMSS - INICIO UNIFICADO"
    echo "================================="
    
    # Crear directorio de logs
    mkdir -p logs
    
    # Verificar dependencias
    print_status "Verificando dependencias..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 no está instalado"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm no está instalado"
        exit 1
    fi
    
    print_success "Dependencias verificadas"
    
    # Limpiar procesos anteriores
    cleanup
    
    # Configurar trap para cleanup al salir
    trap cleanup EXIT INT TERM
    
    # Iniciar servicios Flask
    print_status "Iniciando servicios backend..."
    
    start_flask_service "chatbot" 5001 "servicios/chatbot" "app.py"
    start_flask_service "educacion" 5002 "Educacion_radiografia" "app.py"
    start_flask_service "simulacion" 5003 "Simulacion" "app.py"
    start_flask_service "radiografias" 5004 "radiografias_torax/backend" "app.py"
    
    # Esperar un poco para que los servicios Flask se inicien
    sleep 5
    
    # Iniciar Gateway Next.js
    print_status "Iniciando Gateway Next.js..."
    start_nextjs_service 3000 "UI_IMSS"
    
    # Esperar que todos los servicios estén listos
    print_status "Esperando que todos los servicios estén listos..."
    
    wait_for_service "http://localhost:5001/api/health" "Chatbot" &
    wait_for_service "http://localhost:5002/api/health" "Educación" &
    wait_for_service "http://localhost:5003/api/health" "Simulación" &
    wait_for_service "http://localhost:5004/api/health" "Radiografías" &
    wait_for_service "http://localhost:3000/api/health" "Gateway" &
    
    wait  # Esperar que todos los servicios estén listos
    
    # Mostrar estado final
    show_status
    
    print_success "🎉 ¡Todos los servicios están ejecutándose!"
    print_status "Presiona Ctrl+C para detener todos los servicios"
    
    # Mantener el script ejecutándose
    while true; do
        sleep 10
        # Verificar que todos los servicios sigan activos
        local all_active=true
        for port in 3000 5001 5002 5003 5004; do
            if ! check_port $port; then
                all_active=false
                break
            fi
        done
        
        if [ "$all_active" = false ]; then
            print_error "Algunos servicios se han detenido inesperadamente"
            break
        fi
    done
}

# Verificar argumentos
case "${1:-}" in
    "status")
        show_status
        ;;
    "stop")
        cleanup
        ;;
    "restart")
        cleanup
        sleep 2
        main
        ;;
    *)
        main
        ;;
esac
