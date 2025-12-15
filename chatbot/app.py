"""
Flask Backend (Legacy - Usar main.py con FastAPI)
Este archivo se mantiene solo por compatibilidad
"""

import os
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Configurar CORS para permitir conexiones remotas
# Permitir conexiones desde cualquier origen para desarrollo remoto
# En producción, configurar con lista específica de orígenes permitidos
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
if CORS_ORIGINS == "*":
    CORS(app, resources={r"/*": {"origins": "*"}})
else:
    origins_list = [origin.strip() for origin in CORS_ORIGINS.split(",")]
    CORS(app, resources={r"/*": {"origins": origins_list}})

if __name__ == '__main__':
    print("⚠️  Este archivo usa Flask (legacy)")
    print("✅ Usa 'python main.py' para FastAPI asíncrono")
    app.run(debug=True, host='0.0.0.0', port=5001)

