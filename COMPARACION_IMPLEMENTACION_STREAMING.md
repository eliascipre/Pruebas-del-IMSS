# Comparación de Implementación de Streaming: Proyecto Actual vs Ejemplo

## Resumen

Este documento compara la implementación de streaming de tokens en el proyecto actual con el ejemplo proporcionado, destacando similitudes, diferencias y mejores prácticas.

---

## 1. Inicio del Stream (Frontend)

### Proyecto Actual

```typescript
// UI_IMSS/app/chat/page.tsx
const response = await fetch(`${getBackendUrl()}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    image: imageToSend,
    image_format: 'jpeg',
    session_id: currentSession || undefined,
    user_id: userId || undefined,
    stream: true,  // ✅ Streaming habilitado
  }),
})

// Crear mensaje vacío del asistente
let assistantMessage = ""
setMessages(prev => [...prev, { role: 'assistant', text: '' }])
```

### Ejemplo Proporcionado

```typescript
// Ejemplo proporcionado
const response = await fetch(`${API_URL}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: messagesForAPI,
    stream: true,
    session_id: currentSessionId,
  }),
})

// Agregar mensaje vacío del asistente
setMessages((prev) => [...prev, { role: "assistant", content: "" }])
```

**Diferencias:**
- **Proyecto actual**: Usa `message` (string) vs `messages` (array)
- **Proyecto actual**: Soporta imágenes (`image`, `image_format`)
- **Proyecto actual**: Usa `text` vs `content` en el estado

---

## 2. Lectura del Stream

### Proyecto Actual

```typescript
// UI_IMSS/app/chat/page.tsx
const reader = response.body?.getReader()
const decoder = new TextDecoder('utf-8', { fatal: false })
let buffer = ""

if (reader) {
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      // Flush del decoder
      try {
        buffer += decoder.decode(new Uint8Array(), { stream: false })
      } catch (e) {}
      
      // Procesar buffer final
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.substring(6).trim()
            if (dataStr && dataStr !== '[DONE]') {
              try {
                const data = JSON.parse(dataStr)
                // Procesar contenido final
              } catch (e) {}
            }
          }
        }
      }
      break
    }

    // Decodificar chunk
    try {
      buffer += decoder.decode(value, { stream: true })
    } catch (e) {
      buffer += decoder.decode(value, { stream: false })
    }
    
    // Procesar mensajes completos delimitados por \n\n
    let boundaryIndex
    while ((boundaryIndex = buffer.indexOf('\n\n')) >= 0) {
      const message = buffer.substring(0, boundaryIndex)
      buffer = buffer.substring(boundaryIndex + 2)

      const lines = message.split('\n')
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('data: ')) {
          const dataStr = trimmedLine.substring(6).trim()
          
          if (dataStr === '[DONE]') {
            fetchConversations()
            return
          }

          if (!dataStr) continue

          try {
            const data = JSON.parse(dataStr)
            
            // Extraer contenido - soportar múltiples formatos
            let chunkContent = ''
            if (data.content && typeof data.content === 'string') {
              chunkContent = data.content
            } else if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
              const choice = data.choices[0]
              if (choice.delta && choice.delta.content) {
                chunkContent = choice.delta.content
              }
            }
            
            if (chunkContent) {
              assistantMessage += chunkContent
              setMessages(prev => {
                const updated = [...prev]
                const lastIndex = updated.length - 1
                if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                  updated[lastIndex] = {
                    role: 'assistant',
                    text: assistantMessage,
                  }
                }
                return updated
              })
            }
            
            if (data.done) {
              if (data.session_id) {
                setSessionId(data.session_id)
              }
              fetchConversations()
              return
            }
          } catch (e) {
            console.warn('Error parsing SSE data:', e)
          }
          break
        }
      }
    }
  }
}
```

### Ejemplo Proporcionado

```typescript
// Ejemplo proporcionado
const reader = response.body?.getReader()
const decoder = new TextDecoder()
let buffer = ""

if (reader) {
  while (true) {
    const { done, value } = await reader.read()
    
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.slice(6)
        
        if (dataStr.trim() === "[DONE]") {
          continue
        }

        try {
          const data = JSON.parse(dataStr)
          
          if (data.done) {
            break
          }

          if (data.content) {
            // Si el contenido viene procesado (con tablas convertidas a HTML), reemplazar todo
            if (data.processed) {
              assistantMessage = data.content
            } else {
              assistantMessage += data.content
            }
            
            // Actualizar el último mensaje (asistente)
            setMessages((prev) => {
              const newMessages = [...prev]
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: assistantMessage,
              }
              return newMessages
            })
          }
        } catch (e) {
          console.warn("Error parsing SSE data:", e)
        }
      }
    }
  }
}
```

**Diferencias Clave:**

| Aspecto | Proyecto Actual | Ejemplo Proporcionado |
|---------|----------------|----------------------|
| **Procesamiento de buffer** | Busca `\n\n` como delimitador | Procesa línea por línea |
| **Soporte de formatos** | Soporta OpenAI/vLLM y formato propio | Solo formato propio |
| **Manejo de `[DONE]`** | Retorna inmediatamente | Continúa procesando |
| **Flush final** | Decodifica buffer final explícitamente | No hay flush explícito |
| **Soporte `processed`** | No implementado | Soporta contenido HTML procesado |

**Ventajas del Proyecto Actual:**
- ✅ Soporta múltiples formatos (OpenAI/vLLM y propio)
- ✅ Manejo más robusto de chunks incompletos
- ✅ Flush explícito del decoder

**Ventajas del Ejemplo:**
- ✅ Código más simple y legible
- ✅ Soporte para contenido HTML procesado (`processed: true`)
- ✅ Manejo más directo de líneas SSE

---

## 3. Generación de Tokens (Backend)

### Proyecto Actual

```python
# chatbot/main.py
async def process_text_stream(message: str, session_id: str):
    """Procesar texto con streaming"""
    try:
        full_response = ""
        start_ts = int(time.time() * 1000)
        async for chunk in medical_chain.stream_chat(message, session_id):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        
        # Persistir respuesta completa al finalizar el stream
        try:
            memory_manager.add_message_to_conversation(
                session_id, "assistant", full_response, {"stream": True}
            )
        except Exception as _e:
            logger.warning(f"⚠️ No se pudo persistir respuesta del asistente (stream): {_e}")
        
        # Métricas
        try:
            end_ts = int(time.time() * 1000)
            memory_manager.log_chat_metrics(
                session_id=session_id,
                input_chars=len(message or ''),
                output_chars=len(full_response or ''),
                started_at=start_ts,
                ended_at=end_ts,
                duration_ms=end_ts - start_ts,
                model='google/medgemma-27b-it',
                provider='vllm',
                stream=True,
                is_image=False,
                success=True,
            )
        except Exception as _e:
            logger.warning(f"⚠️ No se pudieron registrar métricas (stream): {_e}")

        yield f"data: {json.dumps({'content': '', 'done': True, 'session_id': session_id})}\n\n"
    except Exception as e:
        logger.error(f"❌ Error en streaming de texto: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
```

### Ejemplo Proporcionado (Flask)

```python
# Ejemplo proporcionado (Flask)
def generate():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        async def process():
            chunks = []
            async for chunk in medical_chain.stream_chat(message, session_id):
                chunks.append(chunk)
            return chunks
        
        chunks = loop.run_until_complete(process())
        
        for chunk in chunks:
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
    finally:
        loop.close()

return Response(
    stream_with_context(generate()),
    mimetype='text/event-stream',
    headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    }
)
```

**Diferencias Clave:**

| Aspecto | Proyecto Actual | Ejemplo Proporcionado |
|---------|----------------|----------------------|
| **Framework** | FastAPI (async nativo) | Flask (sync con asyncio) |
| **Generación** | Async generator directo | Acumula chunks y luego yield |
| **Persistencia** | Después del stream | No se muestra en ejemplo |
| **Métricas** | Registra métricas completas | No se muestra en ejemplo |
| **Manejo de errores** | Try-catch con yield de error | No se muestra en ejemplo |

**Ventajas del Proyecto Actual:**
- ✅ Async nativo (más eficiente)
- ✅ Persistencia automática
- ✅ Métricas completas
- ✅ Manejo de errores robusto

**Ventajas del Ejemplo:**
- ✅ Código más simple
- ✅ Compatible con Flask (más común)

---

## 4. Generación de Tokens (LangChain)

### Proyecto Actual

```python
# chatbot/langchain_system.py
async def stream_chat(self, user_message: str, session_id: str = "") -> AsyncGenerator[str, None]:
    """Procesar chat con streaming"""
    try:
        # Construcción de contexto paralela
        async def build_entity_ctx() -> str:
            return self.memory.get_entity_context()

        async def build_recent_msgs() -> List[Dict[str, Any]]:
            return self.memory.get_recent_messages(limit=3)

        entity_context, recent_messages = await asyncio.gather(
            build_entity_ctx(), 
            build_recent_msgs()
        )

        # Crear mensajes
        messages = [
            SystemMessage(content="\n".join([
                self.system_prompt,
                ("\n\n" + entity_context) if entity_context else "",
                ("\n\n## Conversación reciente:\n" + "\n".join([
                    ("Usuario" if m["role"] == "user" else "Asistente") + ": " + 
                    (m["content"][:150] + "..." if len(m["content"]) > 150 else m["content"]) 
                    for m in recent_messages
                ])) if recent_messages else ""
            ]).strip()),
            HumanMessage(content=user_message)
        ]

        # Stream response
        full_response = ""
        async for chunk in self.llm.stream(messages):
            full_response += chunk
            yield chunk
        
        # Guardar en memoria
        self.memory.add_message("user", user_message)
        self.memory.add_message("assistant", full_response)
        
    except Exception as e:
        logger.error(f"❌ Error en streaming: {e}")
        yield f"Error: {str(e)}"
```

**Características:**
- ✅ Construcción de contexto en paralelo (`asyncio.gather`)
- ✅ Memoria de entidades y mensajes recientes
- ✅ Guardado en memoria después del stream
- ✅ Manejo de errores con yield de error

---

## 5. Renderizado en UI

### Proyecto Actual

```typescript
// UI_IMSS/app/chat/page.tsx
{messages.map((msg, idx) => (
  <div key={idx} className="flex gap-2 sm:gap-3">
    <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
      <div className={`inline-block px-3 py-2 sm:px-4 sm:py-2 rounded-lg ${
        msg.role === 'user' ? 'bg-[#068959] text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        {msg.role === 'assistant' ? (
          <div 
            className="prose prose-sm max-w-none" 
            dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} 
          />
        ) : (
          msg.text
        )}
      </div>
    </div>
  </div>
))}
```

### Ejemplo Proporcionado

```typescript
// Ejemplo proporcionado
{messages.map((message, index) => (
  <div
    key={index}
    className={`flex gap-4 ${
      message.role === "user" ? "justify-end" : "justify-start"
    }`}
  >
    {message.role === "assistant" && (
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-xs sm:text-sm">Q</span>
      </div>
    )}
    <div
      className={`max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 ${
        message.role === "user"
          ? "bg-teal-500 text-[#0a1f1f]"
          : "bg-[#0d2626] text-gray-300"
      }`}
    >
      {message.role === "assistant" ? (
        <div className="max-w-none leading-relaxed markdown-content">
          {/* Detectar si el contenido contiene HTML procesado */}
          {message.content.includes('<table') || 
           message.content.includes('<div class="overflow-x-auto') ? (
            <div 
              dangerouslySetInnerHTML={{ __html: message.content }}
              className="max-w-none"
            />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Componentes personalizados
              }}
            >
              {normalizeMarkdown(message.content)}
            </ReactMarkdown>
          )}
          {index === messages.length - 1 && isLoading && (
            <span className="inline-block w-2 h-4 bg-teal-400 ml-1 animate-pulse" />
          )}
        </div>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed break-words">
          {message.content}
        </p>
      )}
    </div>
    {message.role === "user" && (
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-medium">U</span>
      </div>
    )}
  </div>
))}
```

**Diferencias:**

| Aspecto | Proyecto Actual | Ejemplo Proporcionado |
|---------|----------------|----------------------|
| **Librería Markdown** | `dangerouslySetInnerHTML` con `formatMarkdown` | `ReactMarkdown` con `remarkGfm` |
| **Avatares** | No implementados | Avatares con iniciales (Q, U) |
| **Indicador de escritura** | No implementado | Cursor parpadeante (`animate-pulse`) |
| **Soporte HTML procesado** | No implementado | Detecta y renderiza HTML directamente |
| **Normalización** | `formatMarkdown` (conversión a HTML) | `normalizeMarkdown` (corrección de formato) |

**Ventajas del Proyecto Actual:**
- ✅ Conversión directa a HTML (más rápido)
- ✅ Código más simple

**Ventajas del Ejemplo:**
- ✅ ReactMarkdown (más seguro, mejor soporte)
- ✅ Indicador visual de escritura
- ✅ Soporte para HTML procesado del backend
- ✅ Avatares mejoran UX

---

## 6. Normalización de Markdown

### Proyecto Actual

```typescript
// UI_IMSS/app/chat/page.tsx
const formatMarkdown = (text: string): string => {
  // Detecta y arregla tablas que tienen filas sin | al inicio
  const lines = text.split('\n')
  let inTable = false
  const fixedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detectar si estamos en una tabla
    if (line.includes('|') && !line.includes('```')) {
      inTable = true
      
      // Si la línea tiene | pero no empieza con |, agregarlo
      if (!line.trim().startsWith('|') && line.trim().includes('|')) {
        const trimmedLine = line.trim()
        if (trimmedLine.endsWith('|')) {
          fixedLines.push('|' + trimmedLine)
        } else {
          const fixedLine = '|' + trimmedLine + (trimmedLine.includes('|') ? '' : '|')
          fixedLines.push(fixedLine)
        }
      } else {
        fixedLines.push(line)
      }
    } else if (inTable && !line.trim() && i + 1 < lines.length && lines[i + 1] && !lines[i + 1].includes('|')) {
      inTable = false
      fixedLines.push(line)
    } else {
      fixedLines.push(line)
    }
  }
  
  const fixedText = fixedLines.join('\n')
  
  // Convertir markdown a HTML básico
  let html = fixedText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*\s+(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/^###\s+(.*$)/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*$)/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*$)/gm, '<h1>$1</h1>')
    .replace(/\*([^*]+?)\*/g, (match, content) => {
      return content.startsWith(' ') || content.endsWith(' ') ? match : `<em>${content}</em>`
    })
  
  // Procesar tablas - convertir | a HTML table
  // ... código de conversión de tablas ...
  
  return html.replace(/\n/g, '<br/>')
}
```

### Ejemplo Proporcionado

```typescript
// Ejemplo proporcionado
const normalizeMarkdown = (content: string): string => {
  if (!content) return content
  
  // Normalizar saltos de línea
  let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // Detectar tablas markdown y asegurar formato correcto
  const lines = normalized.split('\n')
  const normalizedLines: string[] = []
  let inTable = false
  let pendingSeparator = false
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const trimmed = line.trim()
    
    const hasPipes = trimmed.includes('|')
    const isSeparator = /^\|[\s\-:]+\|/.test(trimmed) || 
                         /^[\s\-:]+\|/.test(trimmed) || 
                         /^\|[\s\-:]+$/.test(trimmed) ||
                         /^[\s\-:]+$/.test(trimmed)
    
    if (hasPipes && !isSeparator) {
      if (!inTable) {
        inTable = true
      }
      
      // Asegurar que empieza y termina con pipe
      let normalizedLine = trimmed
      normalizedLine = normalizedLine.replace(/^\|+/, '|')
      normalizedLine = normalizedLine.replace(/\|+$/, '|')
      
      if (!normalizedLine.startsWith('|')) {
        normalizedLine = '| ' + normalizedLine
      }
      if (!normalizedLine.endsWith('|')) {
        normalizedLine = normalizedLine + ' |'
      }
      
      normalizedLines.push(normalizedLine)
    } else if (isSeparator && inTable) {
      normalizedLines.push(trimmed)
    } else if (trimmed.length === 0) {
      normalizedLines.push('')
    } else {
      if (inTable) {
        inTable = false
      }
      normalizedLines.push(line)
    }
  }
  
  return normalizedLines.join('\n')
}
```

**Diferencias:**

| Aspecto | Proyecto Actual | Ejemplo Proporcionado |
|---------|----------------|----------------------|
| **Propósito** | Conversión a HTML | Corrección de formato Markdown |
| **Detección de separadores** | No implementada | Detecta líneas separadoras (`| --- |`) |
| **Normalización de pipes** | Agrega pipes faltantes | Normaliza pipes duplicados |
| **Salida** | HTML completo | Markdown corregido |

**Ventajas del Proyecto Actual:**
- ✅ Conversión directa a HTML (más rápido)
- ✅ Soporte completo de elementos Markdown

**Ventajas del Ejemplo:**
- ✅ Mejor detección de tablas
- ✅ Normalización más robusta
- ✅ Compatible con ReactMarkdown

---

## Recomendaciones de Mejora

### 1. Implementar Indicador Visual de Escritura

```typescript
{index === messages.length - 1 && isLoading && (
  <span className="inline-block w-2 h-4 bg-teal-400 ml-1 animate-pulse" />
)}
```

### 2. Agregar Soporte para HTML Procesado

```typescript
{message.content.includes('<table') || 
 message.content.includes('<div class="overflow-x-auto') ? (
  <div 
    dangerouslySetInnerHTML={{ __html: message.content }}
    className="max-w-none"
  />
) : (
  <ReactMarkdown>{normalizeMarkdown(message.content)}</ReactMarkdown>
)}
```

### 3. Mejorar Normalización de Tablas

Usar la lógica del ejemplo para detectar y corregir separadores de tablas.

### 4. Agregar Avatares

Mejorar UX con avatares para usuario y asistente.

### 5. Implementar Soporte `processed`

Si el backend envía contenido HTML procesado, detectarlo y renderizarlo directamente.

---

## Conclusión

Ambas implementaciones son funcionales, pero tienen enfoques diferentes:

- **Proyecto Actual**: Más completo en backend (métricas, persistencia), soporta múltiples formatos
- **Ejemplo Proporcionado**: Mejor UX (indicadores visuales, avatares), mejor normalización de Markdown

**Recomendación**: Combinar lo mejor de ambos:
- Mantener la robustez del backend actual
- Adoptar mejoras de UX del ejemplo
- Implementar soporte para contenido HTML procesado

