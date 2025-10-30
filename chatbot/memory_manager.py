"""
Sistema de Memoria Conversacional para Chatbot IMSS
Basado en el sistema de AImas con adaptaciones para IMSS
"""

import json
import sqlite3
import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ConversationMemory:
    """Clase base para memoria conversacional"""
    
    def __init__(self, max_tokens: int = 4000):
        self.max_tokens = max_tokens
        self.messages = []
    
    def add_message(self, role: str, content: str, metadata: Dict[str, Any] = None):
        """Agregar mensaje a la memoria"""
        message = {
            "role": role,
            "content": content,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
        self.messages.append(message)
    
    def get_messages(self, limit: int = None) -> List[Dict[str, Any]]:
        """Obtener mensajes de la memoria"""
        if limit:
            return self.messages[-limit:]
        return self.messages.copy()
    
    def clear(self):
        """Limpiar memoria"""
        self.messages.clear()


class BufferWindowMemory(ConversationMemory):
    """Memoria con ventana deslizante de mensajes"""
    
    def __init__(self, window_size: int = 10, max_tokens: int = 4000):
        super().__init__(max_tokens)
        self.window_size = window_size
    
    def add_message(self, role: str, content: str, metadata: Dict[str, Any] = None):
        """Agregar mensaje manteniendo ventana de tamaño fijo"""
        super().add_message(role, content, metadata)
        
        # Mantener solo los últimos N mensajes
        if len(self.messages) > self.window_size:
            self.messages = self.messages[-self.window_size:]


class MemoryManager:
    """Gestor de memoria conversacional con persistencia en SQLite"""
    
    def __init__(self, db_path: str = "chatbot.db"):
        self.db_path = db_path
        self.memories = {}  # {session_id: ConversationMemory}
        self._init_database()
    
    def _init_database(self):
        """Inicializar base de datos SQLite"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabla para memorias de conversación
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversation_memory (
                    session_id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    memory_data TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)
            
            # Tabla para mensajes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    metadata TEXT
                )
            """)
            
            # Tabla para conversaciones
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    title TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    is_temporary INTEGER DEFAULT 0
                )
            """)
            
            conn.commit()
            
            # Tabla de métricas de ejecución
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    input_chars INTEGER,
                    output_chars INTEGER,
                    input_tokens INTEGER,
                    output_tokens INTEGER,
                    total_tokens INTEGER,
                    started_at INTEGER,
                    ended_at INTEGER,
                    duration_ms INTEGER,
                    model TEXT,
                    provider TEXT,
                    stream INTEGER,
                    is_image INTEGER,
                    success INTEGER,
                    error_message TEXT
                )
            """)
            conn.commit()
            conn.close()
            logger.info("✅ Base de datos inicializada correctamente")
        except Exception as e:
            logger.error(f"❌ Error inicializando base de datos: {e}")
    
    def get_memory(self, session_id: str, agent_id: str = "medico", memory_type: str = "buffer") -> ConversationMemory:
        """Obtener memoria para una sesión"""
        memory_key = f"{session_id}_{agent_id}"
        
        if memory_key not in self.memories:
            # Crear nueva memoria
            if memory_type == "buffer":
                self.memories[memory_key] = BufferWindowMemory(window_size=10)
            else:
                self.memories[memory_key] = ConversationMemory()
            
            # Cargar memoria persistida si existe
            self._load_persisted_memory(session_id, agent_id, memory_type)
        
        return self.memories[memory_key]
    
    def _load_persisted_memory(self, session_id: str, agent_id: str, memory_type: str):
        """Cargar memoria persistida desde la base de datos"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT memory_data FROM conversation_memory 
                WHERE session_id = ? AND agent_id = ? AND memory_type = ?
            """, (session_id, agent_id, memory_type))
            
            result = cursor.fetchone()
            
            if result:
                memory_data = json.loads(result[0])
                memory_key = f"{session_id}_{agent_id}"
                
                if memory_key in self.memories:
                    memory = self.memories[memory_key]
                    memory.messages = memory_data.get("messages", [])
                    logger.info(f"✅ Memoria cargada para sesión: {session_id}")
            
            conn.close()
        except Exception as e:
            logger.error(f"❌ Error cargando memoria persistida: {e}")
    
    def save_memory(self, session_id: str, agent_id: str, memory_type: str = "buffer"):
        """Guardar memoria en la base de datos"""
        try:
            memory_key = f"{session_id}_{agent_id}"
            if memory_key not in self.memories:
                return
            
            memory = self.memories[memory_key]
            
            memory_data = {
                "messages": memory.messages
            }
            
            now = int(time.time())
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO conversation_memory 
                (session_id, agent_id, memory_type, memory_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (session_id, agent_id, memory_type, json.dumps(memory_data), now, now))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Memoria guardada para sesión: {session_id}")
        except Exception as e:
            logger.error(f"❌ Error guardando memoria: {e}")
    
    def add_message_to_conversation(self, session_id: str, role: str, content: str, metadata: Dict[str, Any] = None):
        """Agregar mensaje a la conversación y persistir"""
        try:
            # Guardar en memoria activa
            memory = self.get_memory(session_id)
            memory.add_message(role, content, metadata)
            
            # Guardar en base de datos
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO messages (session_id, role, content, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, role, content, int(time.time()), json.dumps(metadata or {})))
            
            conn.commit()
            
            # Actualizar updated_at de la conversación si existe
            try:
                cursor.execute(
                    "UPDATE conversations SET updated_at = ? WHERE id = ?",
                    (int(time.time()), session_id),
                )
                conn.commit()
            except Exception as _e:
                logger.warning(f"⚠️ No se pudo actualizar updated_at: {_e}")
            finally:
                conn.close()
            
            # Guardar memoria actualizada
            self.save_memory(session_id, "medico")
        except Exception as e:
            logger.error(f"❌ Error agregando mensaje: {e}")
    
    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Obtener historial de conversación desde la base de datos"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT role, content, timestamp, metadata
                FROM messages
                WHERE session_id = ?
                ORDER BY timestamp ASC
                LIMIT ?
            """, (session_id, limit))
            
            messages = []
            for row in cursor.fetchall():
                messages.append({
                    "role": row[0],
                    "content": row[1],
                    "timestamp": row[2],
                    "metadata": json.loads(row[3]) if row[3] else {}
                })
            
            conn.close()
            return messages
        except Exception as e:
            logger.error(f"❌ Error obteniendo historial: {e}")
            return []

    def query_metrics(self, session_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Consultar métricas registradas en SQLite"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            params: List[Any] = []
            where = ""
            if session_id:
                where = "WHERE session_id = ?"
                params.append(session_id)
            params.extend([limit, offset])
            cursor.execute(f"""
                SELECT id, session_id, input_chars, output_chars, input_tokens, output_tokens, total_tokens,
                       started_at, ended_at, duration_ms, model, provider, stream, is_image, success, error_message
                FROM metrics
                {where}
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, params)
            rows = cursor.fetchall()
            cols = [c[0] for c in cursor.description]
            conn.close()
            return [dict(zip(cols, r)) for r in rows]
        except Exception as e:
            logger.error(f"❌ Error consultando métricas: {e}")
            return []
    
    def create_conversation(self, user_id: str, title: str = "Nueva conversación") -> str:
        """Crear nueva conversación"""
        try:
            import uuid
            session_id = str(uuid.uuid4())
            now = int(time.time())
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, user_id, title, now, now))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Conversación creada: {session_id}")
            return session_id
        except Exception as e:
            logger.error(f"❌ Error creando conversación: {e}")
            return ""

    def list_conversations(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Listar conversaciones de un usuario"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, user_id, title, created_at, updated_at, is_temporary
                FROM conversations
                WHERE user_id = ?
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?
                """,
                (user_id, limit, offset),
            )
            rows = cursor.fetchall()
            conn.close()
            return [
                {
                    "id": r[0],
                    "user_id": r[1],
                    "title": r[2],
                    "created_at": r[3],
                    "updated_at": r[4],
                    "is_temporary": r[5],
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"❌ Error listando conversaciones: {e}")
            return []

    def delete_all_conversations(self, user_id: str) -> int:
        """Eliminar todas las conversaciones y mensajes de un usuario"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            # Obtener sesiones del usuario
            cursor.execute("SELECT id FROM conversations WHERE user_id = ?", (user_id,))
            session_ids = [r[0] for r in cursor.fetchall()]
            deleted = 0
            if session_ids:
                # Borrar mensajes de esas sesiones
                cursor.execute(
                    f"DELETE FROM messages WHERE session_id IN ({','.join(['?']*len(session_ids))})",
                    session_ids,
                )
                # Borrar memorias
                cursor.execute(
                    f"DELETE FROM conversation_memory WHERE session_id IN ({','.join(['?']*len(session_ids))})",
                    session_ids,
                )
                # Borrar métricas
                cursor.execute(
                    f"DELETE FROM metrics WHERE session_id IN ({','.join(['?']*len(session_ids))})",
                    session_ids,
                )
                # Borrar conversaciones
                cursor.execute(
                    "DELETE FROM conversations WHERE user_id = ?",
                    (user_id,),
                )
                deleted = cursor.rowcount
            conn.commit()
            conn.close()
            return deleted
        except Exception as e:
            logger.error(f"❌ Error eliminando conversaciones: {e}")
            return 0

    def ensure_conversation(self, user_id: str, session_id: str, title: str = "Nueva conversación"):
        """Asegurar que la conversación exista y pertenezca al usuario."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM conversations WHERE id = ?",
                (session_id,),
            )
            row = cursor.fetchone()
            if not row:
                now = int(time.time())
                cursor.execute(
                    """
                    INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (session_id, user_id, title, now, now),
                )
                conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Error asegurando conversación: {e}")

    def conversation_belongs_to_user(self, session_id: str, user_id: str) -> bool:
        """Validar pertenencia de una sesión a un usuario"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT 1 FROM conversations WHERE id = ? AND user_id = ?",
                (session_id, user_id),
            )
            ok = cursor.fetchone() is not None
            conn.close()
            return ok
        except Exception as e:
            logger.error(f"❌ Error validando pertenencia: {e}")
            return False

    def rename_conversation(self, session_id: str, user_id: str, new_title: str) -> bool:
        """Renombrar una conversación si pertenece al usuario"""
        try:
            if not self.conversation_belongs_to_user(session_id, user_id):
                return False
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            now = int(time.time())
            cursor.execute(
                "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (new_title, now, session_id, user_id),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"❌ Error renombrando conversación: {e}")
            return False
    
    def get_conversation_context(self, session_id: str, agent_id: str = "medico") -> str:
        """Obtener contexto de la conversación para incluir en el prompt"""
        try:
            memory = self.get_memory(session_id, agent_id)
            
            if not memory or not memory.messages:
                return ""
            
            # Obtener los últimos mensajes relevantes
            recent_messages = memory.get_messages(limit=5)
            
            # Formatear contexto de memoria
            context_parts = []
            
            # Agregar mensajes recientes
            if recent_messages:
                context_parts.append("## Mensajes recientes:")
                for msg in recent_messages[-3:]:  # Solo los últimos 3 mensajes
                    role = "Usuario" if msg["role"] == "user" else "Asistente"
                    content = msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"]
                    context_parts.append(f"{role}: {content}")
            
            return "\n\n".join(context_parts) if context_parts else ""
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo contexto de sesión: {e}")
            return ""

    def log_chat_metrics(
        self,
        *,
        session_id: str,
        input_chars: int,
        output_chars: int,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        started_at: Optional[int] = None,
        ended_at: Optional[int] = None,
        duration_ms: Optional[int] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        stream: bool = False,
        is_image: bool = False,
        success: bool = True,
        error_message: Optional[str] = None,
    ):
        """Registrar métricas de una interacción en SQLite"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO metrics (
                    session_id, input_chars, output_chars, input_tokens, output_tokens, total_tokens,
                    started_at, ended_at, duration_ms, model, provider, stream, is_image, success, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    int(input_chars) if input_chars is not None else None,
                    int(output_chars) if output_chars is not None else None,
                    int(input_tokens) if input_tokens is not None else None,
                    int(output_tokens) if output_tokens is not None else None,
                    int(total_tokens) if total_tokens is not None else None,
                    int(started_at) if started_at is not None else None,
                    int(ended_at) if ended_at is not None else None,
                    int(duration_ms) if duration_ms is not None else None,
                    model,
                    provider,
                    1 if stream else 0,
                    1 if is_image else 0,
                    1 if success else 0,
                    error_message,
                ),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Error registrando métricas: {e}")


# Instancia global del gestor de memoria
_memory_manager = None

def get_memory_manager(db_path: str = "chatbot.db") -> MemoryManager:
    """Obtener instancia del gestor de memoria"""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager(db_path)
    return _memory_manager

