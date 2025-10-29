#!/bin/bash

# 🚀 Script de Inicio Unificado - Suite IMSS
# Este script levanta todos los servicios localmente con un solo comando
# Basado en start-ultra-simple.sh que funcionaba correctamente

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
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
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
    
    print_warning "$service_name no respondió después de $max_attempts intentos (puede estar iniciándose)"
    return 1
}

# Función principal para ejecutar comando en background con logs
# Similar a run_bg de start-ultra-simple.sh pero con mejor logging
run_bg() {
    local name=$1
    local cmd=$2
    local log_file="logs/${name}.log"
    local pid_file="logs/${name}.pid"
    
    print_status "Iniciando $name..."
    nohup bash -c "$cmd" > "$log_file" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    print_success "$name iniciado (PID: $pid)"
    return 0
}

# Función para mostrar el estado de los servicios
show_status() {
    echo ""
    echo "=========================================="
    echo "📊 ESTADO DE LOS SERVICIOS"
    echo "=========================================="
    
    local services=("Gateway:3001" "Chatbot:5001" "Educacion:5002" "Simulacion:5003" "Radiografias:5004" "NV-Reason-CXR:5005")
    
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
}

# Función para limpiar procesos
cleanup() {
    print_status "Limpiando procesos..."
    
    # Matar procesos por PID si existen (incluyendo procesos hijos)
    for service in gateway chatbot educacion simulacion radiografias nv-reason-cxr; do
        if [ -f "logs/${service}.pid" ]; then
            local pid=$(cat "logs/${service}.pid")
            if kill -0 $pid 2>/dev/null; then
                # Matar el proceso y todos sus hijos
                kill -TERM $pid 2>/dev/null || true
                sleep 2
                # Si todavía existe, forzar terminación
                if kill -0 $pid 2>/dev/null; then
                    kill -9 $pid 2>/dev/null || true
                fi
                print_success "Proceso $service (PID $pid) terminado"
            fi
            rm -f "logs/${service}.pid"
        fi
    done
    
    # Matar procesos por puerto como respaldo (incluir 3001 para gateway)
    for port in 3001 3000 5001 5002 5003 5004 5005; do
        kill_port $port
    done
    
    print_success "Limpieza completada"
}

# Función principal
main() {
    echo "🏥 SUITE IMSS - INICIO UNIFICADO"
    echo "================================="
    
    # Crear directorio de logs (desde el directorio raíz del proyecto)
    cd "$(dirname "$0")"
    mkdir -p logs
    
    # Verificar dependencias
    print_status "Verificando dependencias..."
    
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        print_error "Python no está instalado"
        exit 1
    fi
    
    # Usar python3 si está disponible, sino python
    PYTHON_CMD="python3"
    if ! command -v python3 &> /dev/null; then
        PYTHON_CMD="python"
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
    
    # Obtener IP local (importante para variables de entorno del gateway)
    LOCAL_IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "192.168.1.26")
    print_status "📍 IP local detectada: $LOCAL_IP"
    
    # Iniciar servicios backend
    print_status "Iniciando servicios backend..."
    
    # Chatbot - usa main.py (FastAPI) no app.py (Flask legacy)
    run_bg "chatbot" "cd chatbot && $PYTHON_CMD main.py"
    
    # Educación - usa app.py
    run_bg "educacion" "cd Educacion_radiografia && $PYTHON_CMD app.py"
    
    # Simulación - usa app.py
    run_bg "simulacion" "cd Simulacion && $PYTHON_CMD app.py"
    
    # Radiografías - usa app.py
    run_bg "radiografias" "cd radiografias_torax/backend && $PYTHON_CMD app.py"
    
    # NV-Reason-CXR - Gradio service (usar venv si existe, sin token requerido)
    # La ruta del venv debe ser relativa desde IMSS/ (no desde nv-reason-cxr/)
    PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
    VENV_PATH="$PROJECT_ROOT/../venv"
    if [ -d "$VENV_PATH" ]; then
        # Usar ruta absoluta del venv y cambiar al directorio antes de ejecutar
        NV_REASON_DIR="$PROJECT_ROOT/nv-reason-cxr"
        run_bg "nv-reason-cxr" "cd $NV_REASON_DIR && source $VENV_PATH/bin/activate && PORT=5005 MODEL=${MODEL:-nvidia/NV-Reason-CXR-3B} python app.py"
    else
        NV_REASON_DIR="$PROJECT_ROOT/nv-reason-cxr"
        run_bg "nv-reason-cxr" "cd $NV_REASON_DIR && PORT=5005 MODEL=${MODEL:-nvidia/NV-Reason-CXR-3B} $PYTHON_CMD app.py"
    fi
    
    # Esperar un poco para que los servicios se inicien
    print_status "Esperando que los servicios backend se inicien..."
    sleep 8
    
    # Iniciar Gateway Next.js con variables de entorno necesarias
    print_status "Iniciando Gateway Next.js..."
    run_bg "gateway" "cd UI_IMSS && HOSTNAME=0.0.0.0 SERVICIO_CHATBOT_URL=http://$LOCAL_IP:5001 SERVICIO_EDUCACION_URL=http://$LOCAL_IP:5002 SERVICIO_SIMULACION_URL=http://$LOCAL_IP:5003 SERVICIO_RADIOGRAFIAS_URL=http://$LOCAL_IP:5004 npm run dev"
    
    # Esperar que todos los servicios estén listos
    print_status "Esperando que todos los servicios estén listos..."
    sleep 5
    
    # Verificar servicios (en background para no bloquear)
    wait_for_service "http://localhost:5001/api/health" "Chatbot" || true
    wait_for_service "http://localhost:5002/api/health" "Educación" || true
    wait_for_service "http://localhost:5003/api/health" "Simulación" || true
    wait_for_service "http://localhost:5004/api/health" "Radiografías" || true
    wait_for_service "http://localhost:5005" "NV-Reason-CXR" || true
    
    # Detectar puerto real del gateway (Next.js puede usar otro puerto si 3000 está ocupado)
    GATEWAY_PORT=""
    for port in 3001 3000 3002 3003; do
        if ss -tlnp 2>/dev/null | grep -q ":$port.*next-server" || check_port $port; then
            GATEWAY_PORT=$port
            break
        fi
    done
    
    if [ -z "$GATEWAY_PORT" ]; then
        GATEWAY_PORT="3001"
    fi
    
    # Verificar gateway en el puerto detectado
    wait_for_service "http://localhost:$GATEWAY_PORT" "Gateway" || true
    
    # Mostrar estado final
    show_status
    
    echo ""
    echo "🌐 URLs de acceso LOCAL:"
    echo "   Gateway:        http://localhost:$GATEWAY_PORT"
    echo "   Chatbot:       http://localhost:5001"
    echo "   Educación:     http://localhost:5002"
    echo "   Simulación:    http://localhost:5003"
    echo "   Radiografías:  http://localhost:5004"
    echo "   NV-Reason-CXR: http://localhost:5005"
    echo ""
    echo "🌐 URLs de acceso RED LOCAL:"
    echo "   Gateway:        http://$LOCAL_IP:$GATEWAY_PORT"
    echo "   Chatbot:       http://$LOCAL_IP:5001"
    echo "   Educación:     http://$LOCAL_IP:5002"
    echo "   Simulación:    http://$LOCAL_IP:5003"
    echo "   Radiografías:  http://$LOCAL_IP:5004"
    echo "   NV-Reason-CXR: http://$LOCAL_IP:5005"
    echo ""
    echo "📊 Para ver logs: tail -f logs/[servicio].log"
    echo "🛑 Para detener: ./stop-all.sh"
    echo ""
    
    print_success "🎉 ¡Todos los servicios están iniciándose!"
    print_status "Presiona Ctrl+C para detener todos los servicios"
    echo ""
    
    # Configurar trap para limpiar servicios al presionar Ctrl+C
    trap 'echo ""; print_status "Recibida señal de interrupción. Deteniendo todos los servicios..."; cleanup; exit 0' INT TERM
    
    # Mantener el script ejecutándose para monitorear
    while true; do
        sleep 60
        # Verificar que todos los servicios sigan activos
        local all_active=true
        for port in 3001 5001 5002 5003 5004 5005; do
            if ! check_port $port; then
                all_active=false
                break
            fi
        done
        
        if [ "$all_active" = false ]; then
            print_warning "Algunos servicios pueden haberse detenido. Verifica los logs."
            show_status
        fi
    done
}

# Verificar argumentos
case "${1:-}" in
    "status")
        cd "$(dirname "$0")"
        show_status
        ;;
    "stop")
        cd "$(dirname "$0")"
        cleanup
        ;;
    "restart")
        cd "$(dirname "$0")"
        cleanup
        sleep 2
        main
        ;;
    *)
        main
        ;;
esac
