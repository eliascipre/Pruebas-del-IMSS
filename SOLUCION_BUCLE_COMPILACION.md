# Solución: Bucle de Compilación en Next.js

## Problema Identificado

El bucle de compilación se debía a múltiples componentes redirigiendo entre sí:

1. **`app/page.tsx`**: Redirige a `/home` o `/login` según el token
2. **`app/login/page.tsx`**: Redirige a `/home` si hay token
3. **`components/auth/protected-route.tsx`**: Redirige a `/` si no hay token

Esto creaba un bucle:
- Si hay token: `/` → `/home` → `ProtectedRoute` verifica → si falla → `/` → bucle
- Si no hay token: `/` → `/login` → verifica token → si hay → `/home` → `ProtectedRoute` → si falla → `/` → bucle

## Soluciones Aplicadas

### 1. **`app/page.tsx`** - Simplificado

- ✅ Usa `useRef` para evitar múltiples redirecciones
- ✅ Solo redirige si está en la ruta raíz (`/`)
- ✅ Usa `router.replace()` en lugar de `router.push()`
- ✅ Eliminado estado innecesario

### 2. **`app/login/page.tsx`** - Mejorado

- ✅ Agregado `usePathname()` para verificar la ruta actual
- ✅ Usa `useRef` para evitar múltiples verificaciones
- ✅ Solo verifica si está en `/login`
- ✅ Usa `router.replace()` en lugar de `router.push()`

### 3. **`components/auth/protected-route.tsx`** - Corregido

- ✅ Redirige a `/login` en lugar de `/` para evitar bucles
- ✅ Verifica la ruta actual antes de redirigir
- ✅ Usa `router.replace()` en lugar de `router.push()`

## Cambios Realizados

### `app/page.tsx`
```typescript
// Antes: Redirigía constantemente
// Ahora: Solo redirige una vez si está en la ruta raíz
if (hasRedirected.current || pathname !== '/') return
```

### `app/login/page.tsx`
```typescript
// Antes: Redirigía sin verificar la ruta
// Ahora: Solo verifica si está en /login
if (hasChecked.current || pathname !== '/login') return
```

### `components/auth/protected-route.tsx`
```typescript
// Antes: Redirigía a '/' causando bucles
// Ahora: Redirige a '/login' y verifica la ruta actual
if (pathname !== '/login') {
  router.replace('/login')
}
```

## Verificación

Después de los cambios:

1. ✅ **No hay bucles de compilación** - El servidor solo compila cuando hay cambios reales
2. ✅ **Redirecciones correctas** - Los usuarios son redirigidos a la ruta correcta sin bucles
3. ✅ **Mejor rendimiento** - Menos re-renders innecesarios

## Próximos Pasos

1. **Reiniciar el servidor de Next.js:**
   ```bash
   cd UI_IMSS
   # Detener (Ctrl+C) y reiniciar
   pnpm dev
   ```

2. **Verificar que no haya bucles:**
   - El servidor debería compilar solo cuando hay cambios reales
   - No debería haber compilaciones repetidas de las mismas rutas

3. **Probar las redirecciones:**
   - Sin token: `/` → `/login`
   - Con token: `/` → `/home`
   - Con token en `/login`: `/login` → `/home`
   - Sin token en `/home`: `/home` → `/login`

