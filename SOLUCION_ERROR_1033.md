# Solución: Error 1033 de Cloudflare Tunnel

## Error

```
Error 1033
Cloudflare Tunnel error
Cloudflare is currently unable to resolve it.
```

## Causas Posibles

1. **El túnel se desconectó** - `cloudflared` dejó de correr
2. **El túnel solo expone el puerto 5001** - No está exponiendo el puerto 3000 (frontend)
3. **El frontend no está corriendo** - Next.js no está en el puerto 3000
4. **Problema de configuración** - El túnel no está configurado correctamente

## Soluciones

### Solución 1: Verificar que Ambos Servicios Estén Corriendo

```bash
# Verificar que el frontend esté corriendo
curl http://localhost:3000

# Verificar que el backend esté corriendo
curl http://localhost:5001/health
```

### Solución 2: Usar Dos Túneles Separados (Recomendado)

Cuando usas `cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001`, Cloudflare puede tener problemas para enrutar correctamente. Es mejor usar dos túneles separados:

**Terminal 1 - Túnel para Frontend:**
```bash
cloudflared tunnel --url http://localhost:3000
```

Esto te dará una URL como:
```
https://frontend-xxxxx.trycloudflare.com
```

**Terminal 2 - Túnel para Backend:**
```bash
cloudflared tunnel --url http://localhost:5001
```

Esto te dará una URL como:
```
https://backend-xxxxx.trycloudflare.com
```

**Luego actualiza `UI_IMSS/.env.local`:**
```bash
NEXT_PUBLIC_CHATBOT_URL=https://backend-xxxxx.trycloudflare.com
```

### Solución 3: Verificar el Túnel Actual

Si quieres seguir usando un solo túnel, verifica:

1. **Que el túnel esté corriendo:**
   ```bash
   # Verificar que cloudflared esté corriendo
   ps aux | grep cloudflared
   ```

2. **Que ambos servicios estén corriendo:**
   ```bash
   # Frontend
   curl http://localhost:3000
   
   # Backend
   curl http://localhost:5001/health
   ```

3. **Reiniciar el túnel:**
   ```bash
   # Detener el túnel actual (Ctrl+C)
   # Luego reiniciar
   cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001
   ```

### Solución 4: Usar el Orden Correcto

A veces el orden importa. Intenta poner el frontend primero:

```bash
cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001
```

## Pasos Recomendados

1. **Verificar que ambos servicios estén corriendo:**
   ```bash
   # Terminal 1: Frontend
   cd UI_IMSS
   pnpm dev
   
   # Terminal 2: Backend
   cd chatbot
   python main.py
   ```

2. **Crear dos túneles separados:**
   ```bash
   # Terminal 3: Túnel Frontend
   cloudflared tunnel --url http://localhost:3000
   
   # Terminal 4: Túnel Backend
   cloudflared tunnel --url http://localhost:5001
   ```

3. **Configurar `.env.local`:**
   ```bash
   cd UI_IMSS
   echo 'NEXT_PUBLIC_CHATBOT_URL=https://URL_DEL_TUNEL_BACKEND' > .env.local
   ```

4. **Reiniciar el frontend** para que cargue la nueva configuración:
   ```bash
   # Detener (Ctrl+C) y reiniciar
   pnpm dev
   ```

## Verificación

Después de configurar:

1. **Frontend accesible en:**
   ```
   https://URL_DEL_TUNEL_FRONTEND
   ```

2. **Backend accesible en:**
   ```
   https://URL_DEL_TUNEL_BACKEND/health
   ```

3. **Las peticiones del frontend al backend** deberían funcionar correctamente.

## Notas

- El error 1033 generalmente significa que el túnel no está disponible o se desconectó
- Usar dos túneles separados es más confiable que un solo túnel con múltiples URLs
- Asegúrate de que ambos servicios estén corriendo antes de crear los túneles

