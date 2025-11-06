# Configuración de Túnel Cloudflare con Múltiples Puertos

## Problema

Cuando usas `cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001`, Cloudflare crea un solo túnel pero **NO expone los puertos directamente en la URL**. Todas las peticiones van al mismo hostname base (ej: `https://size-ensures-preparing-nikon.trycloudflare.com`), y Cloudflare enruta internamente según el puerto.

## Soluciones

### Solución 1: Usar Variable de Entorno (Recomendado)

Configura la URL del backend explícitamente en `UI_IMSS/.env.local`:

```bash
NEXT_PUBLIC_CHATBOT_URL=https://size-ensures-preparing-nikon.trycloudflare.com
```

**Nota**: Sin el puerto `:5001` porque Cloudflare maneja el enrutamiento internamente.

### Solución 2: Usar el Mismo Hostname (Automático)

El código ahora detecta automáticamente túneles de Cloudflare y usa el mismo hostname sin puerto. Esto debería funcionar si Cloudflare enruta correctamente las peticiones al puerto 5001.

### Solución 3: Usar Proxy Reverso en Next.js

Si las soluciones anteriores no funcionan, puedes usar el proxy reverso configurado en `next.config.mjs`:

```typescript
// En el frontend, usar rutas relativas que Next.js proxy al backend
const response = await fetch('/api/backend/chat', {
  // Next.js redirigirá esto a http://localhost:5001/api/chat
})
```

## Verificación

1. **Verificar que el backend esté corriendo**:
   ```bash
   curl http://localhost:5001/health
   ```

2. **Verificar que el frontend esté corriendo**:
   ```bash
   curl http://localhost:3000
   ```

3. **Probar el túnel**:
   ```bash
   curl https://size-ensures-preparing-nikon.trycloudflare.com/health
   ```

## Configuración Actual

El código ahora:
- ✅ Detecta automáticamente túneles de Cloudflare
- ✅ Usa el mismo hostname sin puerto cuando detecta un túnel
- ✅ Permite configuración mediante `NEXT_PUBLIC_CHATBOT_URL`
- ✅ Tiene proxy reverso configurado en Next.js (opcional)

## Notas Importantes

1. **Cloudflare con múltiples URLs**: Cuando usas `--url http://localhost:3000 --url http://localhost:5001`, Cloudflare crea un solo túnel. Las peticiones al hostname base van al primer URL (3000), y las peticiones a otros puertos pueden no funcionar directamente.

2. **Solución recomendada**: Usar `NEXT_PUBLIC_CHATBOT_URL` con el hostname completo del túnel (sin puerto).

3. **Alternativa**: Si necesitas que ambos servicios sean accesibles directamente, considera usar dos túneles separados o configurar un proxy reverso en el frontend.

## Ejemplo de Configuración

En `UI_IMSS/.env.local`:
```bash
# URL del backend (mismo hostname del túnel, sin puerto)
NEXT_PUBLIC_CHATBOT_URL=https://size-ensures-preparing-nikon.trycloudflare.com
```

El frontend usará esta URL para todas las peticiones al backend, y Cloudflare enrutará internamente al puerto 5001.

