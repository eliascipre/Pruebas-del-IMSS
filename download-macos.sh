#!/bin/bash

# ============================================
# Script de descarga para macOS
# Ejecutar desde tu MacBook Pro
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
REMOTE_USER="administrador"
REMOTE_HOST="10.105.20.1"
REMOTE_PATH="/home/administrador/Pruebas-del-IMSS"
DEST_DIR="${1:-$HOME/Downloads/Pruebas-del-IMSS}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Descarga de Repositorio IMSS (macOS)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Servidor: ${BLUE}${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo -e "Ruta remota: ${YELLOW}${REMOTE_PATH}${NC}"
echo -e "Destino local: ${YELLOW}${DEST_DIR}${NC}"
echo ""

# Verificar que rsync está instalado (viene preinstalado en macOS)
if ! command -v rsync &> /dev/null; then
    echo -e "${RED}Error: rsync no está instalado${NC}"
    echo "Instala rsync con: brew install rsync"
    exit 1
fi

# Crear directorio destino si no existe
echo -e "${YELLOW}Creando directorio destino...${NC}"
mkdir -p "$DEST_DIR"

if [ ! -d "$DEST_DIR" ]; then
    echo -e "${RED}Error: No se pudo crear el directorio ${DEST_DIR}${NC}"
    exit 1
fi

echo -e "${YELLOW}Iniciando descarga...${NC}"
echo "Esto puede tardar varios minutos dependiendo del tamaño y velocidad de red."
echo ""
echo -e "${BLUE}Nota: Se te pedirá la contraseña SSH: Passw0rd${NC}"
echo ""

# Descargar usando rsync
# IMPORTANTE: La ruta destino debe ser absoluta o relativa a tu Mac, NO del servidor
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
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/" "${DEST_DIR}/"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Descarga completada exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "El repositorio se ha descargado en: ${YELLOW}${DEST_DIR}${NC}"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo "  1. cd ${DEST_DIR}"
echo "  2. Revisar y configurar variables de entorno:"
echo "     cp env.example env.local"
echo "  3. Instalar dependencias Python:"
echo "     python3 -m venv venv"
echo "     source venv/bin/activate"
echo "     pip install -r requirements.txt"
echo "  4. Instalar dependencias Node.js:"
echo "     cd UI_IMSS && npm install"
echo ""

