# Análisis Detallado del Flujo de Streaming vLLM → Backend → Frontend

## 📊 Resumen Ejecutivo

El problema reportado ("hola ¡ola¿ué do rte¡HHHola") indica que **se está concatenando texto acumulado en lugar de deltas**. Este análisis detalla cómo funciona el flujo completo y dónde está el problema.

---

## 🔄 Flujo Completo de Streaming

### 1. **vLLM (Servidor de Inferencia)**

**Formato de respuesta:**
```json
data: {"id": "...", "object": "chat.completion.chunk", "choices": [{"index": 0, "delta": {"content": "It"}, "finish_reason": null}]}
data: {"id": "...", "choices": [{"index": 0, "delta": {"content": "Thursday"}, "finish_reason": null}]}
```

**✅ vLLM devuelve DELTAS (solo nuevos tokens)**, no texto acumulado.

**Ubicación:** `http://localhost:8000/v1/chat/completions` con `"stream": true`

---

### 2. **LangChain ChatOpenAI (langchain_system.py)**

**Código relevante:**
```python:49:96:chatbot/langchain_system.py
async def stream(self, messages: List[BaseMessage], **kwargs) -> AsyncGenerator[str, None]:
    """Streaming desde vLLM con Ray Serve - Agrega espacios automáticamente entre tokens"""
    try:
        last_chunk = ""  # Último chunk para detectar si necesita espacio
        accumulated = ""  # Texto acumulado para mejor detección
        
        async for chunk in self.ollama_llm.astream(messages, **kwargs):
            chunk_content = chunk.content if hasattr(chunk, 'content') else str(chunk)
            
            if chunk_content:
                # ... lógica de espacios ...
                yield chunk_content
                accumulated += chunk_content
                last_chunk = chunk_content
```

**⚠️ PROBLEMA POTENCIAL:** 
- LangChain's `ChatOpenAI.astream()` **debería** devolver deltas (solo nuevos tokens)
- Sin embargo, dependiendo de la configuración de vLLM y cómo LangChain procesa la respuesta, podría estar devolviendo texto acumulado
- El código actual **asume que son deltas** y los concatena directamente

**Verificación necesaria:** Comprobar si `chunk.content` contiene solo el nuevo token o el texto completo acumulado.

---

### 3. **Backend FastAPI (main.py)**

**Código relevante:**
```python:448:484:chatbot/main.py
async def process_text_stream(message: str, session_id: str):
    """Procesar texto con streaming"""
    try:
        full_response = ""
        start_ts = int(time.time() * 1000)
        async for chunk in medical_chain.stream_chat(message, session_id):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
```

**✅ El backend envía cada chunk tal cual lo recibe de LangChain**

**Formato SSE enviado:**
```
data: {"content": "It", "done": false}

data: {"content": "Thursday", "done": false}
```

---

### 4. **Frontend React (page.tsx)**

**Código relevante:**
```typescript:266:327:UI_IMSS/app/chat/page.tsx
// Leer stream - usando el mismo patrón que funciona en Quetzalia
const reader = response.body?.getReader()
const decoder = new TextDecoder()
let assistantMessage = ""
let buffer = ""

// Agregar mensaje vacío del asistente
setMessages((prev) => [...prev, { role: "assistant", text: "" }])

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
            assistantMessage += data.content  // ⚠️ AQUÍ ESTÁ EL PROBLEMA
            setMessages((prev) => {
              const newMessages = [...prev]
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                text: assistantMessage,
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

**✅ El frontend concatena correctamente si recibe deltas**

**❌ PROBLEMA:** Si el backend envía texto acumulado, el frontend lo concatena y obtiene duplicación:
- Chunk 1: "Hola" → `assistantMessage = "Hola"` ✅
- Chunk 2: "Hola qué" → `assistantMessage = "Hola" + "Hola qué" = "HolaHola qué"` ❌
- Chunk 3: "Hola qué duele" → `assistantMessage = "HolaHola qué" + "Hola qué duele" = "HolaHola quéHola qué duele"` ❌

---

## 🔍 Diagnóstico del Problema

### Hipótesis 1: LangChain está devolviendo texto acumulado

**Evidencia:**
- El problema reportado muestra duplicación de texto
- El código de `FallbackLLM.stream()` asume que son deltas pero no lo verifica

**Solución:** Calcular deltas en `FallbackLLM.stream()` antes de enviar al backend.

### Hipótesis 2: vLLM está devolviendo texto acumulado (poco probable)

**Evidencia:**
- El curl muestra que vLLM devuelve deltas correctamente
- Pero podría haber una configuración incorrecta

**Solución:** Verificar configuración de vLLM.

### Hipótesis 3: Problema en el procesamiento de chunks

**Evidencia:**
- El código de `stream_chat()` en `langchain_system.py` acumula chunks y luego los envía
- Hay lógica de corrección de palabras fragmentadas que podría estar causando problemas

**Solución:** Asegurar que solo se envíen deltas, no texto acumulado.

---

## ✅ Solución Propuesta

### Opción 1: Calcular Deltas en el Backend (Recomendada)

Modificar `FallbackLLM.stream()` para calcular deltas explícitamente:

```python
async def stream(self, messages: List[BaseMessage], **kwargs) -> AsyncGenerator[str, None]:
    """Streaming desde vLLM - Calcula deltas explícitamente"""
    try:
        previous_text = ""  # Texto acumulado anterior
        
        async for chunk in self.ollama_llm.astream(messages, **kwargs):
            chunk_content = chunk.content if hasattr(chunk, 'content') else str(chunk)
            
            if chunk_content:
                # Calcular delta: solo los nuevos caracteres
                current_text = chunk_content
                
                # Si el chunk es más largo que el anterior, es texto acumulado
                # Si es más corto o igual, es un delta
                if len(current_text) > len(previous_text) and current_text.startswith(previous_text):
                    # Es texto acumulado, calcular delta
                    delta = current_text[len(previous_text):]
                    previous_text = current_text
                else:
                    # Es un delta directo
                    delta = current_text
                    previous_text += delta
                
                if delta:
                    yield delta
```

### Opción 2: Verificar en LangChain si son deltas o acumulados

Modificar `stream_chat()` para verificar y calcular deltas:

```python
async def stream_chat(self, user_message: str, session_id: str = "") -> AsyncGenerator[str, None]:
    # ... código existente ...
    
    previous_text = ""
    async for chunk in self.llm.stream(messages_list):
        if chunk:
            current_text = chunk
            
            # Verificar si es acumulado o delta
            if len(current_text) > len(previous_text) and current_text.startswith(previous_text):
                # Es acumulado, calcular delta
                delta = current_text[len(previous_text):]
                previous_text = current_text
            else:
                # Es delta directo
                delta = current_text
                previous_text += current_text
            
            if delta:
                yield delta
```

### Opción 3: Usar directamente la API de vLLM (Más simple)

En lugar de usar LangChain, llamar directamente a vLLM y procesar los deltas:

```python
async def stream_chat_direct(self, user_message: str, session_id: str = "") -> AsyncGenerator[str, None]:
    """Streaming directo desde vLLM sin LangChain"""
    messages_data = [
        {"role": "system", "content": self.system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{self.llm.vllm_endpoint}chat/completions",
            json={
                "model": "google/medgemma-27b-it",
                "messages": messages_data,
                "temperature": 0.7,
                "max_tokens": 100,
                "stream": True
            }
        ) as response:
            if response.status_code == 200:
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line.strip() != "data: [DONE]":
                        try:
                            data = json.loads(line[6:])
                            if "choices" in data and len(data["choices"]) > 0:
                                delta_content = data["choices"][0].get("delta", {}).get("content", "")
                                if delta_content:
                                    yield delta_content
                        except:
                            pass
```

---

## 🧪 Cómo Verificar el Problema

1. **Agregar logs en `FallbackLLM.stream()`:**
```python
logger.info(f"📦 Chunk recibido: '{chunk_content}' (longitud: {len(chunk_content)})")
logger.info(f"📦 Texto acumulado hasta ahora: '{accumulated}'")
```

2. **Verificar si los chunks son deltas o acumulados:**
   - Si cada chunk es más largo que el anterior y contiene el anterior, son acumulados
   - Si cada chunk es independiente y corto, son deltas

3. **Probar directamente con vLLM:**
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/medgemma-27b",
    "messages": [{"role": "user", "content": "Hola"}],
    "stream": true
}'
```

---

## 📝 Recomendación Final

**Implementar Opción 1** (calcular deltas en `FallbackLLM.stream()`) porque:
1. Es la solución más robusta
2. Funciona independientemente de cómo LangChain procese los chunks
3. Garantiza que siempre se envíen deltas al frontend
4. No requiere cambios en el frontend

**Implementar Opción 3** (llamada directa a vLLM) como alternativa si LangChain sigue causando problemas, ya que:
1. Elimina la dependencia de LangChain para streaming
2. Control total sobre el procesamiento de deltas
3. Más eficiente (menos capas de abstracción)





