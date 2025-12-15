#!/bin/bash

# ============================================
# Script para descargar repositorio como tar.gz vía SSH
# ============================================
# Uso: ./download-repo-tar.sh [usuario@host] [ruta_destino_local]
# Ejemplo: ./download-repo-tar.sh usuario@192.168.1.100 ~/Downloads

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
    echo "  $0 usuario@192.168.1.100 ~/Downloads"
    echo "  $0 administrador@servidor.local ./"
    echo ""
    exit 1
fi

REMOTE_HOST="$1"
DEST_DIR="${2:-./}"
REMOTE_PATH="/home/administrador/Pruebas-del-IMSS"
ARCHIVE_NAME="Pruebas-del-IMSS-$(date +%Y%m%d-%H%M%S).tar.gz"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Descarga de Repositorio como tar.gz${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Host remoto: ${YELLOW}${REMOTE_HOST}${NC}"
echo "Ruta remota: ${YELLOW}${REMOTE_PATH}${NC}"
echo "Archivo destino: ${YELLOW}${DEST_DIR}/${ARCHIVE_NAME}${NC}"
echo ""

# Crear directorio destino si no existe
mkdir -p "$DEST_DIR"

echo -e "${YELLOW}Paso 1: Creando archivo tar.gz en servidor remoto...${NC}"
echo "Esto puede tardar varios minutos..."
echo ""

# Crear tar.gz en el servidor remoto (excluyendo archivos innecesarios)
ssh "${REMOTE_HOST}" "cd /home/administrador && tar -czf /tmp/${ARCHIVE_NAME} \
    --exclude='Pruebas-del-IMSS/.git' \
    --exclude='Pruebas-del-IMSS/venv' \
    --exclude='Pruebas-del-IMSS/__pycache__' \
    --exclude='Pruebas-del-IMSS/node_modules' \
    --exclude='Pruebas-del-IMSS/.next' \
    --exclude='Pruebas-del-IMSS/*.db' \
    --exclude='Pruebas-del-IMSS/*.sqlite*' \
    --exclude='Pruebas-del-IMSS/logs' \
    --exclude='Pruebas-del-IMSS/*.log' \
    --exclude='Pruebas-del-IMSS/.cache' \
    --exclude='Pruebas-del-IMSS/cache' \
    --exclude='Pruebas-del-IMSS/*.bin' \
    --exclude='Pruebas-del-IMSS/*.safetensors' \
    --exclude='Pruebas-del-IMSS/*.pkl' \
    --exclude='Pruebas-del-IMSS/.DS_Store' \
    --exclude='Pruebas-del-IMSS/.vscode' \
    --exclude='Pruebas-del-IMSS/.idea' \
    Pruebas-del-IMSS/ 2>/dev/null || true"

echo -e "${YELLOW}Paso 2: Descargando archivo tar.gz...${NC}"

# Descargar el archivo
scp "${REMOTE_HOST}:/tmp/${ARCHIVE_NAME}" "${DEST_DIR}/"

echo -e "${YELLOW}Paso 3: Limpiando archivo temporal en servidor...${NC}"

# Limpiar archivo temporal en servidor
ssh "${REMOTE_HOST}" "rm -f /tmp/${ARCHIVE_NAME}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Descarga completada exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Archivo descargado: ${YELLOW}${DEST_DIR}/${ARCHIVE_NAME}${NC}"
echo ""
echo "Para extraer el archivo:"
echo "  cd ${DEST_DIR}"
echo "  tar -xzf ${ARCHIVE_NAME}"
echo ""
echo "O en un solo comando:"
echo "  cd ${DEST_DIR} && tar -xzf ${ARCHIVE_NAME} && cd Pruebas-del-IMSS"
echo ""

