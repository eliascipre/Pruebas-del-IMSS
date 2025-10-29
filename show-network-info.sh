#!/bin/bash

# 🌐 Script para mostrar URLs de acceso desde red local
# Suite IMSS - Información de red

echo "🏥 SUITE IMSS - INFORMACIÓN DE RED"
echo "=================================="

# Obtener IP local
LOCAL_IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "192.168.1.26")

echo "📍 IP local detectada: $LOCAL_IP"
echo ""

# Verificar qué servicios están corriendo
echo "🔍 Verificando servicios activos..."
echo ""

# Detectar puerto del gateway (Next.js puede usar 3000, 3001, etc.)
GATEWAY_PORT=""
for port in 3000 3001 3002 3003; do
    if ss -tlnp | grep -q ":$port.*next-server"; then
        GATEWAY_PORT=$port
        echo "✅ Gateway (Next.js) - Puerto $port"
        break
    fi
done

if [ -z "$GATEWAY_PORT" ]; then
    echo "❌ Gateway (Next.js) - No encontrado en puertos 3000-3003"
fi

# Verificar otros servicios
for port in 5001 5002 5003 5004; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        case $port in
            5001) echo "✅ Chatbot - Puerto $port" ;;
            5002) echo "✅ Educación - Puerto $port" ;;
            5003) echo "✅ Simulación - Puerto $port" ;;
            5004) echo "✅ Radiografías - Puerto $port" ;;
        esac
    else
        case $port in
            5001) echo "❌ Chatbot - Puerto $port (no activo)" ;;
            5002) echo "❌ Educación - Puerto $port (no activo)" ;;
            5003) echo "❌ Simulación - Puerto $port (no activo)" ;;
            5004) echo "❌ Radiografías - Puerto $port (no activo)" ;;
        esac
    fi
done

echo ""
echo "🌐 URLs de acceso desde otros dispositivos en la red:"
if [ -n "$GATEWAY_PORT" ]; then
    echo "   Gateway:     http://$LOCAL_IP:$GATEWAY_PORT"
else
    echo "   Gateway:     No disponible"
fi
echo "   Chatbot:    http://$LOCAL_IP:5001"
echo "   Educación:  http://$LOCAL_IP:5002"
echo "   Simulación: http://$LOCAL_IP:5003"
echo "   Radiografías: http://$LOCAL_IP:5004"
echo ""
echo "📱 Para acceder desde tu móvil/tablet:"
echo "   1. Conecta tu dispositivo a la misma red WiFi"
echo "   2. Abre el navegador"
if [ -n "$GATEWAY_PORT" ]; then
    echo "   3. Ve a: http://$LOCAL_IP:$GATEWAY_PORT"
else
    echo "   3. Gateway no disponible - ejecuta ./start-ultra-simple.sh"
fi
echo ""
echo "🔧 Si no funciona, verifica:"
echo "   - Que el firewall permita conexiones en estos puertos"
echo "   - Que ambos dispositivos estén en la misma red"
echo "   - Que los servicios estén ejecutándose (usa ./start-ultra-simple.sh)"
