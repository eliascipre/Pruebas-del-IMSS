# Chatbot Backend

Este es el backend para el sistema de chatbot con integración de LLM.

## Estructura del Proyecto

```
chatbot/
├── app.py                 # Servidor Flask principal
├── routes.py              # Endpoints de la API
├── llm_client.py         # Cliente para LLM
├── config.py             # Configuración
├── requirements.txt      # Dependencias
└── README.md            # Este archivo
```

## Instalación

```bash
cd chatbot
pip install -r requirements.txt
```

## Configuración

Crea un archivo `.env` con las siguientes variables:

```
GEMINI_API_KEY="tu-api-key"
OPENAI_API_KEY="tu-openai-api-key"  # Opcional
```

## Ejecución

```bash
python app.py
```

El servidor estará disponible en `http://localhost:5000`

## Endpoints

### POST /api/chat
Enviar mensaje al chatbot

**Request:**
```json
{
  "message": "¿Qué es la imagenología?",
  "conversation_id": "uuid-optional"
}
```

**Response:**
```json
{
  "response": "La imagenología es...",
  "conversation_id": "uuid"
}
```

### GET /api/history
Obtener historial de conversaciones

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Conversation 1",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

## Tecnologías

- Flask
- Gemini API / OpenAI API
- SQLite para historial
- WebSocket para streaming (futuro)

