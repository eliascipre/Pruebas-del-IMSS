import google.generativeai as genai
import os

class LLMClient:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            self.available = True
        else:
            self.available = False
            print("⚠️  GEMINI_API_KEY no configurada. Usando respuestas simuladas.")
    
    def generate_response(self, message):
        """Generar respuesta usando el LLM"""
        if not self.available:
            # Respuesta simulada si no hay API key
            return self._mock_response(message)
        
        try:
            response = self.model.generate_content(
                f"""Eres un asistente médico especializado en imagenología para el IMSS.
                Responde de manera profesional y educativa.
                
                Usuario: {message}
                Asistente:""",
                generation_config={
                    'temperature': 0.7,
                    'max_output_tokens': 500,
                }
            )
            return response.text
        except Exception as e:
            print(f"Error al generar respuesta: {e}")
            return self._mock_response(message)
    
    def _mock_response(self, message):
        """Respuesta simulada para desarrollo"""
        return f"He recibido tu mensaje: '{message}'. Esta es una respuesta simulada. Configura GEMINI_API_KEY para usar el LLM real."

