# Configuración de LM Studio para MedGemma

## Configuración Actual (Verificar)

### 1. LM Studio Server
- **URL**: `http://localhost:1234`
- **API Key**: `lm-studio` (o cualquier valor)
- **Modelo**: MedGemma-4B con soporte de visión

### 2. Configuración del Servidor
1. Abre LM Studio
2. Ve a la pestaña "Desarrollador" (icono de engranaje)
3. Haz clic en "Iniciar Servidor"
4. Verifica que el servidor esté corriendo en `http://localhost:1234`

### 3. Modelo MedGemma
- Descarga el modelo MedGemma-4B desde Hugging Face
- Asegúrate de que tenga soporte de visión (multimodal)
- Carga el modelo en LM Studio

### 4. Configuración de la API
- **Endpoint**: `http://localhost:1234/v1/chat/completions`
- **Headers**:
  - `Authorization: Bearer lm-studio`
  - `Content-Type: application/json`

## Mejoras Implementadas

### 1. Parsing JSON Mejorado
- Función `get_json_from_model_response()` mejorada
- Manejo de errores más robusto
- Limpieza automática de JSON malformado

### 2. Streaming Mejorado
- Timeout aumentado a 120 segundos
- Mejor manejo de errores en streaming
- Logging más detallado

### 3. Compatibilidad con MedGemma
- Manejo de respuestas con caracteres especiales
- Corrección automática de comas extra
- Soporte para diferentes formatos de respuesta

## Verificación

Para verificar que todo funciona:

1. **Backend**: Ejecuta el servidor backend
2. **LM Studio**: Asegúrate de que esté corriendo
3. **Frontend**: Ejecuta el frontend
4. **Prueba**: Intenta cargar un caso y generar preguntas

## Troubleshooting

### Error: "Failed to decode JSON"
- Verifica que LM Studio esté corriendo
- Revisa los logs para ver la respuesta completa
- El sistema ahora tiene mejor manejo de errores

### Error: "Empty explanation from API"
- Verifica que el modelo esté cargado correctamente
- Aumenta el timeout si es necesario
- Revisa la configuración del modelo

### Error: "API call failed"
- Verifica que LM Studio esté en `localhost:1234`
- Revisa que el modelo esté cargado
- Verifica la configuración de la API
