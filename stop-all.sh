#!/bin/bash

# 🛑 Script para Detener Todos los Servicios - Suite IMSS

echo "🛑 DETENIENDO SUITE IMSS"
echo "========================"

# Función para matar proceso por PID
kill_by_pid() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo "Matando $service_name (PID: $pid)"
            kill $pid 2>/dev/null || true
            sleep 1
            # Si no se murió, forzar
            if kill -0 $pid 2>/dev/null; then
                echo "Forzando terminación de $service_name"
                kill -9 $pid 2>/dev/null || true
            fi
        fi
        rm -f "$pid_file"
    fi
}

# Matar procesos por PID
echo "Matando procesos por PID..."
kill_by_pid "gateway"
kill_by_pid "chatbot"
kill_by_pid "educacion"
kill_by_pid "simulacion"
kill_by_pid "radiografias"

# Matar procesos por puerto como respaldo
echo "Matando procesos por puerto..."
for port in 3000 5001 5002 5003 5004; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Matando proceso en puerto $port"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

echo ""
echo "✅ Todos los servicios han sido detenidos"
echo "📁 Logs disponibles en: logs/"
