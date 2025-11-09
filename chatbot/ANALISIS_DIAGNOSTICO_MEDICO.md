# Análisis del Sistema de Diagnóstico Médico - Chatbot IMSS

## Objetivo del Sistema

El chatbot IMSS es un **agente de IA médica** que potencia MedGemma 27B para hacer análisis médico que se envía al doctor. El objetivo es que el agente **AYUDE AL MÉDICO** describiendo al paciente, no que reemplace al médico o actúe directamente con el paciente.

## Problema Actual

### Comportamiento Actual
Cuando se le da cualquier síntoma, el sistema responde **directamente con posibles diagnósticos** sin solicitar más información, incluso cuando no se ha dado suficiente información. No profundiza con preguntas para saber la posible enfermedad o dar un diagnóstico más detallado.

### Ejemplo del Problema
**Usuario:** "Tengo dolor de cabeza"

**Respuesta actual (INCORRECTA):**
> "El dolor de cabeza puede tener múltiples causas: migraña, tensión, sinusitis, etc. Si persiste, consulta al IMSS."

**Problema:** El sistema da diagnósticos directos sin hacer preguntas para profundizar.

### Comportamiento Esperado
El sistema debe:
1. **Hacer preguntas** para profundizar antes de dar diagnósticos
2. **Describir al paciente** para el médico, no diagnosticar directamente al paciente
3. **Solicitar más información** cuando no hay suficiente contexto
4. **Actuar como asistente del médico**, no como médico directo

## Estructura Actual del Sistema

### 1. System Prompt (`prompts/medico.md`)

**Ubicación:** `/home/administrador/Pruebas-del-IMSS/chatbot/prompts/medico.md`

**Contenido actual:**
```markdown
Eres un asistente médico especializado creado para el IMSS que proporciona información médica general, 
interpretación de síntomas y guías de salud preventiva. **IMPORTANTE**: Siempre recomiendas consultar con 
profesionales de la salud del IMSS para diagnósticos específicos y tratamientos médicos.
```

**Problema:**
- No especifica que debe hacer preguntas antes de diagnosticar
- No indica que debe actuar como asistente del médico
- No menciona que debe describir al paciente para el médico

### 2. Few-Shot Examples (`prompts/few_shots.json`)

**Ubicación:** `/home/administrador/Pruebas-del-IMSS/chatbot/prompts/few_shots.json`

**Contenido actual:**
```json
[
  {
    "user": "Tengo dolor de cabeza y fiebre leve, ¿qué podría ser?",
    "assistant": "Podría tratarse de un cuadro viral leve. Mantén hidratación, reposo y, si no hay alergias, puedes usar paracetamol según indicación de etiqueta. Si aparecen signos de alarma o persiste, acude al IMSS para valoración."
  }
]
```

**Problema:**
- Los ejemplos muestran respuestas directas con diagnósticos
- No muestran el comportamiento de hacer preguntas
- No muestran cómo describir al paciente para el médico

### 3. Flujo de Procesamiento (`langchain_system.py`)

**Ubicación:** `/home/administrador/Pruebas-del-IMSS/chatbot/langchain_system.py`

**Función principal:** `process_chat()`

**Flujo actual:**
1. Carga el system prompt desde `medico.md`
2. Carga los few-shot examples desde `few_shots.json`
3. Construye mensajes con historial y contexto de entidades
4. Envía a MedGemma 27B vía vLLM
5. Retorna respuesta directa

**Problema:**
- No hay lógica para detectar información insuficiente
- No hay lógica para hacer preguntas antes de diagnosticar
- No hay diferenciación entre "responder al paciente" vs "describir al paciente para el médico"

### 4. Endpoint Principal (`main.py`)

**Ubicación:** `/home/administrador/Pruebas-del-IMSS/chatbot/main.py`

**Endpoint:** `/api/chat`

**Flujo actual:**
1. Recibe mensaje del usuario
2. Valida y sanitiza entrada
3. Llama a `medical_chain.process_chat()`
4. Retorna respuesta directa

**Problema:**
- No hay validación de información suficiente
- No hay lógica para solicitar más información

## Cambios Necesarios

### 1. Modificar System Prompt (`prompts/medico.md`)

**Cambios requeridos:**

1. **Clarificar el rol:** El agente es un **asistente del médico**, no un médico directo
2. **Enfoque en descripción:** Debe **describir al paciente** para el médico, no diagnosticar directamente
3. **Hacer preguntas:** Debe **hacer preguntas** para profundizar antes de dar diagnósticos
4. **Detectar información insuficiente:** Debe detectar cuando no hay suficiente información y solicitar más datos

**Nuevo system prompt propuesto:**

```markdown
# Agente Médico IMSS - Asistente para Médicos

## Tu Rol
Eres un **agente de IA médica** que ayuda a los médicos del IMSS. Tu función es:
1. **Recopilar información** del paciente mediante preguntas
2. **Describir al paciente** para el médico, no diagnosticar directamente
3. **Hacer preguntas** para profundizar cuando la información es insuficiente
4. **Sintetizar información** para que el médico pueda tomar decisiones informadas

## Comportamiento Esperado

### Cuando recibes síntomas iniciales:
- **NO** des diagnósticos directos
- **SÍ** haz preguntas para profundizar:
  - ¿Cuándo comenzó el síntoma?
  - ¿Qué tan intenso es?
  - ¿Hay otros síntomas asociados?
  - ¿Qué factores lo empeoran o mejoran?
  - ¿Historial médico relevante?
  - ¿Medicamentos actuales?

### Cuando tienes suficiente información:
- **Describe al paciente** de forma estructurada para el médico
- **Sugiere posibles diagnósticos diferenciales** (no diagnósticos definitivos)
- **Indica qué información adicional** sería útil para el médico

### Formato de respuesta para el médico:
```
## Descripción del Paciente

**Síntomas principales:**
- [Lista de síntomas con detalles]

**Historial relevante:**
- [Información del historial]

**Medicamentos actuales:**
- [Lista de medicamentos]

**Factores de riesgo:**
- [Factores identificados]

**Posibles diagnósticos diferenciales:**
- [Lista de posibles diagnósticos con nivel de probabilidad]

**Recomendaciones para el médico:**
- [Qué estudios o evaluaciones adicionales serían útiles]
```

## Instrucciones Específicas

1. **Siempre hacer preguntas primero** antes de dar diagnósticos
2. **Nunca diagnosticar directamente** al paciente
3. **Describir al paciente** para el médico de forma estructurada
4. **Solicitar más información** cuando sea insuficiente
5. **Usar lenguaje médico profesional** pero comprensible
6. **Priorizar información del IMSS** y protocolos del instituto

## Limitaciones

- **NO** reemplaza la consulta médica profesional
- **NO** da diagnósticos definitivos
- **NO** prescribe medicamentos directamente
- **SÍ** ayuda al médico recopilando y organizando información
```

### 2. Actualizar Few-Shot Examples (`prompts/few_shots.json`)

**Nuevos ejemplos que muestren el comportamiento correcto:**

```json
[
  {
    "user": "Tengo dolor de cabeza",
    "assistant": "Entiendo que tienes dolor de cabeza. Para poder ayudarte mejor y proporcionar información útil al médico, necesito hacerte algunas preguntas:\n\n1. ¿Cuándo comenzó el dolor de cabeza?\n2. ¿Qué tan intenso es el dolor? (escala del 1 al 10)\n3. ¿Dónde se localiza el dolor? (frente, sienes, parte posterior, etc.)\n4. ¿Hay otros síntomas asociados? (náuseas, vómitos, sensibilidad a la luz, etc.)\n5. ¿Has tenido dolores de cabeza similares antes?\n6. ¿Estás tomando algún medicamento actualmente?\n\nPor favor, comparte esta información para que pueda preparar una descripción completa para el médico."
  },
  {
    "user": "Tengo dolor de cabeza desde hace 3 días, es muy intenso (8/10), está en la frente y sienes, tengo náuseas y sensibilidad a la luz. No he tenido dolores similares antes. No tomo medicamentos.",
    "assistant": "## Descripción del Paciente\n\n**Síntomas principales:**\n- Dolor de cabeza de inicio reciente (3 días)\n- Intensidad: 8/10 (muy intenso)\n- Localización: frente y sienes\n- Síntomas asociados: náuseas, fotofobia (sensibilidad a la luz)\n- Primera vez que presenta este tipo de dolor\n\n**Historial relevante:**\n- Sin antecedentes de cefaleas similares\n\n**Medicamentos actuales:**\n- Ninguno\n\n**Posibles diagnósticos diferenciales:**\n- Migraña (probabilidad media-alta)\n- Cefalea tensional severa (probabilidad media)\n- Cefalea secundaria (requiere descartar causas graves)\n\n**Recomendaciones para el médico:**\n- Evaluación neurológica completa\n- Considerar estudios de imagen si hay signos de alarma\n- Evaluar necesidad de tratamiento sintomático\n- Considerar derivación a neurología si persiste\n\n**Nota:** Esta información es preliminar y debe ser evaluada por el médico tratante del IMSS."
  }
]
```

### 3. Implementar Lógica de Detección de Información Insuficiente

**Nueva función en `langchain_system.py`:**

```python
def _has_sufficient_information(self, user_message: str, conversation_history: List[BaseMessage]) -> tuple[bool, List[str]]:
    """
    Detectar si hay suficiente información para hacer una descripción del paciente.
    
    Retorna:
        - bool: True si hay suficiente información, False si no
        - List[str]: Lista de preguntas que faltan hacer
    """
    # Palabras clave que indican información suficiente
    sufficient_keywords = [
        "desde hace", "hace", "días", "semanas", "meses",
        "intensidad", "intenso", "leve", "moderado", "severo",
        "localización", "localiza", "frente", "sien", "parte posterior",
        "síntomas", "asociados", "náuseas", "vómitos", "fiebre",
        "medicamentos", "tomo", "estoy tomando",
        "historial", "antecedentes", "he tenido"
    ]
    
    # Contar cuántas palabras clave están presentes
    message_lower = user_message.lower()
    found_keywords = [kw for kw in sufficient_keywords if kw in message_lower]
    
    # Si hay menos de 3 palabras clave, probablemente falta información
    if len(found_keywords) < 3:
        # Generar preguntas relevantes basadas en los síntomas mencionados
        questions = self._generate_relevant_questions(user_message)
        return False, questions
    
    return True, []

def _generate_relevant_questions(self, user_message: str) -> List[str]:
    """
    Generar preguntas relevantes basadas en los síntomas mencionados.
    """
    message_lower = user_message.lower()
    questions = []
    
    # Detectar síntomas comunes
    if "dolor" in message_lower:
        questions.append("¿Cuándo comenzó el dolor?")
        questions.append("¿Qué tan intenso es el dolor? (escala del 1 al 10)")
        questions.append("¿Dónde se localiza el dolor?")
    
    if "fiebre" in message_lower or "temperatura" in message_lower:
        questions.append("¿Cuál es la temperatura exacta?")
        questions.append("¿Cuánto tiempo lleva con fiebre?")
    
    if "tos" in message_lower:
        questions.append("¿La tos es seca o con flemas?")
        questions.append("¿Cuánto tiempo lleva con tos?")
    
    # Preguntas generales que siempre son útiles
    if not any("medicamento" in message_lower or "tomo" in message_lower):
        questions.append("¿Estás tomando algún medicamento actualmente?")
    
    if not any("historial" in message_lower or "antecedente" in message_lower):
        questions.append("¿Tienes algún historial médico relevante?")
    
    return questions[:5]  # Máximo 5 preguntas
```

### 4. Modificar `process_chat()` para Usar la Nueva Lógica

**Cambios en `langchain_system.py`:**

```python
async def process_chat(self, user_message: str, session_id: str = "", use_entities: bool = True, request_id: Optional[str] = None) -> str:
    """Procesar chat con lógica de preguntas antes de diagnosticar"""
    try:
        # Obtener historial de conversación
        history = self._get_chat_history(session_id)
        
        # Detectar si hay suficiente información
        has_sufficient_info, missing_questions = self._has_sufficient_information(
            user_message, 
            history.messages
        )
        
        # Si no hay suficiente información, hacer preguntas
        if not has_sufficient_info:
            # Construir mensaje para hacer preguntas
            questions_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(missing_questions)])
            response = f"""Para poder ayudarte mejor y proporcionar información útil al médico, necesito hacerte algunas preguntas:\n\n{questions_text}\n\nPor favor, comparte esta información para que pueda preparar una descripción completa para el médico."""
            
            # Guardar en historial
            history.add_user_message(user_message)
            history.add_ai_message(response)
            
            return response
        
        # Si hay suficiente información, generar descripción del paciente para el médico
        # ... (resto del código actual)
```

## Resumen de Cambios

### Archivos a Modificar:

1. **`prompts/medico.md`**
   - Cambiar el system prompt para que actúe como asistente del médico
   - Enfatizar hacer preguntas antes de diagnosticar
   - Cambiar enfoque de "responder al paciente" a "describir al paciente para el médico"

2. **`prompts/few_shots.json`**
   - Actualizar ejemplos para mostrar comportamiento de hacer preguntas
   - Agregar ejemplos de descripción del paciente para el médico

3. **`langchain_system.py`**
   - Agregar función `_has_sufficient_information()` para detectar información insuficiente
   - Agregar función `_generate_relevant_questions()` para generar preguntas relevantes
   - Modificar `process_chat()` para usar la nueva lógica

### Beneficios Esperados:

1. **Mejor recopilación de información:** El sistema hará preguntas antes de dar diagnósticos
2. **Información más completa:** El médico recibirá descripciones estructuradas del paciente
3. **Menos diagnósticos prematuros:** El sistema no dará diagnósticos sin suficiente información
4. **Mejor asistencia al médico:** El sistema actuará como asistente, no como reemplazo

## Próximos Pasos

1. ✅ Análisis completo del sistema actual
2. ⏳ Implementar cambios en `prompts/medico.md`
3. ⏳ Actualizar `prompts/few_shots.json`
4. ⏳ Implementar lógica de detección de información insuficiente
5. ⏳ Modificar `process_chat()` para usar la nueva lógica
6. ⏳ Probar con casos de uso reales
7. ⏳ Ajustar según feedback del médico

