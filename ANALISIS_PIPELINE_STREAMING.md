# Análisis del Pipeline de Streaming

## 🔍 Flujo Completo del Streaming

### 1. **Frontend → Backend**

**Archivo**: `UI_IMSS/app/chat/page.tsx` (líneas 323-334)

```typescript
const response = await fetch(`${getBackendUrl()}/api/chat`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify({
    message: userMessage,
    image: imageToSend,
    image_format: 'jpeg',
    session_id: currentSession || undefined,
    user_id: userId || undefined,
    stream: true, // ✅ Streaming habilitado
  }),
})
```

✅ **Correcto**: El frontend envía `stream: true`

### 2. **Backend → LangChain**

**Archivo**: `chatbot/main.py` (líneas 338-354)

```python
if req.stream:
    # Streaming con texto
    memory_manager.add_message_to_conversation(session_id, "user", req.message or "", {"stream": True, "user_id": req.user_id})
    
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

✅ **Correcto**: El backend crea un `StreamingResponse` con SSE

### 3. **Backend → LangChain System**

**Archivo**: `chatbot/main.py` (líneas 455-491)

```python
async def process_text_stream(message: str, session_id: str):
    """Procesar texto con streaming"""
    try:
        full_response = ""
        start_ts = int(time.time() * 1000)
        async for chunk in medical_chain.stream_chat(message, session_id):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        
        # Persistir respuesta completa al finalizar el stream
        memory_manager.add_message_to_conversation(session_id, "assistant", full_response, {"stream": True})
        
        yield f"data: {json.dumps({'content': '', 'done': True, 'session_id': session_id})}\n\n"
    except Exception as e:
        logger.error(f"❌ Error en streaming de texto: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
```

✅ **Correcto**: Cada chunk se envía como SSE con formato JSON

### 4. **LangChain System → FallbackLLM**

**Archivo**: `chatbot/langchain_system.py` (líneas 708-779)

```python
async def stream_chat(self, user_message: str, session_id: str = "") -> AsyncGenerator[str, None]:
    # ... preparar contexto ...
    
    # Usar stream() de FallbackLLM que maneja deltas correctamente
    async for delta in self.llm.stream(messages_list):
        if delta:
            accumulated_text += delta
            yield delta
```

✅ **Correcto**: Usa `self.llm.stream()` que calcula deltas correctamente

### 5. **FallbackLLM → vLLM**

**Archivo**: `chatbot/langchain_system.py` (líneas 150-212)

```python
async def stream(self, messages: List[BaseMessage], **kwargs) -> AsyncGenerator[str, None]:
    """Streaming desde vLLM con Ray Serve - Calcula deltas explícitamente"""
    previous_text = ""
    last_chunk_delta = ""
    
    async for chunk in self.ollama_llm.astream(messages, **kwargs):
        chunk_content = chunk.content if hasattr(chunk, 'content') else str(chunk)
        
        if chunk_content:
            # Calcular delta explícitamente
            if len(current_text) > len(previous_text) and current_text.startswith(previous_text):
                # Es texto acumulado, calcular delta
                delta = current_text[len(previous_text):]
            else:
                # Es un delta directo
                delta = current_text
            
            # Agregar espacio si es necesario
            if last_chunk_delta and needs_space:
                yield " "
            
            yield delta
            last_chunk_delta = delta
```

✅ **Correcto**: Calcula deltas correctamente y agrega espacios automáticamente

### 6. **Frontend Recibe Chunks**

**Archivo**: `UI_IMSS/app/chat/page.tsx` (líneas 340-401)

```typescript
const reader = response.body?.getReader()
const decoder = new TextDecoder()
let assistantMessage = ""
let buffer = ""

while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    
    for (const line of lines) {
        if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6))
            
            if (data.done) {
                break
            }
            
            if (data.content) {
                assistantMessage += data.content
                // Actualizar mensaje
                setMessages((prev) => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = {
                        role: "assistant",
                        text: assistantMessage,
                    }
                    return newMessages
                })
            }
        }
    }
}
```

✅ **Correcto**: El frontend acumula los chunks correctamente

---

## 🔧 Problema Identificado

El problema de fragmentación puede deberse a:

1. **Encoding**: Los chunks pueden no estar en UTF-8 correctamente
2. **Buffer**: Puede haber problemas de buffer en el frontend
3. **Normalización**: El texto puede necesitar normalización en tiempo real

---

## ✅ Solución Implementada

### 1. **Uso de `stream()` de FallbackLLM**

El método `stream_chat()` ahora usa `self.llm.stream()` que:
- ✅ Calcula deltas correctamente (acumulado vs directo)
- ✅ Agrega espacios automáticamente entre chunks
- ✅ Maneja casos especiales (puntuación, alfanuméricos)

### 2. **Normalización al Final**

El texto se normaliza al final del streaming para no afectar el streaming en tiempo real:
```python
# Corregir y normalizar el texto final antes de guardar
if accumulated_text:
    corrected = self._fix_fragmented_words(accumulated_text)
    final_normalized = self._normalize_text(corrected)
    history.add_ai_message(final_normalized)
```

---

## 🚀 Verificaciones Necesarias

1. **Encoding UTF-8**: Verificar que todos los chunks estén en UTF-8
2. **Buffer del Frontend**: Verificar que el buffer maneje correctamente los chunks
3. **Normalización**: Considerar normalización en tiempo real si es necesario

---

## 📝 Notas

- El método `stream()` de `FallbackLLM` ya maneja correctamente los deltas
- Los espacios se agregan automáticamente entre chunks
- La normalización se hace al final para no afectar el streaming en tiempo real
- El frontend acumula los chunks correctamente




