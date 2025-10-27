# 🚀 Cómo Iniciar el Chatbot IMSS

## Backend (FastAPI) - Puerto 5001

### Opción 1: Usando el script
```bash
cd Pruebas-del-IMSS/chatbot
./run.sh
```

### Opción 2: Manual con Uvicorn
```bash
cd Pruebas-del-IMSS/chatbot

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

### Opción 3: Directamente con Python
```bash
cd Pruebas-del-IMSS/chatbot
python main.py
```

El backend estará en: `http://localhost:5001`

## Frontend (Next.js) - Puerto 3000

```bash
cd Pruebas-del-IMSS/UI_IMSS

# Si no has instalado dependencias
pnpm install

# Iniciar servidor
pnpm dev
```

El frontend estará en: `http://localhost:3000`

## LM Studio (Opcional) - Puerto 1234

Si tienes LM Studio instalado:
```bash
# Iniciar LM Studio con el modelo médico
lm-studio --server --model medgemma-4b-it-mlx
```

## Verificar que funciona

1. Backend: `curl http://localhost:5001/health`
2. Frontend: Abrir `http://localhost:3000/chat`
3. LM Studio: `curl http://localhost:1234/v1/models`

## Estructura

```
Backend:  http://localhost:5001  ✅ FastAPI + LangChain + Streaming
Frontend: http://localhost:3000  ✅ Next.js + Upload Imágenes
LM Studio: http://localhost:1234 ✅ Modelo médico (opcional)
```

## Funcionalidades

✅ Chat con streaming en tiempo real  
✅ Análisis de imágenes médicas (radiografías)  
✅ Soporte para texto + imágenes simultáneamente  
✅ Renderizado correcto de tablas markdown  
✅ Memoria conversacional con SQLite  
✅ Entity Memory para entidades médicas  
✅ Logo de QuetzalIA en el chat  
✅ Completamente asíncrono y escalable  

## Troubleshooting

### Error: "Cannot connect to backend"
- Verifica que el backend esté corriendo en puerto 5001
- Revisa los logs del backend

### Error: "ModuleNotFoundError: langchain"
```bash
cd chatbot
pip install -r requirements.txt
```

### Error: Puertos ocupados
- Cambia el puerto en `main.py` (línea 110): `port=5002`
- Actualiza `page.tsx` línea 89: `fetch('http://localhost:5002/api/chat'`

## ¡Listo para usar! 🎉

