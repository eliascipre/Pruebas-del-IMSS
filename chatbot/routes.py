from flask import request, jsonify
from llm_client import LLMClient
import uuid
from datetime import datetime

llm_client = LLMClient()

def init_routes(app):
    
    @app.route('/api/chat', methods=['POST'])
    def chat():
        """Endpoint para enviar mensajes al chatbot"""
        try:
            data = request.json
            message = data.get('message', '')
            conversation_id = data.get('conversation_id')
            
            if not message:
                return jsonify({'error': 'Message is required'}), 400
            
            # Obtener respuesta del LLM
            response = llm_client.generate_response(message)
            
            # Generar conversation_id si no existe
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
            
            return jsonify({
                'response': response,
                'conversation_id': conversation_id
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/history', methods=['GET'])
    def get_history():
        """Obtener historial de conversaciones"""
        # TODO: Implementar persistencia real
        return jsonify({
            'conversations': []
        })
    
    @app.route('/health', methods=['GET'])
    def health():
        """Health check"""
        return jsonify({'status': 'ok'})

