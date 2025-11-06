"""
Sistema completo de LangChain para Chatbot IMSS
Incluye: Fallback automático, Few-shot, Streaming, Memoria avanzada
"""

import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
import asyncio
import httpx
from langchain_openai import ChatOpenAI
from optimizations import get_http_pool
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage, ChatMessage
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnableSequence, RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate, FewShotPromptTemplate
import json
import os

logger = logging.getLogger(__name__)


class FallbackLLM:
    """LLM conectado a vLLM con Ray Serve (compatible con OpenAI API)"""
    
    def __init__(self, vllm_endpoint: str = "http://localhost:8000/v1/"):
        self.vllm_endpoint = vllm_endpoint
        # Configurar ChatOpenAI para usar vLLM con Ray Serve (compatible con OpenAI API)
        self.ollama_llm = ChatOpenAI(
            model="google/medgemma-27b-it",
            base_url=vllm_endpoint,
            api_key="not-needed",  # api_key dummy para vLLM (requerido pero no usado)
            temperature=0.7,
            max_tokens=100,  # Configurable según necesidad
            streaming=False,  # Sin streaming - recibir respuesta completa
        )
        
        logger.info(f"✅ Configurado para usar vLLM con Ray Serve en: {vllm_endpoint}")
        logger.info(f"✅ Modelo: google/medgemma-27b-it")
    
    async def invoke(self, messages: List[BaseMessage], **kwargs) -> Any:
        """Invocar LLM desde vLLM con Ray Serve"""
        try:
            response = await self.ollama_llm.ainvoke(messages, **kwargs)
            logger.info("✅ Respuesta desde vLLM con Ray Serve")
            return response
        except Exception as e:
            logger.error(f"❌ Error en vLLM: {e}")
            raise
    
    async def stream(self, messages: List[BaseMessage], **kwargs) -> AsyncGenerator[str, None]:
        """Streaming desde vLLM con Ray Serve"""
        try:
            async for chunk in self.ollama_llm.astream(messages, **kwargs):
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
    
    def __init__(self, vllm_endpoint: str = "http://localhost:8000/v1/"):
        self.llm = FallbackLLM(vllm_endpoint)
        self.memory = EntityMemory()
        self.output_parser = StrOutputParser()
        
        # Cargar prompt médico
        self.system_prompt = self._load_medical_prompt()
        # Few-shot: se cargan desde prompts/few_shots.json
        self.few_shots: List[Dict[str, str]] = self._load_few_shots()
    
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
    
    def _load_few_shots(self) -> List[Dict[str, str]]:
        """Cargar ejemplos few-shot desde prompts/few_shots.json"""
        try:
            prompt_dir = os.path.join(os.path.dirname(__file__), 'prompts')
            fs_path = os.path.join(prompt_dir, 'few_shots.json')
            if os.path.exists(fs_path):
                with open(fs_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        cleaned: List[Dict[str, str]] = []
                        for item in data:
                            if isinstance(item, dict):
                                cleaned.append({
                                    "user": str(item.get("user", "")),
                                    "assistant": str(item.get("assistant", ""))
                                })
                        return cleaned
        except Exception as e:
            logger.warning(f"⚠️ No se pudieron cargar few-shots: {e}")
        return []
    
    def _normalize_text(self, text: str) -> str:
        """Normalizar texto para asegurar espacios correctos entre palabras"""
        if not text:
            return text
        
        import re
        
        # Primero, normalizar espacios múltiples a un solo espacio
        text = re.sub(r'\s+', ' ', text)
        
        # Detectar y separar palabras concatenadas (palabras en español comunes)
        # Patrón para detectar transiciones de minúscula a mayúscula (posible inicio de palabra)
        # Ejemplo: "holaSoy" -> "hola Soy"
        text = re.sub(r'([a-záéíóúñü])([A-ZÁÉÍÓÚÑÜ])', r'\1 \2', text)
        
        # Detectar transiciones de mayúscula a minúscula después de una palabra completa
        # Ejemplo: "Soytu" -> "Soy tu" (pero no "IMSS" -> "IM SS")
        # Solo si la primera letra es mayúscula y la siguiente es minúscula
        text = re.sub(r'([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü])', r'\1 \2', text)
        
        # Asegurar espacios después de signos de puntuación comunes (excepto si ya hay espacio)
        text = re.sub(r'([.!?,:;])([^\s])', r'\1 \2', text)
        
        # Asegurar espacios antes de signos de puntuación de apertura
        text = re.sub(r'([^\s])([¡¿])', r'\1 \2', text)
        
        # Asegurar espacios después de signos de puntuación de cierre
        text = re.sub(r'([!?])([^\s])', r'\1 \2', text)
        
        # Separar palabras comunes concatenadas (patrones comunes en español)
        # Ejemplo: "puedoayudarte" -> "puedo ayudarte"
        common_patterns = [
            (r'([a-záéíóúñü]+)(puedo|soy|eres|es|son|estoy|estás|está|están)', r'\1 \2'),
            (r'(puedo|soy|eres|es|son|estoy|estás|está|están)([a-záéíóúñü]+)', r'\1 \2'),
            (r'([a-záéíóúñü]+)(ayudarte|ayudar|ayuda|ayudan)', r'\1 \2'),
            (r'(ayudarte|ayudar|ayuda|ayudan)([a-záéíóúñü]+)', r'\1 \2'),
            (r'([a-záéíóúñü]+)(asistente|especializado|médico)', r'\1 \2'),
            (r'(asistente|especializado|médico)([a-záéíóúñü]+)', r'\1 \2'),
        ]
        
        for pattern, replacement in common_patterns:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # Normalizar espacios múltiples nuevamente después de todas las transformaciones
        text = re.sub(r'\s+', ' ', text)
        
        # Limpiar espacios al inicio y final
        text = text.strip()
        
        return text
    
    async def process_chat(self, user_message: str, session_id: str = "", use_entities: bool = True) -> str:
        """Procesar chat con contexto de memoria usando LCEL completo con Few-shot, OutputParsers, etc."""
        try:
            # Construcción de contexto en paralelo (entidades + recientes)
            async def build_entity_ctx() -> str:
                return self.memory.get_entity_context() if use_entities else ""

            async def build_recent_msgs() -> List[Dict[str, Any]]:
                return self.memory.get_recent_messages(limit=3)

            entity_ctx, recent_msgs = await asyncio.gather(build_entity_ctx(), build_recent_msgs())

            # Formatear contexto reciente
            def format_recent(recent: List[Dict[str, Any]]) -> str:
                if not recent:
                    return ""
                lines = ["## Conversación reciente:"]
                for msg in recent:
                    role = "Usuario" if msg["role"] == "user" else "Asistente"
                    content = msg["content"][:150] + "..." if len(msg["content"]) > 150 else msg["content"]
                    lines.append(f"{role}: {content}")
                return "\n".join(lines)

            # Construir mensajes usando ChatPromptTemplate con Few-shot
            # Crear mensajes con estructura: System + Few-shot examples + User message
            messages_list: List[BaseMessage] = []
            
            # System message con contexto
            system_content = f"{self.system_prompt}\n\n{entity_ctx or ''}\n\n{format_recent(recent_msgs)}".strip()
            messages_list.append(SystemMessage(content=system_content))
            
            # Few-shot examples (HumanMessage + AIMessage)
            for example in (self.few_shots or [])[:2]:  # Máximo 2 ejemplos few-shot
                if example.get("user") and example.get("assistant"):
                    messages_list.append(HumanMessage(content=example["user"]))
                    messages_list.append(AIMessage(content=example["assistant"]))
            
            # User message actual
            messages_list.append(HumanMessage(content=user_message))

            # Usar LCEL: pasar mensajes directamente al LLM y luego al OutputParser
            # Invocar LLM directamente con los mensajes
            response = await self.llm.ollama_llm.ainvoke(messages_list)
            
            # Extraer contenido - asegurar que obtenemos el contenido correctamente
            if hasattr(response, 'content'):
                answer = response.content
            elif hasattr(response, 'text'):
                answer = response.text
            else:
                answer = str(response)
            
            # Parsear con OutputParser si es necesario
            try:
                answer = self.output_parser.parse(answer)
            except Exception:
                # Si el parser falla, usar el texto directamente
                pass
            
            # Normalizar el texto: asegurar espacios correctos entre palabras
            # Esto corrige problemas donde los tokens se concatenan sin espacios
            answer = self._normalize_text(answer)

            # Guardar en memoria
            self.memory.add_message("user", user_message)
            self.memory.add_message("assistant", answer)

            return answer
            
        except Exception as e:
            logger.error(f"❌ Error procesando chat: {e}")
            return f"Lo siento, ocurrió un error: {str(e)}"

    async def build_context_messages(self, user_message: str, use_entities: bool = True) -> List[BaseMessage]:
        """Construir mensajes (System+Human) con el mismo contexto usado en process_chat."""
        async def build_entity_ctx() -> str:
            return self.memory.get_entity_context() if use_entities else ""

        async def build_recent_msgs() -> List[Dict[str, Any]]:
            return self.memory.get_recent_messages(limit=3)

        entity_ctx, recent_msgs = await asyncio.gather(build_entity_ctx(), build_recent_msgs())

        def format_recent(recent: List[Dict[str, Any]]) -> str:
            if not recent:
                return ""
            lines = ["## Conversación reciente:"]
            for msg in recent:
                role = "Usuario" if msg["role"] == "user" else "Asistente"
                content = msg["content"][:150] + "..." if len(msg["content"]) > 150 else msg["content"]
                lines.append(f"{role}: {content}")
            return "\n".join(lines)

        system_text = "\n".join([
            self.system_prompt,
            (entity_ctx or ""),
            format_recent(recent_msgs),
        ]).strip()

        return [
            SystemMessage(content=system_text),
            HumanMessage(content=user_message)
        ]

    async def estimate_usage_from_messages(self, messages: List[BaseMessage]) -> Dict[str, Any]:
        """Realiza una llamada directa (no streaming) a vLLM para obtener usage tokens."""
        try:
            # Adaptar mensajes a formato OpenAI
            def to_openai(m: BaseMessage):
                role = 'user'
                if isinstance(m, SystemMessage):
                    role = 'system'
                elif isinstance(m, AIMessage):
                    role = 'assistant'
                return {"role": role, "content": getattr(m, 'content', str(m))}

            messages_data = [to_openai(m) for m in messages]

            # Usar connection pool para estimación de tokens
            client = get_http_pool()
            resp = await client.post(
                f"{self.llm.vllm_endpoint}chat/completions",
                json={
                    "model": "google/medgemma-27b-it",
                    "messages": messages_data,
                    "temperature": 0.0,
                    "max_tokens": 1,
                    "stream": False,
                },
                timeout=60.0
            )
            if resp.status_code == 200:
                data = resp.json()
                usage = data.get("usage", {})
                return {
                    "input_tokens": usage.get("prompt_tokens"),
                    "output_tokens": usage.get("completion_tokens"),
                    "total_tokens": usage.get("total_tokens"),
                    "model": data.get("model"),
                    "system_fingerprint": data.get("system_fingerprint"),
                }
            else:
                logger.warning(f"⚠️ estimate_usage status={resp.status_code}")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo estimar usage: {e}")
        return {}
    
    async def stream_chat(self, user_message: str, session_id: str = "") -> AsyncGenerator[str, None]:
        """Procesar chat con streaming usando LCEL completo con Few-shot, Runnable, etc."""
        try:
            # Construcción de contexto paralela
            async def build_entity_ctx() -> str:
                return self.memory.get_entity_context()

            async def build_recent_msgs() -> List[Dict[str, Any]]:
                return self.memory.get_recent_messages(limit=3)

            entity_context, recent_messages = await asyncio.gather(build_entity_ctx(), build_recent_msgs())

            # Formatear contexto reciente
            def format_recent(recent: List[Dict[str, Any]]) -> str:
                if not recent:
                    return ""
                lines = ["## Conversación reciente:"]
                for msg in recent:
                    role = "Usuario" if msg["role"] == "user" else "Asistente"
                    content = msg["content"][:150] + "..." if len(msg["content"]) > 150 else msg["content"]
                    lines.append(f"{role}: {content}")
                return "\n".join(lines)

            # Construir mensajes con Few-shot usando BaseMessage
            messages_list: List[BaseMessage] = []
            
            # System message con contexto
            system_content = f"{self.system_prompt}\n\n{entity_context or ''}\n\n{format_recent(recent_messages)}".strip()
            messages_list.append(SystemMessage(content=system_content))
            
            # Few-shot examples (HumanMessage + AIMessage)
            for example in (self.few_shots or [])[:2]:  # Máximo 2 ejemplos few-shot
                if example.get("user") and example.get("assistant"):
                    messages_list.append(HumanMessage(content=example["user"]))
                    messages_list.append(AIMessage(content=example["assistant"]))
            
            # User message actual
            messages_list.append(HumanMessage(content=user_message))

            # Stream response usando LangChain con LCEL
            # Usar RunnableSequence para streaming: messages -> LLM (streaming) -> OutputParser
            full_response = ""
            async for chunk in self.llm.stream(messages_list):
                full_response += chunk
                yield chunk
            
            # Guardar en memoria
            self.memory.add_message("user", user_message)
            self.memory.add_message("assistant", full_response)
            
        except Exception as e:
            logger.error(f"❌ Error en streaming: {e}")
            yield f"Error: {str(e)}"

    def build_json_chain(self) -> RunnableSequence:
        """Cadena LCEL que obliga salida JSON estructurada para hallazgos médicos usando OutputParser."""
        schema = {
            "type": "object",
            "properties": {
                "resumen": {"type": "string"},
                "posibles_causas": {"type": "array", "items": {"type": "string"}},
                "recomendaciones": {"type": "array", "items": {"type": "string"}},
                "nivel_urgencia": {"type": "string", "enum": ["baja", "media", "alta"]},
            },
            "required": ["resumen", "recomendaciones"]
        }
        # Usar JsonOutputParser para parsear la salida del LLM
        json_parser = JsonOutputParser()
        
        # Construir ChatPromptTemplate con estructura clara
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}\n\nDevuelve SIEMPRE JSON válido que cumpla este esquema: {schema}\n\n{format_instructions}"),
            ("human", "{user_message}"),
        ])
        
        # Cadena LCEL completa: Prompt -> LLM -> JsonOutputParser
        chain = (
            prompt
            | self.llm.ollama_llm
            | json_parser
        )
        
        return chain

    async def process_chat_json(self, user_message: str) -> Dict[str, Any]:
        """Procesar chat retornando JSON estructurado usando OutputParser."""
        chain = self.build_json_chain()
        json_parser = JsonOutputParser()
        
        return await chain.ainvoke({
            "system_prompt": self.system_prompt,
            "schema": "resumen:string, posibles_causas:string[], recomendaciones:string[], nivel_urgencia:[baja|media|alta]",
            "format_instructions": json_parser.get_format_instructions(),
            "user_message": user_message,
        })
    
    async def stream_medical_analysis(self, user_message: str, image_data: str, session_id: str = "") -> AsyncGenerator[str, None]:
        """Procesar análisis médico de imágenes con streaming usando formato multimodal"""
        try:
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
            
            logger.info(f"🖼️ Enviando imagen multimodal a vLLM con Ray Serve...")
            logger.info(f"📏 Tamaño de imagen base64: {len(image_data)} caracteres")
            
            # Llamar a vLLM con streaming usando connection pool
            client = get_http_pool()  # Usar pool de conexiones reutilizable
            async with client.stream(
                "POST",
                f"{self.llm.vllm_endpoint}chat/completions",
                json={
                    "model": "google/medgemma-27b-it",
                    "messages": messages_data,
                    "temperature": 0.7,
                    "max_tokens": 100,
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
                    logger.error(f"❌ Error en vLLM: {response.status_code} - {error_text}")
                    yield f"Error: No se pudo procesar la imagen ({response.status_code})"
            
        except Exception as e:
            logger.error(f"❌ Error en análisis médico: {e}")
            yield f"Error: {str(e)}"


# Instancia global
_medical_chain = None

def get_medical_chain(vllm_endpoint: str = None) -> MedicalChain:
    """Obtener instancia de la cadena médica"""
    global _medical_chain
    
    # Si no se proporciona endpoint, intentar obtener desde variables de entorno
    if vllm_endpoint is None:
        vllm_endpoint = os.getenv("VLLM_ENDPOINT", "http://localhost:8000/v1/")
        # Asegurar que termine con /v1/ para compatibilidad con OpenAI API
        if not vllm_endpoint.endswith("/v1/"):
            if vllm_endpoint.endswith("/"):
                vllm_endpoint = vllm_endpoint + "v1/"
            else:
                vllm_endpoint = vllm_endpoint + "/v1/"
    
    if _medical_chain is None:
        _medical_chain = MedicalChain(vllm_endpoint)
    return _medical_chain

