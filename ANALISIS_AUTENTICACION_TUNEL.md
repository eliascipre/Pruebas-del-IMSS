# Análisis: Problemas de Autenticación en Túneles SSH de Cloudflare

## Problema Identificado

Cuando se usa un túnel SSH de Cloudflare, las peticiones de autenticación (login, registro, verificación de token) se quedan colgadas y no continúan, aunque CORS esté configurado para permitir todo.

## Problemas Encontrados

### 1. **Falta de Timeouts en Peticiones Fetch**

Las peticiones de autenticación en los siguientes archivos **NO tienen timeouts configurados**:
- `components/auth/login-form.tsx` (línea 41)
- `components/auth/register-form.tsx` (línea 57)
- `components/auth/protected-route.tsx` (línea 79)

**Problema**: Si hay problemas de red o el backend no responde, la petición puede quedarse esperando indefinidamente.

**Solución**: Agregar `AbortSignal.timeout()` a todas las peticiones fetch.

### 2. **Detección Incorrecta de URL del Backend en Túneles SSH**

La lógica actual intenta usar `${protocol}//${hostname}:5001`, pero en un túnel SSH de Cloudflare:
- El hostname puede ser diferente (ej: `xxxx.trycloudflare.com`)
- El puerto 5001 puede no estar accesible directamente
- El backend puede estar en el mismo hostname pero sin puerto explícito

**Código problemático**:
```typescript
return `${protocol}//${hostname}:5001`
```

**Solución**: 
- Usar variable de entorno `NEXT_PUBLIC_CHATBOT_URL` cuando esté disponible
- Detectar si estamos en un túnel SSH (hostname contiene `cloudflare`, `ngrok`, etc.)
- En túneles SSH, usar el mismo hostname pero sin puerto (asumiendo que el backend está en el mismo túnel)

### 3. **Falta de Manejo de Errores de Red**

Los catch blocks solo muestran mensajes genéricos sin distinguir entre:
- Timeout
- Error de conexión
- Error de red
- Error del servidor

**Solución**: Mejorar el manejo de errores para distinguir tipos de error.

### 4. **No Hay Reintentos**

Si una petición falla por problemas temporales de red, no hay reintentos automáticos.

**Solución**: Implementar reintentos con backoff exponencial para errores de red.

## Soluciones Implementadas

### ✅ Solución 1: Utilidad Centralizada para Peticiones HTTP

Se creó el archivo `lib/api-client.ts` que:
- ✅ Configura timeouts por defecto (30 segundos)
- ✅ Maneja errores de red con mensajes descriptivos
- ✅ Implementa reintentos con backoff exponencial (máximo 2 reintentos)
- ✅ Detecta correctamente la URL del backend en túneles SSH
- ✅ Proporciona funciones especializadas: `fetchAuth()`, `fetchAuthenticated()`, `fetchJson()`

### ✅ Solución 2: Componentes de Autenticación Actualizados

Se actualizaron todos los componentes de autenticación:
- ✅ `components/auth/login-form.tsx` - Usa `fetchAuth()` con timeout
- ✅ `components/auth/register-form.tsx` - Usa `fetchAuth()` con timeout
- ✅ `components/auth/protected-route.tsx` - Usa `fetchAuthenticated()` con timeout de 10 segundos

### ✅ Solución 3: Detección Mejorada de URL del Backend

La función `getBackendUrl()` ahora:
- ✅ Detecta túneles SSH de Cloudflare, ngrok, localtunnel, etc.
- ✅ Usa variable de entorno `NEXT_PUBLIC_CHATBOT_URL` cuando está disponible
- ✅ En túneles SSH, usa el mismo hostname con puerto 5001
- ✅ Maneja correctamente localhost y otros casos

## Archivos Modificados

1. ✅ `UI_IMSS/lib/api-client.ts` (nuevo) - Utilidad centralizada
2. ✅ `UI_IMSS/components/auth/login-form.tsx` - Actualizado para usar `fetchAuth()`
3. ✅ `UI_IMSS/components/auth/register-form.tsx` - Actualizado para usar `fetchAuth()`
4. ✅ `UI_IMSS/components/auth/protected-route.tsx` - Actualizado para usar `fetchAuthenticated()`

## Configuración Recomendada

Para túneles SSH de Cloudflare, configurar en `.env.local`:
```bash
NEXT_PUBLIC_CHATBOT_URL=https://xxxx.trycloudflare.com:5001
```

**Nota**: Si el backend está en el mismo túnel pero en un puerto diferente, ajustar el puerto en la URL.

## Mejoras Implementadas

### 1. Timeouts
- Todas las peticiones de autenticación tienen timeout de 30 segundos por defecto
- La verificación de token en `ProtectedRoute` tiene timeout de 10 segundos (más corto porque es más frecuente)

### 2. Reintentos
- Máximo 2 reintentos automáticos para errores de red recuperables
- Backoff exponencial entre reintentos (1s, 2s)

### 3. Manejo de Errores
- Mensajes de error descriptivos:
  - "La petición tardó demasiado. Por favor intenta de nuevo." (timeout)
  - "Error de conexión. Verifica tu conexión a internet." (error de red)
- Distinción entre errores recuperables y no recuperables

### 4. Detección de Túneles SSH
- Detecta automáticamente túneles de Cloudflare, ngrok, localtunnel, etc.
- Usa el mismo hostname con puerto 5001 cuando detecta un túnel

## Pruebas Recomendadas

1. **Probar login/registro en túnel SSH de Cloudflare**:
   - Verificar que las peticiones no se queden colgadas
   - Verificar que los timeouts funcionan correctamente
   - Verificar que los mensajes de error son claros

2. **Probar con variable de entorno**:
   - Configurar `NEXT_PUBLIC_CHATBOT_URL` en `.env.local`
   - Verificar que se usa la URL configurada

3. **Probar manejo de errores**:
   - Desconectar el backend y verificar que se muestra un mensaje de error claro
   - Verificar que no se queda colgado indefinidamente

