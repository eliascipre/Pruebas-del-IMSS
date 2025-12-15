#!/bin/bash

# 🔍 Script de Verificación - Suite IMSS
# Verifica que todo esté listo para ejecutar

echo "🔍 VERIFICANDO SUITE IMSS"
echo "=========================="

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

warn_status() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "📋 Verificando estructura de directorios..."

# Verificar directorios principales
[ -d "UI_IMSS" ] && check_status 0 "Directorio UI_IMSS existe" || check_status 1 "Directorio UI_IMSS no existe"
[ -d "servicios/chatbot" ] && check_status 0 "Directorio servicios/chatbot existe" || check_status 1 "Directorio servicios/chatbot no existe"
[ -d "Educacion_radiografia" ] && check_status 0 "Directorio Educacion_radiografia existe" || check_status 1 "Directorio Educacion_radiografia no existe"
[ -d "Simulacion" ] && check_status 0 "Directorio Simulacion existe" || check_status 1 "Directorio Simulacion no existe"
[ -d "radiografias_torax" ] && check_status 0 "Directorio radiografias_torax existe" || check_status 1 "Directorio radiografias_torax no existe"

echo ""
echo "📄 Verificando archivos principales..."

# Verificar archivos principales
[ -f "UI_IMSS/package.json" ] && check_status 0 "package.json de UI existe" || check_status 1 "package.json de UI no existe"
[ -f "servicios/chatbot/app.py" ] && check_status 0 "app.py de chatbot existe" || check_status 1 "app.py de chatbot no existe"
[ -f "Educacion_radiografia/app.py" ] && check_status 0 "app.py de educacion existe" || check_status 1 "app.py de educacion no existe"
[ -f "Simulacion/app.py" ] && check_status 0 "app.py de simulacion existe" || check_status 1 "app.py de simulacion no existe"
[ -f "radiografias_torax/backend/app.py" ] && check_status 0 "app.py de radiografias existe" || check_status 1 "app.py de radiografias no existe"

echo ""
echo "🔧 Verificando dependencias..."

# Verificar Python
if command -v python3 &> /dev/null; then
    check_status 0 "Python3 está instalado"
    python3 --version
else
    check_status 1 "Python3 no está instalado"
fi

# Verificar Node.js
if command -v node &> /dev/null; then
    check_status 0 "Node.js está instalado"
    node --version
else
    check_status 1 "Node.js no está instalado"
fi

# Verificar npm
if command -v npm &> /dev/null; then
    check_status 0 "npm está instalado"
    npm --version
else
    check_status 1 "npm no está instalado"
fi

echo ""
echo "📦 Verificando dependencias de Python..."

# Verificar Flask
if python3 -c "import flask" 2>/dev/null; then
    check_status 0 "Flask está instalado"
else
    warn_status "Flask no está instalado - ejecuta: pip install flask flask-cors requests"
fi

# Verificar requests
if python3 -c "import requests" 2>/dev/null; then
    check_status 0 "requests está instalado"
else
    warn_status "requests no está instalado - ejecuta: pip install requests"
fi

echo ""
echo "🌐 Verificando puertos..."

# Verificar puertos
for port in 3000 5001 5002 5003 5004; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        warn_status "Puerto $port está en uso"
    else
        check_status 0 "Puerto $port está libre"
    fi
done

echo ""
echo "📝 Verificando scripts de inicio..."

# Verificar scripts
[ -f "start-ultra-simple.sh" ] && check_status 0 "Script start-ultra-simple.sh existe" || check_status 1 "Script start-ultra-simple.sh no existe"
[ -f "start-concurrently.sh" ] && check_status 0 "Script start-concurrently.sh existe" || check_status 1 "Script start-concurrently.sh no existe"
[ -f "stop-all.sh" ] && check_status 0 "Script stop-all.sh existe" || check_status 1 "Script stop-all.sh no existe"

echo ""
echo "🎯 RESUMEN DE VERIFICACIÓN"
echo "=========================="

# Contar errores
errors=0
warnings=0

# Verificar si hay errores críticos
if [ ! -d "UI_IMSS" ] || [ ! -f "UI_IMSS/package.json" ]; then
    errors=$((errors + 1))
fi

if [ ! -d "servicios/chatbot" ] || [ ! -f "servicios/chatbot/app.py" ]; then
    errors=$((errors + 1))
fi

if [ ! -d "Educacion_radiografia" ] || [ ! -f "Educacion_radiografia/app.py" ]; then
    errors=$((errors + 1))
fi

if [ ! -d "Simulacion" ] || [ ! -f "Simulacion/app.py" ]; then
    errors=$((errors + 1))
fi

if [ ! -d "radiografias_torax" ] || [ ! -f "radiografias_torax/backend/app.py" ]; then
    errors=$((errors + 1))
fi

if [ $errors -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡El proyecto está listo para ejecutar!${NC}"
    echo ""
    echo "🚀 Para iniciar todos los servicios:"
    echo "   ./start-ultra-simple.sh"
    echo ""
    echo "🛑 Para detener todos los servicios:"
    echo "   ./stop-all.sh"
    echo ""
    echo "📊 Para ver el estado:"
    echo "   ./start-all.sh status"
else
    echo -e "${RED}❌ Hay $errors errores críticos que deben resolverse${NC}"
    echo ""
    echo "🔧 Acciones recomendadas:"
    echo "   1. Verificar que todos los directorios existan"
    echo "   2. Verificar que todos los archivos principales existan"
    echo "   3. Instalar dependencias faltantes"
fi

echo ""
echo "📚 Para más información, consulta:"
echo "   - ARQUITECTURA_UNIFICADA.md"
echo "   - README.md"
