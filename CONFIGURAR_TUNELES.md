# Configuración de Túneles Cloudflare

## Situación Actual

Tienes dos túneles corriendo:
1. **Túnel 1 (PID 906090)**: Solo puerto 3000 (frontend)
2. **Túnel 2 (PID 1822382)**: Puertos 3000 y 5001 (ambos servicios)

Esto puede causar conflictos porque ambos están exponiendo el puerto 3000.

## Solución Recomendada

### Opción 1: Usar Dos Túneles Separados (Más Confiable)

1. **Detener los túneles actuales:**
   ```bash
   # Detener el túnel 1 (solo puerto 3000)
   kill 906090
   
   # Detener el túnel 2 (ambos puertos)
   kill 1822382
   ```

2. **Crear túnel para Frontend:**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Anota la URL que te da (ej: `https://frontend-xxxxx.trycloudflare.com`)

3. **Crear túnel para Backend:**
   ```bash
   cloudflared tunnel --url http://localhost:5001
   ```
   Anota la URL que te da (ej: `https://backend-xxxxx.trycloudflare.com`)

4. **Configurar `.env.local`:**
   ```bash
   cd UI_IMSS
   echo 'NEXT_PUBLIC_CHATBOT_URL=https://backend-xxxxx.trycloudflare.com' > .env.local
   ```
   (Reemplaza con la URL real del túnel del backend)

5. **Reiniciar el frontend:**
   ```bash
   cd UI_IMSS
   # Detener (Ctrl+C) y reiniciar
   pnpm dev
   ```

### Opción 2: Usar Solo el Túnel con Ambos Puertos

1. **Detener el túnel que solo tiene el puerto 3000:**
   ```bash
   kill 906090
   ```

2. **Verificar que el túnel con ambos puertos esté funcionando:**
   - El túnel 2 (PID 1822382) debería estar exponiendo ambos puertos
   - Anota la URL que te dio este túnel

3. **Configurar `.env.local` con la misma URL del túnel:**
   ```bash
   cd UI_IMSS
   echo 'NEXT_PUBLIC_CHATBOT_URL=https://URL_DEL_TUNEL' > .env.local
   ```
   (Usa la misma URL que te dio el túnel, sin puerto)

4. **Reiniciar el frontend:**
   ```bash
   cd UI_IMSS
   # Detener (Ctrl+C) y reiniciar
   pnpm dev
   ```

## Verificación

Después de configurar:

1. **Frontend accesible en:**
   - Opción 1: `https://frontend-xxxxx.trycloudflare.com`
   - Opción 2: `https://URL_DEL_TUNEL`

2. **Backend accesible en:**
   - Opción 1: `https://backend-xxxxx.trycloudflare.com/health`
   - Opción 2: `https://URL_DEL_TUNEL/health`

3. **Las peticiones del frontend al backend** deberían funcionar correctamente.

## Comandos Útiles

```bash
# Ver túneles corriendo
ps aux | grep cloudflared

# Detener un túnel específico
kill <PID>

# Verificar que los servicios estén corriendo
curl http://localhost:3000
curl http://localhost:5001/health
```





