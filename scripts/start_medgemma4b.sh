#!/bin/bash

# ===================================================================
# Script para montar medgemma-4b en Ollama
# Verifica si Ollama está corriendo antes de ejecutar el modelo
# ===================================================================

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para verificar si Ollama está corriendo
check_ollama_running() {
    # Verificar si el puerto 11434 está en uso
    if lsof -i :11434 >/dev/null 2>&1 || ss -tlnp 2>/dev/null | grep -q ":11434"; then
        return 0  # Ollama está corriendo
    fi
    
    # Verificar si hay procesos de Ollama
    if pgrep -x ollama >/dev/null 2>&1; then
        return 0  # Ollama está corriendo
    fi
    
    return 1  # Ollama no está corriendo
}

# Función para verificar si el modelo está disponible
check_model_available() {
    if ollama list 2>/dev/null | grep -q "medgemma-4b"; then
        return 0  # Modelo disponible
    fi
    return 1  # Modelo no disponible
}

# Verificar si Ollama está corriendo
echo -e "${YELLOW}Verificando si Ollama está corriendo...${NC}"
if check_ollama_running; then
    echo -e "${GREEN}✅ Ollama está corriendo${NC}"
else
    echo -e "${RED}❌ Ollama no está corriendo${NC}"
    echo -e "${YELLOW}💡 Inicia Ollama primero con: ollama serve${NC}"
    exit 1
fi

# Verificar si el modelo está disponible
echo -e "${YELLOW}Verificando si el modelo medgemma-4b está disponible...${NC}"
if check_model_available; then
    echo -e "${GREEN}✅ Modelo medgemma-4b disponible${NC}"
else
    echo -e "${RED}❌ Modelo medgemma-4b no encontrado${NC}"
    echo -e "${YELLOW}💡 Descarga el modelo primero con: ollama pull amsaravi/medgemma-4b-it:q8${NC}"
    exit 1
fi

# Ejecutar el modelo
echo -e "${GREEN}🚀 Iniciando medgemma-4b...${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para salir${NC}"
echo ""

# Ejecutar el modelo con las GPUs disponibles
CUDA_VISIBLE_DEVICES=0,1,2,3 ollama run amsaravi/medgemma-4b-it:q8


