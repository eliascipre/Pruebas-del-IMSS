# Análisis Detallado: Generación de Tokens y Visualización en UI

## Resumen Ejecutivo

Este documento analiza cómo funciona la generación de tokens (streaming) en el proyecto **Pruebas-del-IMSS**, específicamente en el chatbot médico, y cómo se visualiza en la interfaz de usuario. El sistema utiliza **Server-Sent Events (SSE)** para transmitir tokens generados por el modelo LLM en tiempo real.

---

## Arquitectura del Sistema

### Componentes Principales

1. **Backend (FastAPI)**: `main.py` - Maneja las peticiones HTTP y el streaming
2. **Sistema LangChain**: `langchain_system.py` - Gestiona la generación de tokens desde vLLM
3. **Frontend (Next.js)**: `UI_IMSS/app/chat/page.tsx` - Visualiza los tokens en tiempo real

---

## Flujo de Generación de Tokens

### 1. Inicio del Proceso (Frontend)

Cuando el usuario envía un mensaje, el frontend realiza una petición POST con `stream: true`:

```typescript
const response = await fetch(`${API_URL}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: messagesForAPI,
    stream: true,
    session_id: currentSessionId,
  }),
})
```

**Características clave:**
- Se crea un mensaje vacío del asistente antes de iniciar el stream
- Se configura el `ReadableStream` para leer los datos SSE

### 2. Procesamiento en el Backend (FastAPI)

El endpoint `/api/chat` detecta `stream: true` y devuelve un `StreamingResponse`:

```python
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if req.stream:
        return StreamingResponse(
            process_text_stream(req.message, session_id),
            media_type="text/event-stream",
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )
```

**Headers importantes:**
- `text/event-stream`: Formato SSE
- `Cache-Control: no-cache`: Evita caché del navegador
- `Connection: keep-alive`: Mantiene la conexión abierta
- `X-Accel-Buffering: no`: Desactiva buffering en Nginx (si aplica)

### 3. Generación de Tokens (LangChain)

La función `process_text_stream` utiliza el generador asíncrono de LangChain:

```python
async def process_text_stream(message: str, session_id: str):
    full_response = ""
    async for chunk in medical_chain.stream_chat(message, session_id):
        full_response += chunk
        yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
    
    # Al finalizar
    yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
```

**Proceso interno en `langchain_system.py`:**

```python
async def stream_chat(self, user_message: str, session_id: str) -> AsyncGenerator[str, None]:
    # Construir contexto (entidades, mensajes recientes)
    messages = [SystemMessage(...), HumanMessage(...)]
    
    # Stream desde vLLM
    async for chunk in self.llm.stream(messages):
        full_response += chunk
        yield chunk  # Cada chunk es un token o fragmento de texto
```

**Conexión con vLLM:**
- El `FallbackLLM` utiliza `ChatOpenAI` configurado para streaming
- Cada chunk recibido de vLLM se envía inmediatamente al frontend
- El formato de vLLM es compatible con OpenAI API (SSE)

### 4. Formato SSE (Server-Sent Events)

Cada token se envía en formato SSE estándar:

```
data: {"content": "token", "done": false}

data: {"content": " ", "done": false}

data: {"content": "siguiente", "done": false}

data: {"content": "", "done": true}

```

**Estructura del mensaje:**
- `data: ` - Prefijo requerido para SSE
- JSON con `content` (el token) y `done` (estado)
- Doble salto de línea `\n\n` separa cada mensaje

---

## Visualización en la UI

### 1. Lectura del Stream (Frontend)

El frontend lee el stream usando `ReadableStream`:

```typescript
const reader = response.body?.getReader()
const decoder = new TextDecoder()
let buffer = ""

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split("\n")
  buffer = lines.pop() || ""  // Mantener línea incompleta
  
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const dataStr = line.slice(6)
      if (dataStr.trim() === "[DONE]") continue
      
      const data = JSON.parse(dataStr)
      if (data.content) {
        assistantMessage += data.content
        // Actualizar UI inmediatamente
        setMessages((prev) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: assistantMessage,
          }
          return newMessages
        })
      }
    }
  }
}
```

**Características importantes:**
- **Buffer de líneas**: Maneja chunks que pueden cortar líneas SSE
- **Decodificación UTF-8**: Maneja caracteres multibyte correctamente
- **Actualización incremental**: Cada token se agrega al mensaje acumulado

### 2. Renderizado en Tiempo Real

El componente React actualiza el estado en cada chunk:

```typescript
// Mensaje inicial vacío
setMessages((prev) => [...prev, { role: "assistant", content: "" }])

// Actualización por cada token
setMessages((prev) => {
  const newMessages = [...prev]
  newMessages[newMessages.length - 1] = {
    role: "assistant",
    content: assistantMessage,  // Contenido acumulado
  }
  return newMessages
})
```

**Renderizado con ReactMarkdown:**

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // Componentes personalizados para estilos
    p: ({ children }) => <p className="mb-2">{children}</p>,
    // ... más componentes
  }}
>
  {normalizeMarkdown(message.content)}
</ReactMarkdown>
```

**Normalización de Markdown:**
- Se normaliza el contenido antes de renderizar
- Se detectan y corrigen tablas mal formateadas
- Se aseguran saltos de línea correctos

---

## Comparación con el Ejemplo Proporcionado

### Similitudes

1. **Mismo formato SSE**: Ambos usan `data: {json}\n\n`
2. **Mismo patrón de lectura**: Buffer + procesamiento línea por línea
3. **Misma actualización de estado**: Mensaje acumulado que se actualiza incrementalmente
4. **Mismo manejo de UTF-8**: Decodificación con `stream: true` para caracteres multibyte

### Diferencias Clave

| Aspecto | Proyecto Actual | Ejemplo Proporcionado |
|---------|----------------|----------------------|
| **Backend** | FastAPI (async) | Flask (sync con asyncio) |
| **Formato respuesta** | `{content: string, done: bool}` | `{content: string, done: bool}` + `processed` |
| **Manejo de tablas** | Normalización en frontend | Backend puede enviar HTML procesado |
| **Estado de carga** | `isLoading` simple | Indicador visual de escritura (`animate-pulse`) |
| **Manejo de errores** | Try-catch en stream | Remoción de mensaje vacío + mensaje de error |

---

## Flujo Completo de un Token

```
1. Usuario escribe "hola" y presiona Enter
   ↓
2. Frontend: POST /api/chat con stream: true
   ↓
3. Backend: StreamingResponse con process_text_stream()
   ↓
4. LangChain: Construye mensajes con contexto
   ↓
5. vLLM: Genera token "¡" → chunk 1
   ↓
6. LangChain: yield "¡"
   ↓
7. Backend: yield 'data: {"content": "¡", "done": false}\n\n'
   ↓
8. Red: SSE transmite el chunk
   ↓
9. Frontend: reader.read() recibe chunk
   ↓
10. Frontend: decoder.decode() → "data: {...}\n\n"
   ↓
11. Frontend: JSON.parse() → {content: "¡", done: false}
   ↓
12. Frontend: assistantMessage += "¡"
   ↓
13. Frontend: setMessages() actualiza estado
   ↓
14. React: Re-renderiza componente
   ↓
15. UI: Muestra "¡" en tiempo real
   ↓
16. Repite pasos 5-15 para cada token siguiente
   ↓
17. vLLM: Termina generación
   ↓
18. Backend: yield 'data: {"content": "", "done": true}\n\n'
   ↓
19. Frontend: Detecta done: true, finaliza stream
   ↓
20. Backend: Persiste mensaje completo en memoria
```

---

## Optimizaciones y Mejoras Implementadas

### 1. Buffer de Líneas
Evita problemas cuando un chunk corta una línea SSE a la mitad:
```typescript
buffer += decoder.decode(value, { stream: true })
const lines = buffer.split("\n")
buffer = lines.pop() || ""  // Guarda línea incompleta
```

### 2. Decodificación UTF-8 Segura
Maneja caracteres multibyte (español, emojis):
```typescript
const decoder = new TextDecoder('utf-8', { fatal: false })
buffer += decoder.decode(value, { stream: true })
```

### 3. Normalización de Markdown
Corrige tablas y formato antes de renderizar:
```typescript
const normalizeMarkdown = (content: string): string => {
  // Detecta y corrige tablas
  // Normaliza saltos de línea
  // Asegura formato correcto
}
```

### 4. Persistencia Asíncrona
El mensaje completo se guarda después del stream:
```python
async def process_text_stream(message: str, session_id: str):
    full_response = ""
    async for chunk in medical_chain.stream_chat(...):
        full_response += chunk
        yield chunk
    
    # Persistir al finalizar
    memory_manager.add_message_to_conversation(
        session_id, "assistant", full_response
    )
```

---

## Problemas Potenciales y Soluciones

### 1. Chunks Incompletos
**Problema**: Un chunk puede cortar un mensaje SSE a la mitad.

**Solución**: Buffer que mantiene líneas incompletas:
```typescript
buffer = lines.pop() || ""  // Guarda última línea
```

### 2. Caracteres UTF-8 Multibyte
**Problema**: Un carácter puede dividirse entre chunks.

**Solución**: Decodificación con `stream: true`:
```typescript
decoder.decode(value, { stream: true })  // Mantiene estado
```

### 3. Tablas Markdown Mal Formateadas
**Problema**: El modelo puede generar tablas sin pipes correctos.

**Solución**: Normalización antes de renderizar:
```typescript
// Detecta tablas y corrige formato
if (!normalizedLine.startsWith('|')) {
  normalizedLine = '| ' + normalizedLine
}
```

### 4. Conexión Perdida
**Problema**: Si se pierde la conexión, el stream se interrumpe.

**Solución**: Manejo de errores con mensaje al usuario:
```typescript
catch (error) {
  setMessages((prev) => {
    // Remover mensaje vacío y agregar error
    newMessages.pop()
    newMessages.push({
      role: "assistant",
      content: "Error al procesar mensaje..."
    })
  })
}
```

---

## Métricas y Observabilidad

El sistema registra métricas de cada interacción:

```python
memory_manager.log_chat_metrics(
    session_id=session_id,
    input_chars=len(message),
    output_chars=len(full_response),
    started_at=start_ts,
    ended_at=end_ts,
    duration_ms=end_ts - start_ts,
    stream=True,
    model='google/medgemma-27b-it',
    provider='vllm',
)
```

**Métricas capturadas:**
- Tiempo de inicio y fin
- Duración total
- Caracteres de entrada y salida
- Modelo y proveedor utilizados
- Si fue streaming o no

---

## Conclusiones

1. **Streaming Eficiente**: El sistema utiliza SSE correctamente para transmitir tokens en tiempo real.

2. **UX Mejorada**: Los usuarios ven la respuesta generándose token por token, mejorando la percepción de velocidad.

3. **Arquitectura Robusta**: Separación clara entre backend (FastAPI), lógica de negocio (LangChain), y frontend (Next.js).

4. **Manejo de Errores**: Implementación adecuada de buffers y decodificación UTF-8 para casos edge.

5. **Persistencia**: Los mensajes se guardan después del stream completo, evitando escrituras parciales.

---

## Recomendaciones

1. **Indicador Visual**: Agregar un cursor parpadeante (`animate-pulse`) cuando `isLoading` es true.

2. **Reintento Automático**: Implementar retry en caso de pérdida de conexión durante el stream.

3. **Compresión**: Considerar compresión gzip para streams largos (aunque puede afectar latencia).

4. **Rate Limiting**: Implementar límites de tokens por segundo para evitar sobrecarga.

5. **Métricas de Latencia**: Medir tiempo de primer token (TTFT) y tokens por segundo (TPS).

---

## Referencias de Código

- **Backend Streaming**: `chatbot/main.py` líneas 344-380
- **LangChain Stream**: `chatbot/langchain_system.py` líneas 318-354
- **Frontend Stream Reader**: `UI_IMSS/app/chat/page.tsx` líneas 311-466
- **Normalización Markdown**: `UI_IMSS/app/chat/page.tsx` líneas 78-210

