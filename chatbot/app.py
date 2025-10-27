"""
Flask Backend (Legacy - Usar main.py con FastAPI)
Este archivo se mantiene solo por compatibilidad
"""

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Habilitar CORS
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])

if __name__ == '__main__':
    print("⚠️  Este archivo usa Flask (legacy)")
    print("✅ Usa 'python main.py' para FastAPI asíncrono")
    app.run(debug=True, host='0.0.0.0', port=5001)

