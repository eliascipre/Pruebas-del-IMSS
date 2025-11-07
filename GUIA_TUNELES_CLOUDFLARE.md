# Guía Completa: Configuración de Túneles Cloudflare para Frontend y Backend

## Problema del Bucle de Compilación

El bucle de compilación se debe a que `app/page.tsx` está redirigiendo constantemente. Se ha corregido usando `useRef` para evitar múltiples redirecciones.

## Configuración de Túneles Cloudflare

### Opción 1: Dos Túneles Separados (Recomendado)

Esta es la opción más confiable y fácil de configurar.

#### Paso 1: Verificar que Ambos Servicios Estén Corriendo

**Terminal 1 - Frontend (Next.js):**
```bash
cd UI_IMSS
pnpm dev
```
Debería estar corriendo en: `http://localhost:3000`

**Terminal 2 - Backend (FastAPI):**
```bash
cd chatbot
python main.py
```
Debería estar corriendo en: `http://localhost:5001`

#### Paso 2: Crear Túnel para Frontend

**Terminal 3 - Túnel Frontend:**
```bash
cloudflared tunnel --url http://localhost:3000
```

Esto te dará una URL como:
```
https://frontend-xxxxx.trycloudflare.com
```

**Anota esta URL** - la necesitarás más adelante.

#### Paso 3: Crear Túnel para Backend

**Terminal 4 - Túnel Backend:**
```bash
cloudflared tunnel --url http://localhost:5001
```

Esto te dará una URL como:
```
https://backend-xxxxx.trycloudflare.com
```

**Anota esta URL** - la necesitarás para configurar el frontend.

#### Paso 4: Configurar `.env.local`

Crea o edita el archivo `UI_IMSS/.env.local`:

```bash
cd UI_IMSS
nano .env.local
```

O usando echo:
```bash
cd UI_IMSS
echo 'NEXT_PUBLIC_CHATBOT_URL=https://backend-xxxxx.trycloudflare.com' > .env.local
```

**Importante**: 
- Reemplaza `backend-xxxxx.trycloudflare.com` con la URL real que te dio el túnel del backend
- **NO incluyas el puerto** `:5001` en la URL
- **NO incluyas** `http://` o `https://` al principio si usas echo (ya está incluido)

#### Paso 5: Reiniciar el Frontend

```bash
# Detener el servidor actual (Ctrl+C)
# Luego reiniciar
cd UI_IMSS
pnpm dev
```

#### Paso 6: Verificar

1. **Frontend accesible en:**
   ```
   https://frontend-xxxxx.trycloudflare.com
   ```

2. **Backend accesible en:**
   ```
   https://backend-xxxxx.trycloudflare.com/health
   ```

3. **Las peticiones del frontend al backend** deberían funcionar correctamente.

### Opción 2: Un Solo Túnel con Múltiples URLs (No Recomendado)

Si prefieres usar un solo túnel, puedes hacerlo, pero puede causar problemas:

```bash
cloudflared tunnel --url http://localhost:3000 --url http://localhost:5001
```

**Problema**: Cloudflare puede tener problemas para enrutar correctamente, y solo expone uno de los servicios.

**Solución**: Si usas esta opción, configura `.env.local` con la misma URL del túnel (sin puerto):

```bash
NEXT_PUBLIC_CHATBOT_URL=https://tunel-xxxxx.trycloudflare.com
```

## Configuración del Archivo `.env.local`

### Ubicación
```
UI_IMSS/.env.local
```

### Contenido
```bash
# URL del backend (túnel de Cloudflare)
NEXT_PUBLIC_CHATBOT_URL=https://backend-xxxxx.trycloudflare.com
```

### Notas Importantes

1. **Formato de la URL:**
   - ✅ Correcto: `https://backend-xxxxx.trycloudflare.com`
   - ❌ Incorrecto: `https://backend-xxxxx.trycloudflare.com:5001` (no incluyas el puerto)
   - ❌ Incorrecto: `http://backend-xxxxx.trycloudflare.com` (debe ser https)

2. **Variable de Entorno:**
   - Debe empezar con `NEXT_PUBLIC_` para que sea accesible en el cliente
   - El nombre debe ser exactamente `NEXT_PUBLIC_CHATBOT_URL`

3. **Reiniciar el Servidor:**
   - Después de crear o modificar `.env.local`, **debes reiniciar** el servidor de Next.js
   - Las variables de entorno solo se cargan al iniciar el servidor

## Verificación de la Configuración

### 1. Verificar que el Frontend Esté Corriendo

```bash
curl http://localhost:3000
```

### 2. Verificar que el Backend Esté Corriendo

```bash
curl http://localhost:5001/health
```

Deberías ver:
```json
{"status":"ok","medical_analyzer":"enabled"}
```

### 3. Verificar que los Túneles Estén Corriendo

```bash
ps aux | grep cloudflared
```

Deberías ver dos procesos de `cloudflared` corriendo.

### 4. Probar el Frontend a Través del Túnel

Abre en el navegador:
```
https://frontend-xxxxx.trycloudflare.com
```

Deberías ver la página de login.

### 5. Probar el Backend a Través del Túnel

Abre en el navegador:
```
https://backend-xxxxx.trycloudflare.com/health
```

Deberías ver:
```json
{"status":"ok","medical_analyzer":"enabled"}
```

### 6. Verificar las Peticiones del Frontend al Backend

Abre las herramientas de desarrollador (F12) en el navegador y ve a la pestaña "Network". Intenta hacer login. Deberías ver peticiones a:
```
https://backend-xxxxx.trycloudflare.com/api/auth/login
```

## Solución de Problemas

### Problema: Error 1033 de Cloudflare

**Causa**: El túnel se desconectó o el servicio no está corriendo.

**Solución**:
1. Verificar que el servicio esté corriendo: `curl http://localhost:3000` o `curl http://localhost:5001/health`
2. Reiniciar el túnel: Detener (Ctrl+C) y volver a ejecutar `cloudflared tunnel --url ...`

### Problema: Las Peticiones al Backend Fracasan

**Causa**: La URL del backend en `.env.local` es incorrecta.

**Solución**:
1. Verificar que `.env.local` tenga la URL correcta del túnel del backend
2. Verificar que la URL no tenga puerto (`:5001`)
3. Verificar que la URL use `https://` (no `http://`)
4. Reiniciar el servidor de Next.js

### Problema: Bucle de Compilación

**Causa**: `app/page.tsx` está redirigiendo constantemente.

**Solución**: Ya se corrigió usando `useRef` para evitar múltiples redirecciones.

## Ejemplo Completo

### Terminal 1: Frontend
```bash
cd UI_IMSS
pnpm dev
# Servidor corriendo en http://localhost:3000
```

### Terminal 2: Backend
```bash
cd chatbot
python main.py
# Servidor corriendo en http://localhost:5001
```

### Terminal 3: Túnel Frontend
```bash
cloudflared tunnel --url http://localhost:3000
# URL: https://frontend-abc123.trycloudflare.com
```

### Terminal 4: Túnel Backend
```bash
cloudflared tunnel --url http://localhost:5001
# URL: https://backend-xyz789.trycloudflare.com
```

### Archivo `UI_IMSS/.env.local`
```bash
NEXT_PUBLIC_CHATBOT_URL=https://backend-xyz789.trycloudflare.com
```

### Reiniciar Frontend
```bash
# En Terminal 1, detener (Ctrl+C) y reiniciar
cd UI_IMSS
pnpm dev
```

## Resumen

1. ✅ **Frontend**: Accesible en `https://frontend-xxxxx.trycloudflare.com`
2. ✅ **Backend**: Accesible en `https://backend-xxxxx.trycloudflare.com`
3. ✅ **`.env.local`**: Configurado con la URL del backend
4. ✅ **Peticiones**: El frontend usa la URL del backend desde `.env.local`


