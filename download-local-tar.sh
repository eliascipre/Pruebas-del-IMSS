#!/bin/bash

# ============================================
# Script de descarga como tar.gz con credenciales específicas
# Ejecutar desde tu máquina LOCAL
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
DEST_DIR="${1:-./}"
ARCHIVE_NAME="Pruebas-del-IMSS-$(date +%Y%m%d-%H%M%S).tar.gz"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Descarga de Repositorio IMSS (tar.gz)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Servidor: ${BLUE}${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo -e "Ruta remota: ${YELLOW}${REMOTE_PATH}${NC}"
echo -e "Archivo destino: ${YELLOW}${DEST_DIR}/${ARCHIVE_NAME}${NC}"
echo ""

# Crear directorio destino si no existe
mkdir -p "$DEST_DIR"

echo -e "${YELLOW}Paso 1: Creando archivo tar.gz en servidor remoto...${NC}"
echo "Esto puede tardar varios minutos..."
echo ""
echo -e "${BLUE}Nota: Se te pedirá la contraseña SSH${NC}"
echo ""

# Crear tar.gz en el servidor remoto (excluyendo archivos innecesarios)
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd /home/administrador && tar -czf /tmp/${ARCHIVE_NAME} \
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

if [ $? -ne 0 ]; then
    echo -e "${RED}Error al crear el archivo tar.gz en el servidor${NC}"
    exit 1
fi

echo -e "${YELLOW}Paso 2: Descargando archivo tar.gz...${NC}"
echo ""

# Descargar el archivo
scp "${REMOTE_USER}@${REMOTE_HOST}:/tmp/${ARCHIVE_NAME}" "${DEST_DIR}/"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error al descargar el archivo${NC}"
    # Limpiar archivo temporal en servidor
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "rm -f /tmp/${ARCHIVE_NAME}" 2>/dev/null || true
    exit 1
fi

echo -e "${YELLOW}Paso 3: Limpiando archivo temporal en servidor...${NC}"

# Limpiar archivo temporal en servidor
ssh "${REMOTE_USER}@${REMOTE_HOST}" "rm -f /tmp/${ARCHIVE_NAME}" 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Descarga completada exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Archivo descargado: ${YELLOW}${DEST_DIR}/${ARCHIVE_NAME}${NC}"
echo ""
echo -e "${BLUE}Para extraer el archivo:${NC}"
echo "  cd ${DEST_DIR}"
echo "  tar -xzf ${ARCHIVE_NAME}"
echo ""
echo -e "${BLUE}O en un solo comando:${NC}"
echo "  cd ${DEST_DIR} && tar -xzf ${ARCHIVE_NAME} && cd Pruebas-del-IMSS"
echo ""
echo -e "${BLUE}Próximos pasos después de extraer:${NC}"
echo "  1. cd Pruebas-del-IMSS"
echo "  2. cp env.example env.local"
echo "  3. python3 -m venv venv"
echo "  4. source venv/bin/activate"
echo "  5. pip install -r requirements.txt"
echo "  6. cd UI_IMSS && npm install"
echo ""

