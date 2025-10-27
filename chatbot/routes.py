from flask import request, jsonify, Response, stream_with_context
from llm_client import LLMClient
import uuid
from datetime import datetime
import base64
import asyncio
import json
from medical_analysis import analyze_image_with_fallback
from media_storage import media_storage
from memory_manager import get_memory_manager
from langchain_system import get_medical_chain

llm_client = LLMClient()
memory_manager = get_memory_manager()
medical_chain = get_medical_chain()

def init_routes(app):
    
    @app.route('/api/chat', methods=['POST'])
    def chat():
        """Endpoint para enviar mensajes al chatbot con soporte para imágenes médicas y streaming"""
        try:
            data = request.json
            message = data.get('message', '')
            image_data = data.get('image', None)
            image_format = data.get('image_format', 'jpeg')
            session_id = data.get('session_id') or data.get('conversation_id')
            stream = data.get('stream', False)  # Soporte para streaming
            
            if not message and not image_data:
                return jsonify({'error': 'Message or image is required'}), 400
            
            # Si hay imagen, procesar con análisis médico
            if image_data:
                # Procesar imagen con análisis médico asíncrono
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    analysis_result = loop.run_until_complete(
                        analyze_image_with_fallback(
                            image_data=image_data,
                            image_format=image_format,
                            prompt=message or "Analiza esta imagen médica del IMSS"
                        )
                    )
                    
                    if analysis_result.get('success'):
                        # Guardar imagen en almacenamiento
                        file_info = media_storage.save_from_base64(
                            base64_data=image_data,
                            mimetype=f"image/{image_format}",
                            session_id=session_id
                        )
                        
                        return jsonify({
                            'response': analysis_result.get('analysis', ''),
                            'session_id': session_id or str(uuid.uuid4()),
                            'is_image_analysis': True,
                            'model_used': analysis_result.get('model', 'unknown'),
                            'provider': analysis_result.get('provider', 'unknown'),
                            'file_info': file_info
                        })
                    else:
                        return jsonify({
                            'error': f"Error en análisis de imagen: {analysis_result.get('error')}",
                            'session_id': session_id or str(uuid.uuid4())
                        }), 500
                finally:
                    loop.close()
            
            # Generar conversation_id si no existe
            if not session_id:
                session_id = str(uuid.uuid4())
            
            # Procesar imagen + texto con LM Studio
            if image_data:
                # Si hay imagen, enviar directamente a LM Studio con análisis
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    # Usar análisis médico para imágenes
                    if stream:
                        # Para streaming con imagen
                        def generate():
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            try:
                                async def process():
                                    chunks = []
                                    async for chunk in medical_chain.stream_medical_analysis(message, image_data, session_id):
                                        chunks.append(chunk)
                                    return chunks
                                
                                chunks = loop.run_until_complete(process())
                                
                                for chunk in chunks:
                                    yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
                                yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                            finally:
                                loop.close()
                        
                        return Response(
                            stream_with_context(generate()),
                            mimetype='text/event-stream',
                            headers={
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive',
                                'X-Accel-Buffering': 'no'
                            }
                        )
                    else:
                        # Sin streaming - necesitamos una función async interna
                        async def process_analysis():
                            analysis_result = await analyze_image_with_fallback(
                                image_data, 
                                image_format, 
                                message or "Analiza esta radiografía médica del IMSS"
                            )
                            return analysis_result
                        
                        analysis_result = loop.run_until_complete(process_analysis())
                        
                        if analysis_result.get('success'):
                            file_info = media_storage.save_from_base64(base64_data=image_data, mimetype=f"image/{image_format}", session_id=session_id)
                            return jsonify({
                                'response': analysis_result.get('analysis', ''),
                                'session_id': session_id,
                                'is_image_analysis': True
                            })
                        else:
                            return jsonify({'error': analysis_result.get('error', 'Unknown error')}), 500
                finally:
                    loop.close()
            
            # Si streaming está habilitado, usar LangChain con streaming
            if stream:
                def generate():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        # Crear task para procesar async
                        async def process():
                            chunks = []
                            async for chunk in medical_chain.stream_chat(message, session_id):
                                chunks.append(chunk)
                            return chunks
                        
                        # Ejecutar async y obtener chunks
                        chunks = loop.run_until_complete(process())
                        
                        # Yield chunks
                        for chunk in chunks:
                            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
                        yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                    finally:
                        loop.close()
                
                return Response(
                    stream_with_context(generate()),
                    mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Accel-Buffering': 'no'
                    }
                )
            else:
                # Procesar mensaje con LangChain sin streaming
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    response = loop.run_until_complete(
                        medical_chain.process_chat(message, session_id)
                    )
                    
                    return jsonify({
                        'response': response,
                        'session_id': session_id
                    })
                finally:
                    loop.close()
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/history', methods=['GET'])
    def get_history():
        """Obtener historial de conversaciones"""
        # TODO: Implementar persistencia real
        return jsonify({
            'conversations': []
        })
    
    @app.route('/api/image-analysis', methods=['POST'])
    def image_analysis():
        """Endpoint específico para análisis de imágenes médicas"""
        try:
            data = request.json
            image_data = data.get('image_data')
            image_format = data.get('image_format', 'jpeg')
            prompt = data.get('prompt', 'Analiza esta imagen médica del IMSS')
            session_id = data.get('session_id')
            
            if not image_data:
                return jsonify({'error': 'image_data is required'}), 400
            
            # Procesar imagen con análisis médico asíncrono
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                analysis_result = loop.run_until_complete(
                    analyze_image_with_fallback(
                        image_data=image_data,
                        image_format=image_format,
                        prompt=prompt
                    )
                )
                
                if analysis_result.get('success'):
                    # Guardar imagen en almacenamiento
                    file_info = media_storage.save_from_base64(
                        base64_data=image_data,
                        mimetype=f"image/{image_format}",
                        session_id=session_id
                    )
                    
                    return jsonify({
                        'success': True,
                        'analysis': analysis_result.get('analysis', ''),
                        'model_used': analysis_result.get('model', 'unknown'),
                        'provider': analysis_result.get('provider', 'unknown'),
                        'file_info': file_info
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': analysis_result.get('error', 'Unknown error')
                    }), 500
            finally:
                loop.close()
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/health', methods=['GET'])
    def health():
        """Health check"""
        return jsonify({'status': 'ok', 'medical_analyzer': 'enabled'})

