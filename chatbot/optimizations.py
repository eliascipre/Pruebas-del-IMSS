"""
Optimizaciones para alto rendimiento
Soporte para 160+ peticiones por minuto
"""

import asyncio
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from functools import wraps
import time

logger = logging.getLogger(__name__)


class HTTPXConnectionPool:
    """Pool de conexiones HTTP reutilizable para vLLM"""
    
    _instance: Optional['HTTPXConnectionPool'] = None
    _client: Optional[httpx.AsyncClient] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._client = httpx.AsyncClient(
                limits=httpx.Limits(
                    max_keepalive_connections=20,  # Conexiones keep-alive
                    max_connections=100,  # Máximo de conexiones simultáneas
                    keepalive_expiry=30.0  # Tiempo de expiración keep-alive
                ),
                timeout=httpx.Timeout(
                    connect=10.0,  # Timeout de conexión
                    read=120.0,  # Timeout de lectura (streaming)
                    write=10.0,  # Timeout de escritura
                    pool=10.0  # Timeout del pool
                )
                # http2=True removido - no es crítico y requiere paquete h2 adicional
            )
            logger.info("✅ HTTPX Connection Pool inicializado")
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Obtener cliente HTTP del pool"""
        return self._client
    
    async def close(self):
        """Cerrar pool de conexiones"""
        if self._client:
            await self._client.aclose()
            self._client = None
            logger.info("✅ HTTPX Connection Pool cerrado")


class TokenCache:
    """Cache en memoria para tokens JWT válidos"""
    
    def __init__(self, ttl_minutes: int = 5):
        self.cache: Dict[str, tuple] = {}  # {token: (user_data, expiry_timestamp)}
        self.ttl = timedelta(minutes=ttl_minutes)
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def get(self, token: str) -> Optional[Dict[str, Any]]:
        """Obtener usuario del cache si el token es válido"""
        if token not in self.cache:
            return None
        
        user_data, expiry = self.cache[token]
        
        # Verificar si expiró
        if datetime.now() > expiry:
            del self.cache[token]
            return None
        
        return user_data
    
    def set(self, token: str, user_data: Dict[str, Any]):
        """Guardar token en cache"""
        expiry = datetime.now() + self.ttl
        self.cache[token] = (user_data, expiry)
    
    def invalidate(self, token: str):
        """Invalidar token del cache"""
        if token in self.cache:
            del self.cache[token]
    
    def clear(self):
        """Limpiar todo el cache"""
        self.cache.clear()
    
    async def cleanup_expired(self):
        """Limpiar tokens expirados periódicamente"""
        while True:
            await asyncio.sleep(60)  # Limpiar cada minuto
            now = datetime.now()
            expired = [
                token for token, (_, expiry) in self.cache.items()
                if now > expiry
            ]
            for token in expired:
                del self.cache[token]
            if expired:
                logger.debug(f"🧹 Limpiados {len(expired)} tokens expirados")
    
    def start_cleanup_task(self):
        """Iniciar tarea de limpieza automática"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self.cleanup_expired())


# Instancia global del cache
_token_cache = TokenCache()


def get_token_cache() -> TokenCache:
    """Obtener instancia global del cache de tokens"""
    return _token_cache


class RateLimiter:
    """Rate limiter simple por IP"""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}  # {ip: [timestamps]}
    
    def is_allowed(self, ip: str) -> bool:
        """Verificar si la IP puede hacer una petición"""
        now = time.time()
        
        # Limpiar requests antiguos
        if ip in self.requests:
            self.requests[ip] = [
                ts for ts in self.requests[ip]
                if now - ts < self.window_seconds
            ]
        else:
            self.requests[ip] = []
        
        # Verificar límite
        if len(self.requests[ip]) >= self.max_requests:
            return False
        
        # Registrar nueva petición
        self.requests[ip].append(now)
        return True
    
    def get_remaining(self, ip: str) -> int:
        """Obtener peticiones restantes"""
        now = time.time()
        if ip in self.requests:
            self.requests[ip] = [
                ts for ts in self.requests[ip]
                if now - ts < self.window_seconds
            ]
            return max(0, self.max_requests - len(self.requests[ip]))
        return self.max_requests


# Instancia global del rate limiter
_rate_limiter = RateLimiter(max_requests=20, window_seconds=60)  # 20 peticiones por minuto


def get_rate_limiter() -> RateLimiter:
    """Obtener instancia global del rate limiter"""
    return _rate_limiter


def get_http_pool() -> httpx.AsyncClient:
    """Obtener cliente HTTP del pool"""
    pool = HTTPXConnectionPool()
    return pool.client

def get_http_pool_instance() -> HTTPXConnectionPool:
    """Obtener instancia del pool para poder cerrarlo"""
    return HTTPXConnectionPool()

