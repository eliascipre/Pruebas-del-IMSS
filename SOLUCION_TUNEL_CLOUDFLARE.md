# Solución: Túnel Cloudflare con Múltiples Puertos

## Situación Actual

Cuando accedes al túnel SSH de Cloudflare (`https://size-ensures-preparing-nikon.trycloudflare.com`), ves:
```json
{"status":"ok","service":"Chatbot IMSS API","version":"1.0.0"}
```

Esto significa que estás accediendo al **backend** (puerto 5001), no al frontend (puerto 3000).

## Problema

Cuando usas `cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001`, Cloudflare puede:
1. Exponer solo el último URL especificado (5001)
2. O crear un solo túnel que enruta según el path

## Solución Implementada

### 1. Archivo `.env.local` Creado

Se creó `UI_IMSS/.env.local` con:
```bash
NEXT_PUBLIC_CHATBOT_URL=https://size-ensures-preparing-nikon.trycloudflare.com
```

**Importante**: Sin el puerto `:5001` porque Cloudflare maneja el enrutamiento internamente.

### 2. Código Actualizado

El código ahora:
- ✅ Usa `NEXT_PUBLIC_CHATBOT_URL` si está configurado
- ✅ Detecta automáticamente túneles de Cloudflare
- ✅ Usa el mismo hostname sin puerto cuando detecta un túnel

## Cómo Funciona

1. **Frontend (Next.js)**: Accesible en `https://size-ensures-preparing-nikon.trycloudflare.com` (puerto 3000)
2. **Backend (FastAPI)**: Accesible en `https://size-ensures-preparing-nikon.trycloudflare.com` (puerto 5001)
3. **Peticiones del Frontend al Backend**: Usan el mismo hostname (`NEXT_PUBLIC_CHATBOT_URL`)

## Verificación

### 1. Verificar que el Frontend esté Accesible

Abre en el navegador:
```
https://size-ensures-preparing-nikon.trycloudflare.com
```

Deberías ver la página de login del frontend.

### 2. Verificar que el Backend esté Accesible

Abre en el navegador:
```
https://size-ensures-preparing-nikon.trycloudflare.com/health
```

Deberías ver:
```json
{"status":"ok","medical_analyzer":"enabled"}
```

### 3. Verificar la Configuración

En la consola del navegador (F12), verifica que las peticiones al backend usen:
```
https://size-ensures-preparing-nikon.trycloudflare.com/api/...
```

## Si el Frontend No Está Accesible

Si solo ves el backend cuando accedes al túnel, puede ser que Cloudflare esté exponiendo solo el puerto 5001. En ese caso:

### Opción 1: Usar Dos Túneles Separados

```bash
# Terminal 1: Túnel para frontend
cloudflared tunnel --url http://localhost:3000

# Terminal 2: Túnel para backend
cloudflared tunnel --url http://localhost:5001
```

Luego actualiza `.env.local` con la URL del túnel del backend.

### Opción 2: Cambiar el Orden de los URLs

```bash
# Poner el frontend primero
cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001
```

### Opción 3: Usar Rutas Diferentes

Si Cloudflare soporta rutas, puedes configurar:
- Frontend: `/`
- Backend: `/api`

## Próximos Pasos

1. **Reiniciar el servidor de Next.js** para que cargue `.env.local`:
   ```bash
   cd UI_IMSS
   pnpm dev
   ```

2. **Verificar que el frontend esté corriendo** en el puerto 3000:
   ```bash
   curl http://localhost:3000
   ```

3. **Probar el túnel** accediendo a:
   ```
   https://size-ensures-preparing-nikon.trycloudflare.com
   ```

4. **Si solo ves el backend**, considera usar dos túneles separados o cambiar el orden de los URLs.

## Notas

- El archivo `.env.local` ya está creado con la URL correcta
- El código está configurado para usar esta URL automáticamente
- Si cambias el túnel, actualiza `NEXT_PUBLIC_CHATBOT_URL` en `.env.local`

