# Análisis de Rendimiento y Optimización para 160 peticiones/minuto

## 📊 Análisis Actual del Sistema

### Backend (FastAPI)

#### Problemas Identificados:

1. **SQLite sin Pool de Conexiones** ⚠️ CRÍTICO
   - `auth_manager.py`: Usa `sqlite3.connect()` síncrono en cada petición
   - `memory_manager.py`: Múltiples conexiones síncronas bloqueantes
   - SQLite no soporta múltiples escrituras concurrentes eficientemente
   - **Impacto**: Bloquea el event loop de asyncio

2. **Uvicorn sin Workers** ⚠️ ALTO
   - Solo 1 worker por defecto
   - No aprovecha múltiples cores
   - **Impacto**: Limita concurrencia a ~50-100 peticiones/segundo

3. **httpx sin Connection Pooling** ⚠️ MEDIO
   - Cada petición a vLLM crea nueva conexión
   - Overhead de TCP handshake
   - **Impacto**: Latencia adicional de 10-50ms por petición

4. **Sin Rate Limiting** ⚠️ MEDIO
   - No hay protección contra abuso
   - Un usuario puede saturar el sistema

5. **Verificación de Token en cada petición** ⚠️ MEDIO
   - `ProtectedRoute` hace petición HTTP al backend
   - No hay caching de tokens válidos
   - **Impacto**: Latencia adicional de 50-100ms

### Frontend (Next.js)

#### Problemas Identificados:

1. **ProtectedRoute sin Caching** ⚠️ MEDIO
   - Verifica token en cada navegación
   - No cachea resultado de verificación

2. **Múltiples Fetch sin Debouncing** ⚠️ BAJO
   - `fetchConversations` se llama múltiples veces
   - No hay debouncing en búsquedas

## 🚀 Estrategias de Optimización

### 1. Migrar SQLite a Pool Asíncrono (CRÍTICO)

**Problema**: SQLite bloquea el event loop
**Solución**: Usar `aiosqlite` o `databases` con SQLite

```python
# Usar aiosqlite para operaciones asíncronas
import aiosqlite

class AsyncAuthManager:
    def __init__(self, db_path: str = "chatbot.db"):
        self.db_path = db_path
        self.pool = None
    
    async def get_connection(self):
        if not self.pool:
            self.pool = await aiosqlite.connect(self.db_path)
        return self.pool
```

### 2. Configurar Uvicorn con Workers (ALTO)

**Problema**: Solo 1 worker
**Solución**: Usar múltiples workers

```bash
# run.sh optimizado
uvicorn main:app \
    --host 0.0.0.0 \
    --port 5001 \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --limit-concurrency 200 \
    --timeout-keep-alive 30
```

### 3. Connection Pooling para httpx (MEDIO)

**Problema**: Nueva conexión por petición
**Solución**: Pool de conexiones reutilizable

```python
import httpx

class HTTPXPool:
    def __init__(self):
        self.client = httpx.AsyncClient(
            limits=httpx.Limits(
                max_keepalive_connections=20,
                max_connections=100,
                keepalive_expiry=30.0
            ),
            timeout=httpx.Timeout(120.0)
        )
```

### 4. Caching de Tokens (MEDIO)

**Problema**: Verificación en cada petición
**Solución**: Cache en memoria con TTL

```python
from functools import lru_cache
from datetime import datetime, timedelta

class TokenCache:
    def __init__(self):
        self.cache = {}
        self.ttl = timedelta(minutes=5)
    
    def get(self, token: str):
        if token in self.cache:
            user, expiry = self.cache[token]
            if datetime.now() < expiry:
                return user
            del self.cache[token]
        return None
    
    def set(self, token: str, user: dict):
        self.cache[token] = (user, datetime.now() + self.ttl)
```

### 5. Rate Limiting (MEDIO)

**Problema**: Sin protección contra abuso
**Solución**: Implementar rate limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/chat")
@limiter.limit("10/minute")  # 10 peticiones por minuto por IP
async def chat_endpoint(...):
    ...
```

### 6. Optimizar Frontend (BAJO)

**Problema**: Verificación de token en cada carga
**Solución**: Cache en localStorage con validación periódica

```typescript
// Cache de verificación de token
const TOKEN_CACHE_KEY = 'token_verified'
const TOKEN_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

function isTokenCached(): boolean {
  const cached = localStorage.getItem(TOKEN_CACHE_KEY)
  if (!cached) return false
  
  const { timestamp } = JSON.parse(cached)
  return Date.now() - timestamp < TOKEN_CACHE_TTL
}
```

## 📈 Estimación de Capacidad

### Configuración Actual:
- **Workers**: 1
- **Concurrencia**: ~50-100 peticiones/segundo
- **SQLite**: Bloqueante
- **Capacidad estimada**: ~30-60 peticiones/minuto

### Configuración Optimizada:
- **Workers**: 4
- **Concurrencia**: ~200-400 peticiones/segundo
- **SQLite**: Asíncrono con pool
- **Connection Pooling**: httpx reutilizable
- **Capacidad estimada**: **200-300 peticiones/minuto** ✅

## 🎯 Plan de Implementación

1. **Fase 1 (Crítico)**: Migrar a aiosqlite
2. **Fase 2 (Alto)**: Configurar workers de Uvicorn
3. **Fase 3 (Medio)**: Connection pooling httpx
4. **Fase 4 (Medio)**: Caching de tokens
5. **Fase 5 (Medio)**: Rate limiting
6. **Fase 6 (Bajo)**: Optimizaciones frontend




