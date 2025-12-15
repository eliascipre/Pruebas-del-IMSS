#!/bin/bash

# 📱 Script para generar QR Code con URL de acceso
# Suite IMSS - QR Code para acceso móvil

echo "🏥 SUITE IMSS - GENERADOR DE QR CODE"
echo "===================================="

# Obtener IP local
LOCAL_IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "192.168.1.26")

# Detectar puerto del gateway
GATEWAY_PORT=""
for port in 3000 3001 3002 3003; do
    if ss -tlnp | grep -q ":$port.*next-server"; then
        GATEWAY_PORT=$port
        break
    fi
done

if [ -z "$GATEWAY_PORT" ]; then
    echo "❌ Gateway no está corriendo. Ejecuta ./start-ultra-simple.sh primero."
    exit 1
fi

URL="http://$LOCAL_IP:$GATEWAY_PORT"

echo "📍 IP local: $LOCAL_IP"
echo "🌐 Puerto gateway: $GATEWAY_PORT"
echo "🔗 URL completa: $URL"
echo ""

# Verificar si qrencode está instalado
if ! command -v qrencode &> /dev/null; then
    echo "📦 Instalando qrencode..."
    sudo apt update && sudo apt install -y qrencode
fi

echo "📱 Generando QR Code..."
echo ""

# Generar QR Code
qrencode -t ANSI "$URL"

echo ""
echo "📱 Escanea este QR Code con tu móvil para acceder a la Suite IMSS"
echo "🔗 O copia esta URL: $URL"
echo ""
echo "💡 Consejos:"
echo "   - Asegúrate de estar conectado a la misma red WiFi"
echo "   - Si no funciona, verifica que el firewall permita conexiones"
echo "   - Los servicios deben estar ejecutándose (usa ./start-ultra-simple.sh)"
