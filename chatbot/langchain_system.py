"""
Sistema completo de LangChain para Chatbot IMSS
Incluye: Fallback automático, Few-shot, Streaming, Memoria avanzada
"""

import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
import json
import os

logger = logging.getLogger(__name__)


class FallbackLLM:
    """LLM conectado directamente a LM Studio local"""
    
    def __init__(self, lm_studio_endpoint: str = "http://localhost:1234/v1/"):
        self.lm_studio_endpoint = lm_studio_endpoint
        # Configurar ChatOpenAI con api_key dummy para LM Studio
        self.lm_studio_llm = ChatOpenAI(
            model="medgemma-4b-it",
            base_url=lm_studio_endpoint,
            api_key="lm-studio",  # api_key dummy para LM Studio
            temperature=0.7,
            max_tokens=-1,  # -1 para sin límite
            streaming=True,
        )
        
        logger.info("✅ Configurado para usar LM Studio local")
    
    async def invoke(self, messages: List[BaseMessage], **kwargs) -> Any:
        """Invocar LLM desde LM Studio"""
        try:
            response = await self.lm_studio_llm.ainvoke(messages, **kwargs)
            logger.info("✅ Respuesta desde LM Studio")
            return response
        except Exception as e:
            logger.error(f"❌ Error en LM Studio: {e}")
            raise
    
    async def stream(self, messages: List[BaseMessage], **kwargs) -> AsyncGenerator[str, None]:
        """Streaming desde LM Studio"""
        try:
            async for chunk in self.lm_studio_llm.astream(messages, **kwargs):
                if hasattr(chunk, 'content'):
                    yield chunk.content
                else:
                    yield str(chunk)
        except Exception as e:
            logger.error(f"❌ Error en streaming: {e}")
            yield f"Error: {str(e)}"


class EntityMemory:
    """Memoria que extrae y recuerda entidades importantes"""
    
    def __init__(self):
        self.entities = {}  # {entity_type: {entity_name: {info, mentions}}}
        self.messages = []
    
    def add_message(self, role: str, content: str):
        """Agregar mensaje y extraer entidades"""
        self.messages.append({
            "role": role,
            "content": content,
        })
        
        if role == "user":
            self._extract_entities(content)
    
    def _extract_entities(self, content: str):
        """Extraer entidades del contenido"""
        import re
        
        # Patrones para entidades médicas
        entity_patterns = {
            "síntomas": r"(dolor|síntoma|malestar|molestia|incomodidad|problema)\s+([a-záéíóúñ\s]+)?",
            "enfermedades": r"(diabetes|hipertensión|gripe|resfriado|covid|asma|artritis)",
            "medicamentos": r"(paracetamol|ibuprofeno|aspirina|antibiotico|medicamento)",
            "órganos": r"(corazón|pulmón|hígado|riñón|cerebro|estómago)",
            "edades": r"(\d+)\s*años",
            "género": r"(hombre|mujer|varón|femenino)",
        }
        
        content_lower = content.lower()
        
        for entity_type, pattern in entity_patterns.items():
            matches = re.findall(pattern, content_lower)
            if matches:
                if entity_type not in self.entities:
                    self.entities[entity_type] = {}
                
                for match in matches:
                    if isinstance(match, tuple):
                        entity_name = " ".join([m for m in match if m])
                    else:
                        entity_name = match
                    
                    if entity_name and len(entity_name) > 2:
                        if entity_name not in self.entities[entity_type]:
                            self.entities[entity_type][entity_name] = {
                                "mentions": 0,
                                "context": content[:100]
                            }
                        self.entities[entity_type][entity_name]["mentions"] += 1
    
    def get_entity_context(self) -> str:
        """Obtener contexto de entidades para incluir en el prompt"""
        if not self.entities:
            return ""
        
        context_parts = ["## Información médica relevante del usuario:"]
        
        for entity_type, entities in self.entities.items():
            if entities:
                context_parts.append(f"\n**{entity_type.title()}:**")
                for entity_name, info in entities.items():
                    context_parts.append(f"- {entity_name} (mencionado {info['mentions']} veces)")
        
        return "\n".join(context_parts)
    
    def get_recent_messages(self, limit: int = 3) -> List[Dict[str, Any]]:
        """Obtener últimos mensajes"""
        return self.messages[-limit:] if self.messages else []


class MedicalChain:
    """Cadena LangChain para análisis médico del IMSS"""
    
    def __init__(self, lm_studio_endpoint: str = "http://localhost:1234/v1/"):
        self.llm = FallbackLLM(lm_studio_endpoint)
        self.memory = EntityMemory()
        self.output_parser = StrOutputParser()
        
        # Cargar prompt médico
        self.system_prompt = self._load_medical_prompt()
    
    def _load_medical_prompt(self) -> str:
        """Cargar prompt médico desde archivo"""
        try:
            prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'medico.md')
            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Extraer el system prompt principal
                if '## System Prompt Principal' in content:
                    start = content.find('## System Prompt Principal') + len('## System Prompt Principal')
                    end = content.find('##', start)
                    if end > start:
                        return content[start:end].strip()
                return content
        except Exception as e:
            logger.warning(f"⚠️ Error cargando prompt médico: {e}")
        
        # Fallback
        return """Eres un asistente médico especializado del IMSS que proporciona información médica general, 
interpretación de síntomas y guías de salud preventiva. 

IMPORTANTE: Siempre recomiendas consultar con profesionales de la salud del IMSS para diagnósticos específicos 
y tratamientos médicos. Responde en español."""
    
    async def process_chat(self, user_message: str, session_id: str = "", use_entities: bool = True) -> str:
        """Procesar chat con contexto de memoria"""
        try:
            # Construir contexto
            context_parts = [self.system_prompt]
            
            # Agregar contexto de entidades si se usa
            if use_entities:
                entity_context = self.memory.get_entity_context()
                if entity_context:
                    context_parts.append("\n\n" + entity_context)
            
            # Agregar mensajes recientes
            recent_messages = self.memory.get_recent_messages(limit=3)
            if recent_messages:
                context_parts.append("\n\n## Conversación reciente:")
                for msg in recent_messages:
                    role = "Usuario" if msg["role"] == "user" else "Asistente"
                    content = msg["content"][:150] + "..." if len(msg["content"]) > 150 else msg["content"]
                    context_parts.append(f"{role}: {content}")
            
            # Crear mensajes para LangChain
            messages = [
                SystemMessage(content="\n".join(context_parts)),
                HumanMessage(content=user_message)
            ]
            
            # Procesar con LangChain
            response = await self.llm.invoke(messages)
            
            # Extraer respuesta
            answer = response.content if hasattr(response, 'content') else str(response)
            
            # Guardar en memoria
            self.memory.add_message("user", user_message)
            self.memory.add_message("assistant", answer)
            
            return answer
            
        except Exception as e:
            logger.error(f"❌ Error procesando chat: {e}")
            return f"Lo siento, ocurrió un error: {str(e)}"
    
    async def stream_chat(self, user_message: str, session_id: str = "") -> AsyncGenerator[str, None]:
        """Procesar chat con streaming"""
        try:
            # Construir contexto (mismo que process_chat)
            context_parts = [self.system_prompt]
            
            entity_context = self.memory.get_entity_context()
            if entity_context:
                context_parts.append("\n\n" + entity_context)
            
            recent_messages = self.memory.get_recent_messages(limit=3)
            if recent_messages:
                context_parts.append("\n\n## Conversación reciente:")
                for msg in recent_messages:
                    role = "Usuario" if msg["role"] == "user" else "Asistente"
                    content = msg["content"][:150] + "..." if len(msg["content"]) > 150 else msg["content"]
                    context_parts.append(f"{role}: {content}")
            
            # Crear mensajes
            messages = [
                SystemMessage(content="\n".join(context_parts)),
                HumanMessage(content=user_message)
            ]
            
            # Stream response
            full_response = ""
            async for chunk in self.llm.stream(messages):
                full_response += chunk
                yield chunk
            
            # Guardar en memoria
            self.memory.add_message("user", user_message)
            self.memory.add_message("assistant", full_response)
            
        except Exception as e:
            logger.error(f"❌ Error en streaming: {e}")
            yield f"Error: {str(e)}"
    
    async def stream_medical_analysis(self, user_message: str, image_data: str, session_id: str = "") -> AsyncGenerator[str, None]:
        """Procesar análisis médico de imágenes con streaming usando formato multimodal"""
        try:
            import httpx
            
            # Construir prompt para análisis de imagen
            analysis_prompt = f"""{self.system_prompt}

IMPORTANTE: El usuario ha compartido una radiografía/imagen médica.
Analiza la imagen proporcionada y proporciona:
1. Descripción de estructuras anatómicas visibles
2. Hallazgos normales vs anormales
3. Posibles patologías o alteraciones
4. Recomendaciones profesionales
5. Siempre remitir a consulta médica del IMSS para confirmación

Prompt del usuario: {user_message if user_message else 'Analiza esta radiografía médica'}"""

            # Crear mensaje multimodal según formato de LangChain/OpenAI
            user_prompt_text = user_message if user_message else "Analiza esta radiografía médica en detalle"
            
            # Formato multimodal: content es un array con type: text y type: image_url
            multimodal_content = [
                {
                    "type": "text",
                    "text": user_prompt_text
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data}"
                    }
                }
            ]
            
            messages_data = [
                {"role": "system", "content": analysis_prompt},
                {"role": "user", "content": multimodal_content}
            ]
            
            logger.info(f"🖼️ Enviando imagen multimodal a LM Studio...")
            logger.info(f"📏 Tamaño de imagen base64: {len(image_data)} caracteres")
            
            # Llamar a LM Studio con streaming
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.llm.lm_studio_endpoint}chat/completions",
                    json={
                        "model": "medgemma-4b-it",
                        "messages": messages_data,
                        "temperature": 0.7,
                        "max_tokens": -1,
                        "stream": True
                    }
                ) as response:
                    if response.status_code == 200:
                        logger.info("✅ Respuesta streaming iniciada correctamente")
                        async for line in response.aiter_lines():
                            if line.startswith("data: ") and line.strip() != "data: [DONE]":
                                try:
                                    data = json.loads(line[6:])
                                    if "choices" in data and len(data["choices"]) > 0:
                                        delta_content = data["choices"][0].get("delta", {}).get("content", "")
                                        if delta_content:
                                            yield delta_content
                                except:
                                    pass
                    else:
                        error_text = await response.aread()
                        logger.error(f"❌ Error en LM Studio: {response.status_code} - {error_text}")
                        yield f"Error: No se pudo procesar la imagen ({response.status_code})"
            
        except Exception as e:
            logger.error(f"❌ Error en análisis médico: {e}")
            yield f"Error: {str(e)}"


# Instancia global
_medical_chain = None

def get_medical_chain(lm_studio_endpoint: str = "http://localhost:1234/v1/") -> MedicalChain:
    """Obtener instancia de la cadena médica"""
    global _medical_chain
    if _medical_chain is None:
        _medical_chain = MedicalChain(lm_studio_endpoint)
    return _medical_chain

