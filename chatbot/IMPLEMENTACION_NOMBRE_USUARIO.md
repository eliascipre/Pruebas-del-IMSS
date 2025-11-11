# Implementación de Personalización con Nombre del Usuario

## Resumen

Se ha implementado la funcionalidad para que el chatbot personalice el saludo usando el nombre del usuario registrado en la base de datos.

## Cambios Implementados

### 1. Modificación de `process_chat` en `langchain_system.py`

**Línea 888**: Se agregó el parámetro `user_name: Optional[str] = None`

**Líneas 914-937**: Se modificó el manejo de saludos para incluir el nombre del usuario:

```python
# Manejar saludos
if special_message == "greeting":
    # Formatear saludo con nombre del usuario si está disponible
    if user_name and user_name.strip():
        # Extraer solo el primer nombre si hay múltiples palabras
        first_name = user_name.strip().split()[0] if user_name.strip() else ""
        greeting_name = f"Dr./Dra. {first_name}"
    else:
        greeting_name = "Dr./Dra."
    
    # Formato estructurado de presentación profesional
    response = f"""Hola {greeting_name},

Soy un modelo de inteligencia artificial diseñado para tareas médicas complejas. 
...
```

**Resultado**:
- Si el usuario tiene nombre: "Hola Dr./Dra. [PrimerNombre],"
- Si no tiene nombre: "Hola Dr./Dra.,"

### 2. Modificación de `stream_chat` en `langchain_system.py`

**Línea 1307**: Se agregó el parámetro `user_name: Optional[str] = None`

**Líneas 1329-1334**: Se modificó el system prompt para incluir el nombre del usuario:

```python
# Incluir nombre del usuario si está disponible para personalización
if user_name and user_name.strip():
    first_name = user_name.strip().split()[0] if user_name.strip() else ""
    system_content = f"Eres un asistente médico del IMSS. Responde en español de manera clara y profesional. El usuario es Dr./Dra. {first_name}."
else:
    system_content = "Eres un asistente médico del IMSS. Responde en español de manera clara y profesional."
```

**Resultado**: El LLM en modo streaming sabrá el nombre del usuario y puede usarlo en sus respuestas.

### 3. Modificación de `main.py` - Endpoint `/api/chat`

**Línea 473-474**: Se obtiene el nombre del usuario antes del streaming:
```python
# Obtener nombre del usuario para personalización
user_name = user.get('name')
```

**Línea 477**: Se pasa el nombre a `process_text_stream`:
```python
process_text_stream(req.message, session_id, user_name=user_name)
```

**Línea 553-555**: Se obtiene y pasa el nombre del usuario a `process_chat`:
```python
# Obtener nombre del usuario para personalización
user_name = user.get('name')
response = await medical_chain.process_chat(req.message, session_id, request_id=request_id, user_name=user_name)
```

### 4. Modificación de `process_text_stream` en `main.py`

**Línea 673**: Se agregó el parámetro `user_name: Optional[str] = None`

**Línea 703**: Se pasa el nombre a `stream_chat`:
```python
async for chunk in medical_chain.stream_chat(message, session_id, user_name=user_name):
```

## Flujo de Datos

1. **Usuario autenticado** → `main.py` recibe el objeto `user` con `name` desde `require_auth`
2. **Extracción del nombre** → `user.get('name')` obtiene el nombre del usuario
3. **Paso a funciones** → El nombre se pasa a:
   - `process_chat()` para saludos hardcodeados
   - `stream_chat()` para incluir en el system prompt
4. **Personalización**:
   - **Modo no-streaming**: Saludo hardcodeado con nombre
   - **Modo streaming**: System prompt incluye el nombre para que el LLM lo use

## Ejemplos de Uso

### Caso 1: Usuario con nombre "Juan Pérez"
**Saludo generado**: "Hola Dr./Dra. Juan,"

### Caso 2: Usuario sin nombre (campo `name` vacío o None)
**Saludo generado**: "Hola Dr./Dra.,"

### Caso 3: Usuario con nombre completo "María González López"
**Saludo generado**: "Hola Dr./Dra. María," (solo primer nombre)

## Consideraciones

1. **Extracción del primer nombre**: Se usa solo el primer nombre para mantener el saludo conciso
2. **Validación**: Se verifica que el nombre no esté vacío antes de usarlo
3. **Compatibilidad**: Si no hay nombre, se usa el formato genérico "Dr./Dra."
4. **Streaming**: En modo streaming, el nombre se incluye en el system prompt, permitiendo que el LLM lo use naturalmente en sus respuestas

## Archivos Modificados

1. `/home/administrador/Pruebas-del-IMSS/chatbot/langchain_system.py`
   - Función `process_chat`: Líneas 888, 914-937
   - Función `stream_chat`: Líneas 1307, 1329-1334

2. `/home/administrador/Pruebas-del-IMSS/chatbot/main.py`
   - Endpoint `/api/chat`: Líneas 473-474, 477, 553-555
   - Función `process_text_stream`: Líneas 673, 703

## Pruebas Recomendadas

1. **Usuario con nombre**: Registrar un usuario con nombre y verificar que el saludo incluya el nombre
2. **Usuario sin nombre**: Registrar un usuario sin nombre y verificar que use el formato genérico
3. **Modo streaming**: Probar que el LLM use el nombre en respuestas de streaming
4. **Modo no-streaming**: Probar que el saludo hardcodeado incluya el nombre

## Notas Técnicas

- El nombre se obtiene desde la base de datos a través del token JWT
- El campo `name` está disponible en la tabla `users` de la base de datos
- La función `verify_token` en `auth_manager.py` retorna el nombre del usuario
- El nombre se pasa como parámetro opcional para mantener compatibilidad con código existente

