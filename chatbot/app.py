from flask import Flask
from flask_cors import CORS
from routes import init_routes
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Habilitar CORS para que el frontend pueda comunicarse
CORS(app, origins=["http://localhost:3000"])

# Inicializar las rutas
init_routes(app)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

