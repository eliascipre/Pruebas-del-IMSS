# LLMClient ya no se usa - todo se maneja con LangChain
# Mantener por compatibilidad pero devolver mensaje indicando que no se usa

class LLMClient:
    def __init__(self):
        self.available = False
        print("ℹ️  LLMClient ya no se usa. Todo se maneja con LangChain + LM Studio.")
    
    def _get_medical_prompt(self):
        """Obtener el prompt médico especializado del IMSS"""
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'medico.md')
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Extraer el contenido principal del prompt
                if '## System Prompt Principal' in content:
                    start = content.find('## System Prompt Principal')
                    end = content.find('## Especialización')
                    if end > start:
                        return content[start:end].replace('## System Prompt Principal', '').strip()
                return content
        except Exception as e:
            print(f"Error leyendo prompt médico: {e}")
        
        # Fallback al prompt básico
        return """Eres un asistente médico especializado del IMSS que proporciona información médica general, 
interpretación de síntomas y guías de salud preventiva. 

IMPORTANTE: Siempre recomiendas consultar con profesionales de la salud del IMSS para diagnósticos específicos 
y tratamientos médicos. Responde en español.

Capacidades:
- Interpretación de síntomas y signos
- Información sobre medicamentos y tratamientos (NO prescribir)
- Guías de salud preventiva y bienestar
- Orientación sobre especialidades médicas del IMSS

Limitaciones:
- NO diagnostica enfermedades
- NO prescribe medicamentos
- NO reemplaza la consulta médica profesional
- Siempre recomienda consultar con profesionales del IMSS"""
    
    def generate_response(self, message, is_medical=False):
        """Generar respuesta usando el LLM con soporte médico"""
        if not self.available:
            # Respuesta simulada si no hay API key
            return self._mock_response(message)
        
        try:
            # Usar prompt médico si está habilitado
            if is_medical:
                system_prompt = self._get_medical_prompt()
                full_prompt = f"""{system_prompt}

Usuario: {message}
Asistente:"""
            else:
                full_prompt = f"""Eres un asistente médico especializado en imagenología para el IMSS.
                Responde de manera profesional y educativa.
                
                Usuario: {message}
                Asistente:"""
            
            response = self.model.generate_content(
                full_prompt,
                generation_config={
                    'temperature': 0.7,
                    'max_output_tokens': 2000,  # Aumentado para respuestas más completas
                }
            )
            return response.text
        except Exception as e:
            print(f"Error al generar respuesta: {e}")
            return self._mock_response(message)
    
    def _mock_response(self, message):
        """Respuesta simulada para desarrollo"""
        return f"He recibido tu mensaje: '{message}'. Esta es una respuesta simulada. Configura GEMINI_API_KEY para usar el LLM real."

