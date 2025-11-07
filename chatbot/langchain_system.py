"""
Sistema completo de LangChain para Chatbot IMSS
Incluye: Fallback automático, Few-shot, Streaming, Memoria avanzada
Integración completa con LangChain: ChatMessageHistory, LCEL, Runnables, OutputParsers
"""

import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
import asyncio
import httpx
import sqlite3
import json
import os
import time

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage, ChatMessage
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser, PydanticOutputParser
from langchain_core.runnables import (
    RunnableLambda, 
    RunnableParallel, 
    RunnableSequence, 
    RunnablePassthrough,
    Runnable
)
from langchain_core.prompts import (
    ChatPromptTemplate, 
    MessagesPlaceholder, 
    PromptTemplate, 
    FewShotPromptTemplate
)
from langchain_community.chat_message_histories import ChatMessageHistory
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# Modelo Pydantic para análisis médico estructurado
class MedicalAnalysis(BaseModel):
    """Modelo Pydantic para análisis médico estructurado"""
    resumen: str = Field(description="Resumen del análisis médico")
    posibles_causas: List[str] = Field(default_factory=list, description="Lista de posibles causas")
    recomendaciones: List[str] = Field(description="Lista de recomendaciones médicas")
    nivel_urgencia: str = Field(description="Nivel de urgencia: baja, media, alta")


class SQLiteChatMessageHistory(ChatMessageHistory):
    """ChatMessageHistory persistido en SQLite - Integración completa con LangChain"""
    
    def __init__(self, session_id: str, db_path: str = "chatbot.db"):
        super().__init__()
        # Usar object.__setattr__ para evitar validación de Pydantic v2
        object.__setattr__(self, 'session_id', session_id)
        object.__setattr__(self, 'db_path', db_path)
        self._load_messages()
    
    def _load_messages(self):
        """Cargar mensajes desde SQLite y convertirlos a BaseMessage"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT role, content, metadata
                FROM messages
                WHERE session_id = ?
                ORDER BY timestamp ASC
            """, (self.session_id,))
            
            for row in cursor.fetchall():
                role, content, metadata_str = row
                metadata = json.loads(metadata_str) if metadata_str else {}
                
                # Convertir a BaseMessage según el rol
                if role == "user":
                    self.add_user_message(content)
                elif role == "assistant":
                    self.add_ai_message(content)
                elif role == "system":
                    self.messages.append(SystemMessage(content=content))
            
            conn.close()
            logger.debug(f"✅ Cargados {len(self.messages)} mensajes desde SQLite para sesión {self.session_id}")
        except Exception as e:
            logger.error(f"❌ Error cargando mensajes desde SQLite: {e}")
    
    def add_user_message(self, content: str):
        """Agregar mensaje de usuario y persistir en SQLite"""
        super().add_user_message(content)
        self._persist_message("user", content)
    
    def add_ai_message(self, content: str):
        """Agregar mensaje de AI y persistir en SQLite"""
        super().add_ai_message(content)
        self._persist_message("assistant", content)
    
    def add_message(self, message: BaseMessage):
        """Agregar mensaje BaseMessage y persistir"""
        super().add_message(message)
        
        # Determinar rol y contenido
        if isinstance(message, HumanMessage):
            self._persist_message("user", message.content)
        elif isinstance(message, AIMessage):
            self._persist_message("assistant", message.content)
        elif isinstance(message, SystemMessage):
            self._persist_message("system", message.content)
    
    def _persist_message(self, role: str, content: str):
        """Persistir mensaje en SQLite"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO messages (session_id, role, content, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (self.session_id, role, content, int(time.time()), json.dumps({})))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Error persistiendo mensaje en SQLite: {e}")


class FallbackLLM:
    """LLM conectado a vLLM con Ray Serve (compatible con OpenAI API)"""
    
    def __init__(self, vllm_endpoint: str = "http://localhost:8000/v1/"):
        self.vllm_endpoint = vllm_endpoint
        # Configurar ChatOpenAI para usar vLLM con Ray Serve (compatible con OpenAI API)
        self.ollama_llm = ChatOpenAI(
            model="google/medgemma-27b",
            base_url=vllm_endpoint,
            api_key="not-needed",  # api_key dummy para vLLM (requerido pero no usado)
            temperature=0.7,
            max_tokens=2048,  # Aumentado de 100 a 2048 para respuestas más completas
            streaming=False,
        )
        
        logger.info(f"✅ Configurado para usar vLLM con Ray Serve en: {vllm_endpoint}")
        logger.info(f"✅ Modelo: google/medgemma-27b")
    
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
        """
        Streaming desde vLLM con Ray Serve - Llamada directa con httpx como curl
        
        Optimizado para:
        - Conversión eficiente de mensajes LangChain → OpenAI
        - Manejo robusto de errores con logging detallado
        - Streaming de chunks con max_tokens configurable (2048 por defecto)
        """
        try:
            # Optimización: Conversión directa sin funciones anidadas para mejor rendimiento
            messages_data = []
            for m in messages:
                # Determinar rol de forma eficiente
                if isinstance(m, SystemMessage):
                    role = 'system'
                elif isinstance(m, AIMessage):
                    role = 'assistant'
                else:
                    role = 'user'
                
                # Obtener contenido de forma segura
                content = getattr(m, 'content', None)
                if content is None:
                    content = str(m) if m else ""
                else:
                    content = str(content)
                
                # Solo agregar mensajes con contenido no vacío
                if content.strip():
                    messages_data.append({"role": role, "content": content})
            
            if not messages_data:
                logger.warning("⚠️ No hay mensajes válidos para enviar a vLLM")
                yield "Error: No hay mensajes válidos para procesar"
                return
            
            # Logging detallado para debugging
            logger.info(f"📤 Enviando {len(messages_data)} mensajes a vLLM")
            total_chars = sum(len(m.get("content", "")) for m in messages_data)
            logger.debug(f"📊 Total de caracteres en mensajes: {total_chars}")
            
            # Preparar payload con max_tokens aumentado a 2048
            max_tokens = kwargs.get('max_tokens', 2048)  # Configurable, por defecto 2048
            payload = {
                "model": "google/medgemma-27b",
                "messages": messages_data,
                "temperature": kwargs.get('temperature', 0.7),
                "max_tokens": max_tokens,
                "stream": True
            }
            
            logger.debug(f"📦 Payload configurado: model={payload['model']}, max_tokens={max_tokens}, temperature={payload['temperature']}")
            
            # Llamar directamente a vLLM con httpx (igual que el curl que funciona)
            chunks_received = 0
            chunks_with_content = 0
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                try:
                    async with client.stream(
                        "POST",
                        f"{self.vllm_endpoint}chat/completions",
                        json=payload
                    ) as response:
                        if response.status_code == 200:
                            logger.debug("✅ Conexión streaming establecida con vLLM")
                            async for line in response.aiter_lines():
                                chunks_received += 1
                                if line.startswith("data: ") and line.strip() != "data: [DONE]":
                                    try:
                                        data = json.loads(line[6:])
                                        if "choices" in data and len(data["choices"]) > 0:
                                            delta_content = data["choices"][0].get("delta", {}).get("content", "")
                                            if delta_content:
                                                chunks_with_content += 1
                                                yield delta_content
                                    except json.JSONDecodeError as json_err:
                                        logger.warning(f"⚠️ Error parseando JSON del chunk {chunks_received}: {json_err} - Línea: {line[:100]}")
                                        continue
                                    except Exception as parse_err:
                                        logger.warning(f"⚠️ Error procesando chunk {chunks_received}: {parse_err}")
                                        continue
                            
                            logger.info(f"✅ Streaming completado: {chunks_received} chunks recibidos, {chunks_with_content} con contenido")
                        else:
                            # Manejo detallado de errores HTTP
                            error_text = await response.aread()
                            error_str = error_text.decode('utf-8', errors='replace') if error_text else 'Unknown error'
                            
                            logger.error(f"❌ Error HTTP {response.status_code} en vLLM")
                            logger.error(f"📋 Detalles del error: {error_str[:500]}")
                            logger.error(f"📦 Payload enviado: {json.dumps(payload, ensure_ascii=False, indent=2)[:1000]}")
                            logger.error(f"🔗 Endpoint: {self.vllm_endpoint}chat/completions")
                            
                            # Intentar parsear error si es JSON
                            try:
                                error_json = json.loads(error_str)
                                error_detail = error_json.get('error', {}).get('message', error_str)
                                yield f"Error: {error_detail}"
                            except:
                                yield f"Error: No se pudo procesar la solicitud ({response.status_code})"
                except httpx.TimeoutException as timeout_err:
                    logger.error(f"❌ Timeout esperando respuesta de vLLM: {timeout_err}")
                    yield "Error: Timeout esperando respuesta del servidor"
                except httpx.RequestError as req_err:
                    logger.error(f"❌ Error de conexión con vLLM: {req_err}")
                    logger.error(f"🔗 Endpoint: {self.vllm_endpoint}chat/completions")
                    yield f"Error: No se pudo conectar con el servidor - {str(req_err)}"
                except Exception as stream_err:
                    logger.error(f"❌ Error inesperado en streaming: {stream_err}", exc_info=True)
                    yield f"Error: {str(stream_err)}"
                    
        except Exception as e:
            logger.error(f"❌ Error crítico en streaming: {e}", exc_info=True)
            logger.error(f"📋 Tipo de error: {type(e).__name__}")
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
    """Cadena LangChain para análisis médico del IMSS - Integración completa con LangChain"""
    
    def __init__(self, vllm_endpoint: str = "http://localhost:8000/v1/", db_path: str = "chatbot.db"):
        self.llm = FallbackLLM(vllm_endpoint)
        self.memory = EntityMemory()
        self.db_path = db_path
        
        # Output parsers
        self.str_parser = StrOutputParser()
        self.json_parser = JsonOutputParser()
        self.pydantic_parser = PydanticOutputParser(pydantic_object=MedicalAnalysis)
        
        # Cargar prompt médico
        self.system_prompt = self._load_medical_prompt()
        # Few-shot: se cargan desde prompts/few_shots.json
        self.few_shots: List[Dict[str, str]] = self._load_few_shots()
        
        # Crear ChatPromptTemplate con MessagesPlaceholder para historial
        self.chat_prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            # MessagesPlaceholder para inyectar historial dinámicamente
            MessagesPlaceholder(variable_name="history"),
            # Few-shot examples (se inyectan como mensajes)
            ("human", "{user_message}"),
        ])
        
        # Crear FewShotPromptTemplate para ejemplos
        self.few_shot_template = self._create_few_shot_template()
        
        # Crear cadenas LCEL
        self.chain = self._build_chain()
        self.json_chain = self._build_json_chain()
        self.structured_chain = self._build_structured_chain()
    
    def _get_chat_history(self, session_id: str) -> SQLiteChatMessageHistory:
        """Obtener ChatMessageHistory para una sesión"""
        if not session_id:
            # Si no hay session_id, crear uno temporal
            session_id = "temp_" + str(int(time.time()))
        return SQLiteChatMessageHistory(session_id=session_id, db_path=self.db_path)
    
    def _create_few_shot_template(self) -> Optional[FewShotPromptTemplate]:
        """Crear FewShotPromptTemplate para ejemplos"""
        if not self.few_shots:
            return None
        
        example_prompt = PromptTemplate(
            input_variables=["user", "assistant"],
            template="Usuario: {user}\nAsistente: {assistant}"
        )
        
        few_shot_template = FewShotPromptTemplate(
            examples=self.few_shots[:2],  # Máximo 2 ejemplos
            example_prompt=example_prompt,
            prefix="Aquí hay algunos ejemplos de conversaciones médicas:",
            suffix="",
            input_variables=[]
        )
        
        return few_shot_template
    
    def _format_few_shots_as_messages(self) -> List[BaseMessage]:
        """Formatear few-shot examples como mensajes BaseMessage"""
        messages = []
        for example in (self.few_shots or [])[:2]:
            if example.get("user") and example.get("assistant"):
                messages.append(HumanMessage(content=example["user"]))
                messages.append(AIMessage(content=example["assistant"]))
        return messages
    
    def _get_entity_context(self) -> str:
        """Obtener contexto de entidades (síncrono)"""
        return self.memory.get_entity_context()
    
    async def _get_entity_context_async(self) -> str:
        """Obtener contexto de entidades (async)"""
        await asyncio.sleep(0.01)  # Simular I/O
        return self.memory.get_entity_context()
    
    def _build_chain(self) -> RunnableSequence:
        """Construir cadena LCEL completa para chat normal"""
        
        # Preparar contexto en paralelo
        prepare_context = RunnableParallel({
            "entity_context": RunnableLambda(lambda x: self._get_entity_context()),
            "system_prompt": RunnableLambda(lambda x: self.system_prompt),
            "user_message": RunnablePassthrough(),
        })
        
        # Formatear mensajes con historial y few-shot
        def format_messages(context: dict) -> List[BaseMessage]:
            """Formatear mensajes desde contexto"""
            messages = []
            
            # System message con contexto de entidades
            system_content = f"{context['system_prompt']}\n\n{context.get('entity_context', '')}".strip()
            messages.append(SystemMessage(content=system_content))
            
            # Few-shot examples
            few_shot_messages = self._format_few_shots_as_messages()
            messages.extend(few_shot_messages)
            
            # User message
            messages.append(HumanMessage(content=context['user_message']))
            
            return messages
        
        format_messages_runnable = RunnableLambda(format_messages)
        
        # Cadena completa: contexto → mensajes → LLM → parser
        chain = (
            prepare_context
            | format_messages_runnable
            | self.llm.ollama_llm
            | self.str_parser
        )
        
        return chain
    
    def _build_json_chain(self) -> RunnableSequence:
        """Construir cadena LCEL con JsonOutputParser"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}\n\nDevuelve SIEMPRE JSON válido que cumpla este esquema: {schema}\n\n{format_instructions}"),
            ("human", "{user_message}"),
        ])
        
        chain = (
            prompt
            | self.llm.ollama_llm
            | self.json_parser
        )
        
        return chain
    
    def _build_structured_chain(self) -> RunnableSequence:
        """Construir cadena LCEL con PydanticOutputParser"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}\n\n{format_instructions}"),
            ("human", "{user_message}"),
        ])
        
        chain = (
            prompt
            | self.llm.ollama_llm
            | self.pydantic_parser
        )
        
        return chain
    
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
    
    def _fix_fragmented_words(self, text: str) -> str:
        """Corregir palabras fragmentadas comunes en español"""
        if not text:
            return text
        
        import re
        
        original_text = text
        logger.debug(f"🔧 Corrigiendo palabras fragmentadas (longitud: {len(text)})")
        logger.debug(f"📝 Texto original: '{text[:100]}...'")
        
        # Correcciones específicas para fragmentos comunes
        # Orden importante: aplicar las más específicas primero
        
        # 1. Corregir "¡ola" -> "¡Hola" (al inicio o después de espacio)
        text = re.sub(r'(^|\s)¡ola', r'\1¡Hola', text, flags=re.IGNORECASE)
        
        # 2. Corregir "ola" al inicio de frase -> "Hola"
        if text.startswith('ola') or text.startswith('¡ola'):
            if text.startswith('¡ola'):
                text = '¡Hola' + text[4:]
            elif text.startswith('ola'):
                text = 'Hola' + text[3:]
        
        # 3. Corregir "¿ué" -> "¿Qué" (al inicio o después de espacio)
        text = re.sub(r'(^|\s)¿ué', r'\1¿Qué', text, flags=re.IGNORECASE)
        
        # 4. Corregir "ué" después de "¿" -> "Qué"
        text = re.sub(r'¿ué', '¿Qué', text, flags=re.IGNORECASE)
        
        # 5. Corregir "do rte" -> "duele"
        text = re.sub(r'do\s+rte', 'duele', text, flags=re.IGNORECASE)
        
        # 6. Corregir "rte" después de "do " -> "duele"
        text = re.sub(r'do\s+rte', 'duele', text, flags=re.IGNORECASE)
        
        # 7. Corregir "ola" seguido de signo de puntuación -> "Hola"
        text = re.sub(r'ola([¿¡\s])', r'Hola\1', text, flags=re.IGNORECASE)
        
        # 8. Corregir "ué" seguido de signo de puntuación -> "Qué"
        text = re.sub(r'ué([¿¡\s])', r'Qué\1', text, flags=re.IGNORECASE)
        
        if text != original_text:
            logger.debug(f"✅ Texto corregido (longitud: {len(text)})")
            logger.debug(f"📝 Texto corregido: '{text[:100]}...'")
        else:
            logger.debug(f"ℹ️ Texto no cambió después de corrección")
        
        return text
    
    def _normalize_text(self, text: str) -> str:
        """Normalizar texto para asegurar espacios correctos entre palabras"""
        if not text:
            return text
        
        import re
        
        original_text = text
        logger.debug(f"🔧 Normalizando texto (longitud original: {len(text)})")
        logger.debug(f"📝 Texto original: '{text[:100]}...'")
        
        # Primero, corregir palabras fragmentadas
        text = self._fix_fragmented_words(text)
        if text != original_text:
            logger.debug(f"✅ Texto corregido después de fix_fragmented_words: '{text[:100]}...'")
        
        # Normalizar espacios múltiples a un solo espacio
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
        
        # Normalizar espacios múltiples nuevamente después de todas las transformaciones
        text = re.sub(r'\s+', ' ', text)
        
        # Limpiar espacios al inicio y final
        text = text.strip()
        
        if text != original_text:
            logger.debug(f"✅ Texto normalizado (longitud: {len(text)})")
            logger.debug(f"📝 Texto normalizado: '{text[:100]}...'")
        else:
            logger.debug(f"ℹ️ Texto no cambió después de normalización")
        
        return text
    
    async def process_chat(self, user_message: str, session_id: str = "", use_entities: bool = True) -> str:
        """Procesar chat con contexto de memoria usando LCEL completo con historial, Few-shot, OutputParsers"""
        try:
            # Obtener historial de conversación desde SQLite
            history = self._get_chat_history(session_id)
            
            # Preparar contexto en paralelo (async optimizado)
            async def prepare_context():
                entity_ctx = await self._get_entity_context_async() if use_entities else ""
                return {
                    "entity_context": entity_ctx,
                    "history": history.messages[-5:],  # Últimos 5 mensajes
                }
            
            context = await prepare_context()
            
            # Formatear mensajes - SIMPLIFICADO para evitar errores 500 en vLLM
            # El servidor vLLM usa apply_chat_template() que puede tener problemas con muchos mensajes
            messages_list: List[BaseMessage] = []
            
            # System message con contexto de entidades (combinar todo en un solo system message)
            system_content = f"{self.system_prompt}"
            if context.get('entity_context'):
                system_content += f"\n\n{context.get('entity_context', '')}"
            system_content = system_content.strip()
            messages_list.append(SystemMessage(content=system_content))
            
            # Historial de conversación (solo últimos 3 mensajes para evitar payload muy grande)
            if context.get('history'):
                # Tomar solo los últimos 3 mensajes del historial
                recent_history = context['history'][-3:] if len(context['history']) > 3 else context['history']
                messages_list.extend(recent_history)
            
            # NO incluir few-shot examples en la llamada directa (pueden causar problemas con apply_chat_template)
            # Los few-shot ya están en el system_prompt si son necesarios
            
            # User message actual
            messages_list.append(HumanMessage(content=user_message))
            
            # Llamada directa a vLLM sin streaming (similar a estimate_usage_from_messages)
            # Adaptar mensajes a formato OpenAI
            def to_openai(m: BaseMessage):
                role = 'user'
                if isinstance(m, SystemMessage):
                    role = 'system'
                elif isinstance(m, AIMessage):
                    role = 'assistant'
                return {"role": role, "content": getattr(m, 'content', str(m))}
            
            messages_data = [to_openai(m) for m in messages_list]
            
            # VALIDAR Y CORREGIR el orden de roles para que alternen correctamente
            # El chat template de MedGemma requiere: system -> user -> assistant -> user -> assistant...
            # Después del system, los roles deben alternar user/assistant
            if len(messages_data) > 1:
                # El primer mensaje debe ser system
                if messages_data[0]["role"] != "system":
                    logger.warning("⚠️ El primer mensaje no es system, agregando system al inicio")
                    messages_data.insert(0, {"role": "system", "content": ""})
                
                # Validar y corregir la alternancia después del system
                corrected_messages = [messages_data[0]]  # Mantener el system message
                expected_role = "user"  # Después del system, el primer mensaje debe ser user
                
                for i in range(1, len(messages_data)):
                    msg = messages_data[i].copy()  # Copiar para no modificar el original
                    current_role = msg["role"]
                    
                    # Si es system, saltarlo (ya tenemos uno al inicio)
                    if current_role == "system":
                        logger.warning(f"⚠️ Mensaje {i} es system, saltándolo (ya hay uno al inicio)")
                        continue
                    
                    # Si el rol no coincide con el esperado, corregirlo
                    if current_role != expected_role:
                        logger.warning(f"⚠️ Mensaje {i} tiene rol '{current_role}' pero se esperaba '{expected_role}', corrigiendo...")
                        msg["role"] = expected_role
                    
                    corrected_messages.append(msg)
                    
                    # Alternar el rol esperado
                    expected_role = "assistant" if expected_role == "user" else "user"
                
                # Asegurar que el último mensaje sea user (el mensaje actual del usuario)
                if corrected_messages[-1]["role"] != "user":
                    logger.warning("⚠️ El último mensaje no es user, el chat template requiere que termine en user")
                    # Si el último mensaje es assistant, necesitamos agregar un user message
                    # Pero el user message ya debería estar ahí, así que esto no debería pasar
                    # Solo loguear el warning
                
                messages_data = corrected_messages
                logger.info(f"✅ Mensajes corregidos: {len(messages_data)} mensajes con roles alternados correctamente")
                # Log de los roles para debugging
                roles_sequence = [m["role"] for m in messages_data]
                logger.debug(f"📋 Secuencia de roles: {' -> '.join(roles_sequence)}")
            
            # Log del tamaño de los mensajes para debugging
            total_chars = sum(len(m.get("content", "")) for m in messages_data)
            logger.info(f"📊 Enviando {len(messages_data)} mensajes a vLLM (total: {total_chars} caracteres)")
            
            # Log del primer mensaje para debugging (solo los primeros 200 caracteres)
            if messages_data:
                first_msg_preview = str(messages_data[0].get("content", ""))[:200]
                logger.info(f"📋 Primer mensaje (preview): {first_msg_preview}...")
            
            # Validar que los mensajes no estén vacíos
            for i, msg in enumerate(messages_data):
                if not msg.get("content") or not msg.get("content").strip():
                    logger.warning(f"⚠️ Mensaje {i} está vacío: {msg}")
            
            # Llamada directa a vLLM sin streaming con reintentos automáticos
            # Aumentar reintentos y delay inicial para manejar errores 500 temporales de vLLM
            max_retries = 5  # Aumentado de 3 a 5
            retry_delay = 1.0  # Aumentado de 0.5s a 1.0s para dar más tiempo a vLLM
            
            # Preparar el payload exactamente como el curl que funciona
            # El curl funciona con "google/medgemma-27b" aunque el servidor esté configurado con "google/medgemma-27b-it"
            # vLLM acepta ambos nombres si el modelo base es el mismo
            payload = {
                "model": "google/medgemma-27b",  # Usar el mismo nombre que el curl que funciona
                "messages": messages_data,
                "temperature": 0.7,
                "max_tokens": 2048,
                "stream": False,
            }
            
            # Log del payload completo en el primer intento para debugging
            if len(messages_data) > 10 or total_chars > 10000:
                logger.warning(f"⚠️ Payload muy grande: {len(messages_data)} mensajes, {total_chars} caracteres")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                for attempt in range(max_retries):
                    try:
                        # Log del request en el primer intento
                        if attempt == 0:
                            logger.info(f"📤 Enviando request a {self.llm.vllm_endpoint}chat/completions")
                        
                        resp = await client.post(
                            f"{self.llm.vllm_endpoint}chat/completions",
                            json=payload,
                            headers={
                                "Content-Type": "application/json",
                            },
                        )
                        
                        if resp.status_code == 200:
                            data = resp.json()
                            answer = data["choices"][0]["message"]["content"]
                            if attempt > 0:
                                logger.info(f"✅ Respuesta recibida desde vLLM (sin streaming) después de {attempt + 1} intentos")
                            else:
                                logger.info("✅ Respuesta recibida desde vLLM (sin streaming)")
                            break
                        else:
                            error_text = resp.text[:1000]  # Aumentar tamaño del error para logging
                            if attempt < max_retries - 1:
                                logger.warning(f"⚠️ Error {resp.status_code} en vLLM (intento {attempt + 1}/{max_retries}), reintentando en {retry_delay:.2f}s...")
                                if resp.status_code == 500:
                                    logger.error(f"📋 Detalles del error 500: {error_text}")
                                    # Log del request que falló para debugging
                                    logger.error(f"📋 Request que falló: {len(messages_data)} mensajes, {total_chars} caracteres")
                                    if attempt == 0:  # Solo en el primer intento
                                        logger.error(f"📋 Primeros 3 mensajes: {json.dumps(messages_data[:3], indent=2, ensure_ascii=False)[:500]}")
                                await asyncio.sleep(retry_delay)
                                retry_delay *= 1.5  # Backoff exponencial más suave (1.5x en lugar de 2x)
                            else:
                                logger.error(f"❌ Error en vLLM después de {max_retries} intentos: {resp.status_code} - {error_text}")
                                raise Exception(f"HTTP {resp.status_code}: {error_text}")
                    except httpx.HTTPError as e:
                        if attempt < max_retries - 1:
                            logger.warning(f"⚠️ Error de conexión en vLLM (intento {attempt + 1}/{max_retries}), reintentando en {retry_delay:.2f}s...")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 1.5
                        else:
                            logger.error(f"❌ Error de conexión en vLLM después de {max_retries} intentos: {e}")
                            raise
                    except httpx.TimeoutException as e:
                        if attempt < max_retries - 1:
                            logger.warning(f"⚠️ Timeout en vLLM (intento {attempt + 1}/{max_retries}), reintentando en {retry_delay:.2f}s...")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 1.5
                        else:
                            logger.error(f"❌ Timeout en vLLM después de {max_retries} intentos: {e}")
                            raise
            
            # NO guardar en historial aquí - main.py ya guarda los mensajes
            # Esto evita duplicados cuando se carga la conversación
            # history.add_user_message(user_message)  # Comentado - main.py ya lo guarda
            # history.add_ai_message(answer)  # Comentado - main.py ya lo guarda
            
            # Guardar en memoria de entidades (solo para contexto, no para persistencia)
            self.memory.add_message("user", user_message)
            self.memory.add_message("assistant", answer)
            
            return answer
            
        except Exception as e:
            logger.error(f"❌ Error procesando chat: {e}")
            return f"Lo siento, ocurrió un error: {str(e)}"

    async def build_context_messages(self, user_message: str, session_id: str = "", use_entities: bool = True) -> List[BaseMessage]:
        """Construir mensajes (System+Human) con el mismo contexto usado en process_chat."""
        # Obtener historial
        history = self._get_chat_history(session_id)
        
        # Preparar contexto
        entity_ctx = await self._get_entity_context_async() if use_entities else ""
        history_messages = history.messages[-5:]
        
        # Formatear mensajes
        messages_list: List[BaseMessage] = []
        
        # System message con contexto de entidades
        system_content = f"{self.system_prompt}\n\n{entity_ctx or ''}".strip()
        messages_list.append(SystemMessage(content=system_content))
        
        # Historial (si existe)
        if history_messages:
            messages_list.extend(history_messages)
        
        # Few-shot examples
        few_shot_messages = self._format_few_shots_as_messages()
        messages_list.extend(few_shot_messages)
        
        # User message
        messages_list.append(HumanMessage(content=user_message))
        
        return messages_list

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

            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.llm.vllm_endpoint}chat/completions",
                    json={
                        "model": "google/medgemma-27b",
                        "messages": messages_data,
                        "temperature": 0.0,
                        "max_tokens": 1,
                        "stream": False,
                    },
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
        """Procesar chat con streaming usando LCEL completo con historial, Few-shot, Runnable"""
        try:
            # Obtener historial de conversación desde SQLite
            history = self._get_chat_history(session_id)
            
            # Preparar contexto en paralelo (async optimizado)
            entity_context = await self._get_entity_context_async()
            history_messages = history.messages[-5:]  # Últimos 5 mensajes
            
            # Formatear mensajes con historial y few-shot
            messages_list: List[BaseMessage] = []
            
            # System message - Simplificar para evitar errores 500
            # Usar un prompt simple y básico similar al curl que funciona
            system_content = "Eres un asistente médico del IMSS. Responde en español de manera clara y profesional."
            messages_list.append(SystemMessage(content=system_content))
            
            # Historial de conversación (solo últimos 2 mensajes para evitar sobrecarga)
            # Filtrar para evitar duplicados del mensaje actual
            if history_messages:
                # Verificar si el último mensaje del historial es el mismo que el mensaje actual
                last_message = history_messages[-1] if history_messages else None
                if last_message and isinstance(last_message, HumanMessage):
                    if last_message.content == user_message:
                        # Si el último mensaje es el mismo, no agregar el historial (ya está incluido)
                        history_messages = history_messages[:-1]
                
                if history_messages:
                    messages_list.extend(history_messages[-2:])
            
            # Few-shot examples - Deshabilitar temporalmente para debugging
            # few_shot_messages = self._format_few_shots_as_messages()
            # messages_list.extend(few_shot_messages)
            
            # User message actual
            messages_list.append(HumanMessage(content=user_message))
            
            # Guardar user message en historial (solo si no está ya guardado)
            # Verificar si el último mensaje del historial es diferente
            if not history.messages or (history.messages[-1].content != user_message if isinstance(history.messages[-1], HumanMessage) else True):
                history.add_user_message(user_message)
            
            # Stream response usando el método stream() de FallbackLLM que calcula deltas correctamente
            # Este método maneja automáticamente los deltas y espacios entre chunks
            accumulated_text = ""
            chunk_count = 0
            
            logger.info(f"🔄 Iniciando streaming para mensaje: {user_message[:50]}...")
            
            # Usar stream() de FallbackLLM que maneja deltas correctamente
            async for delta in self.llm.stream(messages_list):
                if delta:
                    chunk_count += 1
                    accumulated_text += delta
                    logger.debug(f"📦 Chunk #{chunk_count} enviado: '{delta[:50]}...' (longitud: {len(delta)})")
                    # Enviar delta directamente (ya tiene espacios agregados por stream())
                    yield delta
            
            # Corregir y normalizar el texto final antes de guardar
            if accumulated_text:
                # Corregir palabras fragmentadas
                corrected = self._fix_fragmented_words(accumulated_text)
                
                # Normalizar el texto
                final_normalized = self._normalize_text(corrected)
                
                logger.info(f"✅ Streaming completado - Total chunks: {chunk_count}, Texto final: {len(final_normalized)} caracteres")
                
                # Guardar en historial (SQLiteChatMessageHistory persiste automáticamente)
                history.add_ai_message(final_normalized)
                
                # Guardar en memoria de entidades
                self.memory.add_message("user", user_message)
                self.memory.add_message("assistant", final_normalized)
            else:
                # Si no hay texto acumulado, guardar vacío
                history.add_ai_message("")
                self.memory.add_message("user", user_message)
                self.memory.add_message("assistant", "")
            
        except Exception as e:
            logger.error(f"❌ Error en streaming: {e}")
            yield f"Error: {str(e)}"


    async def process_chat_json(self, user_message: str) -> Dict[str, Any]:
        """Procesar chat retornando JSON estructurado usando JsonOutputParser."""
        return await self.json_chain.ainvoke({
            "system_prompt": self.system_prompt,
            "schema": "resumen:string, posibles_causas:string[], recomendaciones:string[], nivel_urgencia:[baja|media|alta]",
            "format_instructions": self.json_parser.get_format_instructions(),
            "user_message": user_message,
        })
    
    async def process_chat_structured(self, user_message: str) -> MedicalAnalysis:
        """Procesar chat retornando objeto Pydantic estructurado usando PydanticOutputParser."""
        return await self.structured_chain.ainvoke({
            "system_prompt": self.system_prompt,
            "format_instructions": self.pydantic_parser.get_format_instructions(),
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
            
            # Llamar a vLLM con streaming
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.llm.vllm_endpoint}chat/completions",
                    json={
                        "model": "google/medgemma-27b",
                        "messages": messages_data,
                        "temperature": 0.7,
                        "max_tokens": 2048,  # Aumentado de 100 a 2048 para respuestas más completas
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

