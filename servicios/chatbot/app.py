# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import logging
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(name)s] - %(message)s')
logger = logging.getLogger(__name__)

def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)
    
    # Enable CORS
    CORS(app, origins=['http://localhost:3000', 'http://gateway:3000'])
    
    # Configuration
    app.config['MEDGEMMA_ENDPOINT'] = os.getenv('MEDGEMMA_ENDPOINT')
    app.config['LM_STUDIO_URL'] = os.getenv('LM_STUDIO_URL', 'http://localhost:1234')
    app.config['FLASK_PORT'] = int(os.getenv('FLASK_PORT', 5001))
    
    return app

app = create_app()

def get_llm_response(message, context=""):
    """Obtiene respuesta del modelo de IA."""
    try:
        # Intentar con LM Studio primero
        lm_studio_url = f"{app.config['LM_STUDIO_URL']}/v1/chat/completions"
        
        payload = {
            "model": "medgemma-4b-it",
            "messages": [
                {
                    "role": "system",
                    "content": f"Eres un asistente médico especializado en radiología e imagenología. "
                              f"Proporciona respuestas precisas, profesionales y educativas sobre temas médicos. "
                              f"Si no estás seguro de algo, dilo claramente. "
                              f"Contexto adicional: {context}"
                },
                {
                    "role": "user",
                    "content": message
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        response = requests.post(lm_studio_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if 'choices' in data and len(data['choices']) > 0:
                return data['choices'][0]['message']['content']
        
        # Fallback a MedGemma endpoint si está configurado
        if app.config['MEDGEMMA_ENDPOINT']:
            medgemma_payload = {
                "prompt": f"Contexto médico: {context}\n\nPregunta: {message}\n\nRespuesta:",
                "max_tokens": 500,
                "temperature": 0.7
            }
            
            response = requests.post(app.config['MEDGEMMA_ENDPOINT'], json=medgemma_payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('response', 'No se pudo generar una respuesta.')
        
        return "Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta de nuevo."
        
    except Exception as e:
        logger.error(f"Error en get_llm_response: {e}")
        return "Error interno del servidor. Por favor, intenta de nuevo más tarde."

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'servicio-chatbot',
        'port': app.config['FLASK_PORT']
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Endpoint principal para el chat médico."""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Mensaje requerido'}), 400
        
        message = data['message']
        context = data.get('context', '')
        
        logger.info(f"Procesando mensaje: {message[:100]}...")
        
        response = get_llm_response(message, context)
        
        return jsonify({
            'response': response,
            'timestamp': str(__import__('datetime').datetime.now())
        })
        
    except Exception as e:
        logger.error(f"Error en endpoint chat: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Obtiene el historial de chat (implementación básica)."""
    # En una implementación real, esto vendría de una base de datos
    return jsonify({
        'history': [],
        'message': 'Historial no implementado en esta versión'
    })

@app.route('/api/models', methods=['GET'])
def get_available_models():
    """Obtiene los modelos disponibles."""
    models = []
    
    # Verificar LM Studio
    try:
        response = requests.get(f"{app.config['LM_STUDIO_URL']}/v1/models", timeout=5)
        if response.status_code == 200:
            models.append({
                'name': 'MedGemma-4B',
                'provider': 'LM Studio',
                'status': 'available'
            })
    except:
        pass
    
    # Verificar MedGemma endpoint
    if app.config['MEDGEMMA_ENDPOINT']:
        models.append({
            'name': 'MedGemma-27B',
            'provider': 'Google Health AI',
            'status': 'available'
        })
    
    return jsonify({'models': models})

if __name__ == '__main__':
    logger.info(f"Iniciando Servicio Chatbot en puerto {app.config['FLASK_PORT']}")
    app.run(host='0.0.0.0', port=app.config['FLASK_PORT'], debug=False)
