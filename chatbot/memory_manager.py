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


# Instancia global del gestor de memoria
_memory_manager = None

def get_memory_manager(db_path: str = "chatbot.db") -> MemoryManager:
    """Obtener instancia del gestor de memoria"""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager(db_path)
    return _memory_manager

