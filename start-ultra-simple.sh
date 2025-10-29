#!/bin/bash

# 🚀 Script Ultra Simple - Suite IMSS
# Un solo comando para levantar todo

echo "🏥 SUITE IMSS - INICIO ULTRA SIMPLE"
echo "==================================="

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

echo "🚀 Iniciando todos los servicios..."

# Obtener IP local
LOCAL_IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "192.168.1.26")
echo "📍 IP local detectada: $LOCAL_IP"

# Función para ejecutar comando en background con logs
run_bg() {
    local name=$1
    local cmd=$2
    local log_file="logs/${name}.log"
    
    echo "Iniciando $name..."
    nohup bash -c "$cmd" > "$log_file" 2>&1 &
    echo $! > "logs/${name}.pid"
    echo "✅ $name iniciado (PID: $(cat logs/${name}.pid))"
}

# Iniciar todos los servicios en background
run_bg "chatbot" "cd chatbot && python main.py"
run_bg "educacion" "cd Educacion_radiografia && python app.py"
run_bg "simulacion" "cd Simulacion && python app.py"
run_bg "radiografias" "cd radiografias_torax/backend && python app.py"
run_bg "gateway" "cd UI_IMSS && HOSTNAME=0.0.0.0 SERVICIO_CHATBOT_URL=http://$LOCAL_IP:5001 SERVICIO_EDUCACION_URL=http://$LOCAL_IP:5002 SERVICIO_SIMULACION_URL=http://$LOCAL_IP:5003 SERVICIO_RADIOGRAFIAS_URL=http://$LOCAL_IP:5004 npm run dev"

echo ""
echo "⏳ Esperando que los servicios se inicien..."
sleep 10

echo ""
echo "🎉 ¡Servicios iniciados!"
echo ""
# Detectar puerto real del gateway
GATEWAY_PORT=""
for port in 3000 3001 3002 3003; do
    if ss -tlnp | grep -q ":$port.*next-server"; then
        GATEWAY_PORT=$port
        break
    fi
done

if [ -z "$GATEWAY_PORT" ]; then
    GATEWAY_PORT="3000"
fi

echo "🌐 URLs de acceso LOCAL:"
echo "   Gateway:     http://localhost:$GATEWAY_PORT"
echo "   Chatbot:    http://localhost:5001"
echo "   Educación:  http://localhost:5002"
echo "   Simulación: http://localhost:5003"
echo "   Radiografías: http://localhost:5004"
echo ""
echo "🌐 URLs de acceso RED LOCAL:"
echo "   Gateway:     http://$LOCAL_IP:$GATEWAY_PORT"
echo "   Chatbot:    http://$LOCAL_IP:5001"
echo "   Educación:  http://$LOCAL_IP:5002"
echo "   Simulación: http://$LOCAL_IP:5003"
echo "   Radiografías: http://$LOCAL_IP:5004"
echo ""
echo "📊 Para ver logs: tail -f logs/[servicio].log"
echo "🛑 Para detener: ./stop-all.sh"
echo ""
echo "📱 Para acceso móvil:"
echo "   - Ejecuta: ./show-network-info.sh (ver URLs de red)"
echo "   - Ejecuta: ./generate-qr.sh (generar QR Code)"
echo ""
echo "Presiona Ctrl+C para salir (los servicios seguirán ejecutándose)"

# Mantener el script ejecutándose para mostrar logs
tail -f logs/*.log
