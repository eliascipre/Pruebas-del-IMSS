# 📥 Instrucciones para Descargar el Repositorio vía SSH

Como la máquina remota no tiene acceso a internet, necesitas descargar la carpeta completa mediante SSH desde tu máquina local.

## 🎯 Opción 1: Usando rsync (Recomendado)

**Ventajas:**
- ✅ Más eficiente (solo transfiere cambios si se interrumpe)
- ✅ Muestra progreso en tiempo real
- ✅ Puede reanudarse si se interrumpe
- ✅ Excluye automáticamente archivos innecesarios

**Desde tu máquina local, ejecuta:**

```bash
# 1. Descargar el script (si no lo tienes)
scp usuario@servidor:/home/administrador/Pruebas-del-IMSS/download-repo.sh ./

# 2. Dar permisos de ejecución
chmod +x download-repo.sh

# 3. Ejecutar el script
./download-repo.sh usuario@IP_SERVIDOR ~/Downloads/Pruebas-del-IMSS
```

**Ejemplo concreto:**
```bash
./download-repo.sh administrador@192.168.1.100 ~/Downloads/Pruebas-del-IMSS
```

---

## 🎯 Opción 2: Usando tar.gz (Alternativa)

**Ventajas:**
- ✅ Crea un archivo comprimido único
- ✅ Más fácil de compartir o mover
- ✅ Puede verificar integridad del archivo

**Desde tu máquina local, ejecuta:**

```bash
# 1. Descargar el script (si no lo tienes)
scp usuario@servidor:/home/administrador/Pruebas-del-IMSS/download-repo-tar.sh ./

# 2. Dar permisos de ejecución
chmod +x download-repo-tar.sh

# 3. Ejecutar el script
./download-repo-tar.sh usuario@IP_SERVIDOR ~/Downloads
```

**Luego extraer:**
```bash
cd ~/Downloads
tar -xzf Pruebas-del-IMSS-*.tar.gz
cd Pruebas-del-IMSS
```

---

## 🎯 Opción 3: Comando Manual Directo

Si prefieres hacerlo manualmente sin scripts:

### Con rsync:
```bash
rsync -avz --progress \
    --exclude='.git/' \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='node_modules/' \
    --exclude='*.db' \
    --exclude='logs/' \
    --exclude='*.log' \
    usuario@IP_SERVIDOR:/home/administrador/Pruebas-del-IMSS/ \
    ~/Downloads/Pruebas-del-IMSS/
```

### Con tar.gz manual:
```bash
# 1. Crear tar.gz en servidor
ssh usuario@IP_SERVIDOR "cd /home/administrador && tar -czf /tmp/repo.tar.gz --exclude='Pruebas-del-IMSS/venv' --exclude='Pruebas-del-IMSS/.git' --exclude='Pruebas-del-IMSS/node_modules' Pruebas-del-IMSS/"

# 2. Descargar
scp usuario@IP_SERVIDOR:/tmp/repo.tar.gz ~/Downloads/

# 3. Limpiar en servidor
ssh usuario@IP_SERVIDOR "rm /tmp/repo.tar.gz"

# 4. Extraer localmente
cd ~/Downloads && tar -xzf repo.tar.gz
```

---

## 📋 Información Necesaria

Antes de ejecutar, necesitas saber:

1. **Usuario SSH**: El usuario para conectarte (ej: `administrador`, `usuario`)
2. **IP o Hostname del servidor**: La dirección del servidor remoto
3. **Ruta destino local**: Dónde quieres guardar el repositorio

**Ejemplo de información:**
- Usuario: `administrador`
- IP: `192.168.1.100`
- Destino: `~/Downloads/Pruebas-del-IMSS`

**Comando resultante:**
```bash
./download-repo.sh administrador@192.168.1.100 ~/Downloads/Pruebas-del-IMSS
```

---

## ⚠️ Archivos Excluidos

Los scripts excluyen automáticamente:
- `.git/` (historial de git - puedes incluirlo si lo necesitas)
- `venv/`, `node_modules/` (dependencias - se reinstalan después)
- `*.db`, `*.sqlite*` (bases de datos)
- `logs/`, `*.log` (archivos de log)
- `__pycache__/`, `*.pyc` (bytecode Python)
- `.cache/`, `cache/` (caché)
- `*.bin`, `*.safetensors` (modelos ML grandes)
- `.DS_Store`, `.vscode/`, `.idea/` (archivos del sistema/IDE)

**Si necesitas incluir `.git/`**, modifica el script y elimina la línea `--exclude='.git/'`

---

## ✅ Verificación Post-Descarga

Después de descargar, verifica que todo esté correcto:

```bash
cd ~/Downloads/Pruebas-del-IMSS

# Ver estructura principal
ls -la

# Verificar archivos importantes
ls -la README.md requirements.txt
ls -la chatbot/main.py
ls -la UI_IMSS/package.json
```

---

## 🔧 Próximos Pasos Después de Descargar

1. **Instalar dependencias Python:**
   ```bash
   cd ~/Downloads/Pruebas-del-IMSS
   python3 -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Instalar dependencias Node.js:**
   ```bash
   cd UI_IMSS
   npm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp env.example env.local
   # Editar env.local con tus configuraciones
   ```

4. **Iniciar servicios:**
   ```bash
   ./start-all.sh
   ```

---

## 🆘 Troubleshooting

### Error: "Permission denied"
```bash
# Verificar permisos SSH
ssh usuario@IP_SERVIDOR "ls -la /home/administrador/Pruebas-del-IMSS"

# Si es necesario, usar sudo (ajustar según tu caso)
```

### Error: "rsync: command not found"
```bash
# Instalar rsync
# Ubuntu/Debian:
sudo apt-get install rsync

# macOS:
brew install rsync

# O usar la opción 2 (tar.gz) que no requiere rsync
```

### Error: "Connection refused"
- Verificar que SSH está habilitado en el servidor
- Verificar que el puerto SSH (22) está abierto
- Verificar la IP/hostname del servidor

### La descarga es muy lenta
- Verificar velocidad de red
- Considerar usar compresión: `rsync -avz` (ya incluido)
- Verificar que no hay otros procesos usando ancho de banda

---

## 📞 Notas Adicionales

- **Tamaño estimado**: El repositorio sin dependencias pesa aproximadamente 50-100 MB
- **Tiempo estimado**: Depende de la velocidad de red (1-10 minutos típicamente)
- **Espacio necesario**: Asegúrate de tener al menos 500 MB libres en tu máquina local

