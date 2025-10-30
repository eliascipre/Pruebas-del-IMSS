"""
Sistema completo de LangChain para Chatbot IMSS
Incluye: Fallback automático, Few-shot, Streaming, Memoria avanzada
"""

import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnableSequence
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
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
    
    async def process_chat(self, user_message: str, session_id: str = "", use_entities: bool = True) -> str:
        """Procesar chat con contexto de memoria (usa LCEL internamente)."""
        try:
            # Construcción de contexto en paralelo (entidades + recientes)
            async def build_entity_ctx() -> str:
                return self.memory.get_entity_context() if use_entities else ""

            async def build_recent_msgs() -> List[Dict[str, Any]]:
                return self.memory.get_recent_messages(limit=3)

            entity_ctx, recent_msgs = await asyncio.gather(build_entity_ctx(), build_recent_msgs())

            # Construir plantilla con few-shots opcionales
            system_block = "{system_prompt}\n\n{entity_context}\n\n{recent_context}"
            messages_def: List[Any] = [("system", system_block)]
            for example in (self.few_shots or []):
                messages_def.append(("human", example.get("user", "")))
                messages_def.append(("ai", example.get("assistant", "")))
            messages_def.append(("human", "{user_message}"))
            prompt = ChatPromptTemplate.from_messages(messages_def)

            def format_recent(recent: List[Dict[str, Any]]) -> str:
                if not recent:
                    return ""
                lines = ["## Conversación reciente:"]
                for msg in recent:
                    role = "Usuario" if msg["role"] == "user" else "Asistente"
                    content = msg["content"][:150] + "..." if len(msg["content"]) > 150 else msg["content"]
                    lines.append(f"{role}: {content}")
                return "\n".join(lines)

            chain = (
                prompt
                | self.llm.lm_studio_llm
                | self.output_parser
            )

            answer = await chain.ainvoke({
                "system_prompt": self.system_prompt,
                "entity_context": entity_ctx or "",
                "recent_context": format_recent(recent_msgs),
                "user_message": user_message,
            })

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
        """Realiza una llamada directa (no streaming) a LM Studio para obtener usage tokens."""
        try:
            import httpx
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
                    f"{self.llm.lm_studio_endpoint}chat/completions",
                    json={
                        "model": "medgemma-4b-it",
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
        """Procesar chat con streaming"""
        try:
            # Construcción de contexto paralela
            async def build_entity_ctx() -> str:
                return self.memory.get_entity_context()

            async def build_recent_msgs() -> List[Dict[str, Any]]:
                return self.memory.get_recent_messages(limit=3)

            entity_context, recent_messages = await asyncio.gather(build_entity_ctx(), build_recent_msgs())

            # Crear mensajes
            messages = [
                SystemMessage(content="\n".join([
                    self.system_prompt,
                    ("\n\n" + entity_context) if entity_context else "",
                    ("\n\n## Conversación reciente:\n" + "\n".join([
                        ("Usuario" if m["role"] == "user" else "Asistente") + ": " + (m["content"][:150] + "..." if len(m["content"]) > 150 else m["content"]) for m in recent_messages
                    ])) if recent_messages else ""
                ]).strip()),
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

    def build_json_chain(self) -> RunnableSequence:
        """Cadena LCEL que obliga salida JSON estructurada para hallazgos médicos."""
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
        json_parser = JsonOutputParser()
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}\n\nDevuelve SIEMPRE JSON válido que cumpla este esquema: {schema}"),
            ("human", "{user_message}"),
        ])
        return prompt | self.llm.lm_studio_llm | json_parser

    async def process_chat_json(self, user_message: str) -> Dict[str, Any]:
        """Procesar chat retornando JSON estructurado."""
        chain = self.build_json_chain()
        return await chain.ainvoke({
            "system_prompt": self.system_prompt,
            "schema": "resumen:string, posibles_causas:string[], recomendaciones:string[], nivel_urgencia:[baja|media|alta]",
            "user_message": user_message,
        })
    
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

