#!/bin/bash

# ============================================
# Script para descargar repositorio completo vía SSH
# ============================================
# Uso: ./download-repo.sh [usuario@host] [ruta_destino_local]
# Ejemplo: ./download-repo.sh usuario@192.168.1.100 ~/Downloads/Pruebas-del-IMSS

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar argumentos
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Faltan argumentos${NC}"
    echo ""
    echo "Uso: $0 [usuario@host] [ruta_destino_local]"
    echo ""
    echo "Ejemplos:"
    echo "  $0 usuario@192.168.1.100 ~/Downloads/Pruebas-del-IMSS"
    echo "  $0 administrador@servidor.local ./Pruebas-del-IMSS"
    echo ""
    exit 1
fi

REMOTE_HOST="$1"
DEST_DIR="${2:-./Pruebas-del-IMSS}"
REMOTE_PATH="/home/administrador/Pruebas-del-IMSS"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Descarga de Repositorio vía SSH${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Host remoto: ${YELLOW}${REMOTE_HOST}${NC}"
echo "Ruta remota: ${YELLOW}${REMOTE_PATH}${NC}"
echo "Destino local: ${YELLOW}${DEST_DIR}${NC}"
echo ""

# Verificar que rsync está instalado
if ! command -v rsync &> /dev/null; then
    echo -e "${RED}Error: rsync no está instalado${NC}"
    echo "Instala rsync con:"
    echo "  Ubuntu/Debian: sudo apt-get install rsync"
    echo "  macOS: brew install rsync"
    echo "  O usa la opción 2 (tar.gz) en su lugar"
    exit 1
fi

# Crear directorio destino si no existe
mkdir -p "$DEST_DIR"

echo -e "${YELLOW}Iniciando descarga con rsync...${NC}"
echo "Esto puede tardar varios minutos dependiendo del tamaño..."
echo ""

# Opción 1: rsync (recomendado - más eficiente)
# Excluye archivos según .gitignore y archivos grandes innecesarios
rsync -avz --progress \
    --exclude='.git/' \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='node_modules/' \
    --exclude='.next/' \
    --exclude='*.db' \
    --exclude='*.sqlite*' \
    --exclude='logs/' \
    --exclude='*.log' \
    --exclude='.cache/' \
    --exclude='cache/' \
    --exclude='*.bin' \
    --exclude='*.safetensors' \
    --exclude='*.pkl' \
    --exclude='.DS_Store' \
    --exclude='.vscode/' \
    --exclude='.idea/' \
    "${REMOTE_HOST}:${REMOTE_PATH}/" "${DEST_DIR}/"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Descarga completada exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "El repositorio se ha descargado en: ${YELLOW}${DEST_DIR}${NC}"
echo ""
echo "Próximos pasos:"
echo "  1. cd ${DEST_DIR}"
echo "  2. Revisar y configurar variables de entorno (env.local)"
echo "  3. Instalar dependencias Python: pip install -r requirements.txt"
echo "  4. Instalar dependencias Node.js: cd UI_IMSS && npm install"
echo ""

