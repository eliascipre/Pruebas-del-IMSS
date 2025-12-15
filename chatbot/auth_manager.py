"""
Sistema de autenticación y gestión de usuarios
"""

import sqlite3
import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt
import os

logger = logging.getLogger(__name__)

# Secret key para JWT (en producción debe estar en variables de entorno)
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


class AuthManager:
    """Gestor de autenticación y usuarios"""
    
    def __init__(self, db_path: str = "chatbot.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Inicializar tablas de autenticación"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabla de usuarios
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        """)
        
        # Tabla de sesiones (tokens)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _hash_password(self, password: str) -> str:
        """Hashear contraseña usando SHA-256 con salt"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verificar contraseña"""
        try:
            salt, stored_hash = password_hash.split(":")
            computed_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return computed_hash == stored_hash
        except Exception as e:
            logger.error(f"Error verificando contraseña: {e}")
            return False
    
    def register_user(self, email: str, password: str, name: Optional[str] = None) -> Dict[str, Any]:
        """Registrar nuevo usuario"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Verificar si el email ya existe
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                conn.close()
                return {"success": False, "error": "El email ya está registrado"}
            
            # Crear usuario
            user_id = secrets.token_urlsafe(32)
            password_hash = self._hash_password(password)
            now = int(datetime.now().timestamp())
            
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, email, password_hash, name or "", now, now))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Usuario registrado: {email}")
            return {"success": True, "user_id": user_id}
            
        except Exception as e:
            logger.error(f"Error registrando usuario: {e}")
            return {"success": False, "error": str(e)}
    
    def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Iniciar sesión y generar token"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Buscar usuario
            cursor.execute("""
                SELECT id, password_hash, name, is_active
                FROM users
                WHERE email = ?
            """, (email,))
            
            user = cursor.fetchone()
            if not user:
                conn.close()
                return {"success": False, "error": "Credenciales inválidas"}
            
            user_id, password_hash, name, is_active = user
            
            if not is_active:
                conn.close()
                return {"success": False, "error": "Usuario inactivo"}
            
            # Verificar contraseña
            if not self._verify_password(password, password_hash):
                conn.close()
                return {"success": False, "error": "Credenciales inválidas"}
            
            # Generar token JWT usando jose.jwt
            expires_at = datetime.now() + timedelta(hours=JWT_EXPIRATION_HOURS)
            token_payload = {
                "user_id": user_id,
                "email": email,
                "exp": int(expires_at.timestamp())  # jose.jwt requiere int
            }
            token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            # Guardar sesión en BD
            session_id = secrets.token_urlsafe(32)
            now = int(datetime.now().timestamp())
            expires_at_ts = int(expires_at.timestamp())
            
            cursor.execute("""
                INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, user_id, token, expires_at_ts, now))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Usuario autenticado: {email}")
            return {
                "success": True,
                "token": token,
                "user": {
                    "id": user_id,
                    "email": email,
                    "name": name
                }
            }
            
        except Exception as e:
            logger.error(f"Error en login: {e}")
            return {"success": False, "error": str(e)}
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verificar token JWT"""
        try:
            # Verificar JWT
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
            
            # Verificar que la sesión existe en BD
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT u.id, u.email, u.name, u.is_active
                FROM users u
                JOIN user_sessions s ON u.id = s.user_id
                WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
            """, (token, int(datetime.now().timestamp())))
            
            user = cursor.fetchone()
            conn.close()
            
            if user:
                return {
                    "user_id": user[0],
                    "email": user[1],
                    "name": user[2]
                }
            
            return None
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expirado")
            return None
        except Exception as e:
            logger.error(f"Error verificando token: {e}")
            return None
    
    def logout_user(self, token: str) -> bool:
        """Cerrar sesión (eliminar token)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
            
            conn.commit()
            conn.close()
            
            return True
        except Exception as e:
            logger.error(f"Error en logout: {e}")
            return False
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Obtener información de usuario por ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, email, name, created_at, is_active
                FROM users
                WHERE id = ?
            """, (user_id,))
            
            user = cursor.fetchone()
            conn.close()
            
            if user:
                return {
                    "id": user[0],
                    "email": user[1],
                    "name": user[2],
                    "created_at": user[3],
                    "is_active": bool(user[4])
                }
            
            return None
        except Exception as e:
            logger.error(f"Error obteniendo usuario: {e}")
            return None


# Instancia global
_auth_manager = None

def get_auth_manager() -> AuthManager:
    """Obtener instancia global del gestor de autenticación"""
    global _auth_manager
    if _auth_manager is None:
        _auth_manager = AuthManager()
    return _auth_manager

