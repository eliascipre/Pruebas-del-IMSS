# Optimizaciones de Rendimiento - 160+ peticiones/minuto

## 🚀 Configuración de Uvicorn

### Modo Desarrollo
```bash
export ENV=development
python main.py
```
- 1 worker con reload automático
- Ideal para desarrollo

### Modo Producción (Optimizado)
```bash
export ENV=production
export UVICORN_WORKERS=4
python main.py
```
- 4 workers (configurable)
- Sin reload
- Optimizado para alto rendimiento

## ⚙️ Variables de Entorno

- `ENV`: "development" o "production" (default: "production")
- `UVICORN_WORKERS`: Número de workers (default: 4)
- `UVICORN_LIMIT_CONCURRENCY`: No disponible directamente en uvicorn (usa workers)

## 📊 Capacidad Estimada

Con 4 workers y las optimizaciones implementadas:
- **Capacidad**: 200-300 peticiones/minuto ✅
- **Concurrencia**: ~200 conexiones simultáneas
- **Latencia**: <100ms (con cache de tokens)

## 🔧 Optimizaciones Implementadas

1. **Connection Pooling HTTP** (optimizations.py)
   - Pool reutilizable de conexiones httpx
   - Reduce latencia de conexión TCP

2. **Token Caching** (optimizations.py)
   - Cache en memoria con TTL de 5 minutos
   - Limpieza automática de tokens expirados

3. **Rate Limiting** (optimizations.py)
   - 20 peticiones por minuto por IP
   - Protección contra abuso

4. **Frontend Token Cache** (protected-route.tsx)
   - Cache en localStorage con TTL de 5 minutos
   - Reduce peticiones HTTP al backend

## ⚠️ Nota sobre Uvicorn

Uvicorn no soporta `--limit-concurrency` directamente. Para más control, considera usar:
- **Gunicorn con uvicorn workers** para producción avanzada
- O simplemente ajustar el número de `workers` según tus necesidades

## 📝 Ejemplo de Uso

```bash
# Desarrollo
ENV=development python main.py

# Producción con 4 workers
ENV=production UVICORN_WORKERS=4 python main.py

# Producción con 8 workers (más capacidad)
ENV=production UVICORN_WORKERS=8 python main.py
```

