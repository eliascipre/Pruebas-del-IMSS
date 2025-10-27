#!/bin/bash

# Script para iniciar el backend con FastAPI
# Uso: ./run.sh

echo "🚀 Iniciando Chatbot IMSS Backend con FastAPI"
echo "📡 Puerto: 5001"
echo "🌐 URL: http://localhost:5001"
echo ""

# Instalar dependencias si es necesario
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar venv
source venv/bin/activate

# Instalar dependencias
echo "📦 Instalando dependencias..."
pip install -q -r requirements.txt

# Iniciar FastAPI
echo "🔥 Iniciando servidor..."
uvicorn main:app --host 0.0.0.0 --port 5001 --reload

