# 📥 Comandos Listos para Descargar el Repositorio

## 🔐 Credenciales Configuradas
- **Usuario**: `administrador`
- **IP**: `10.105.20.1`
- **Ruta remota**: `/home/administrador/Pruebas-del-IMSS`

---

## 🚀 Opción 1: Descargar Scripts y Ejecutarlos (Recomendado)

### Paso 1: Descargar los scripts desde el servidor

Desde tu máquina local, ejecuta:

```bash
# Descargar script rsync
scp administrador@10.105.20.1:/home/administrador/Pruebas-del-IMSS/download-local.sh ./

# Descargar script tar.gz (alternativa)
scp administrador@10.105.20.1:/home/administrador/Pruebas-del-IMSS/download-local-tar.sh ./

# Dar permisos de ejecución
chmod +x download-local.sh download-local-tar.sh
```

**Nota**: Te pedirá la contraseña: `Passw0rd`

### Paso 2: Ejecutar el script

**Opción A - Con rsync (más eficiente):**
```bash
./download-local.sh ~/Downloads/Pruebas-del-IMSS
```

**Opción B - Con tar.gz (archivo único):**
```bash
./download-local-tar.sh ~/Downloads
# Luego extraer:
cd ~/Downloads && tar -xzf Pruebas-del-IMSS-*.tar.gz
```

---

## 🚀 Opción 2: Comandos Directos (Sin Scripts)

### Con rsync (Recomendado):

```bash
rsync -avz --progress \
    --exclude='.git/' \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='node_modules/' \
    --exclude='.next/' \
    --exclude='*.db' \
    --exclude='*.sqlite*' \
    --exclude='logs/' \
    --exclude='*.log' \
    --exclude='.cache/' \
    --exclude='cache/' \
    --exclude='*.bin' \
    --exclude='*.safetensors' \
    --exclude='*.pkl' \
    --exclude='.DS_Store' \
    --exclude='.vscode/' \
    --exclude='.idea/' \
    administrador@10.105.20.1:/home/administrador/Pruebas-del-IMSS/ \
    ~/Downloads/Pruebas-del-IMSS/
```

### Con tar.gz:

```bash
# 1. Crear tar.gz en servidor
ssh administrador@10.105.20.1 "cd /home/administrador && tar -czf /tmp/repo.tar.gz --exclude='Pruebas-del-IMSS/venv' --exclude='Pruebas-del-IMSS/.git' --exclude='Pruebas-del-IMSS/node_modules' Pruebas-del-IMSS/"

# 2. Descargar
scp administrador@10.105.20.1:/tmp/repo.tar.gz ~/Downloads/

# 3. Limpiar en servidor
ssh administrador@10.105.20.1 "rm /tmp/repo.tar.gz"

# 4. Extraer localmente
cd ~/Downloads && tar -xzf repo.tar.gz
```

---

## 🔑 Autenticación SSH

Si quieres evitar escribir la contraseña cada vez, puedes configurar SSH keys:

```bash
# 1. Generar clave SSH (si no tienes una)
ssh-keygen -t rsa -b 4096

# 2. Copiar clave al servidor
ssh-copy-id administrador@10.105.20.1

# Ahora podrás conectarte sin contraseña
```

---

## 📋 Verificación Post-Descarga

Después de descargar, verifica:

```bash
cd ~/Downloads/Pruebas-del-IMSS

# Ver estructura
ls -la

# Verificar archivos importantes
ls -la README.md requirements.txt
ls -la chatbot/main.py
ls -la UI_IMSS/package.json
```

---

## ⚙️ Configuración Post-Descarga

```bash
cd ~/Downloads/Pruebas-del-IMSS

# 1. Configurar variables de entorno
cp env.example env.local
# Editar env.local según necesites

# 2. Instalar dependencias Python
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Instalar dependencias Node.js
cd UI_IMSS
npm install
cd ..
```

---

## 🆘 Troubleshooting

### Error: "Permission denied"
- Verifica que la contraseña es correcta: `Passw0rd`
- Verifica que el usuario `administrador` tiene acceso a la carpeta

### Error: "Connection refused" o "Connection timed out"
- Verifica que puedes hacer ping: `ping 10.105.20.1`
- Verifica que el puerto SSH (22) está abierto
- Verifica que estás en la misma red o VPN

### Error: "rsync: command not found"
```bash
# Ubuntu/Debian:
sudo apt-get install rsync

# macOS:
brew install rsync

# Windows: Usa WSL o Git Bash
```

### La descarga es muy lenta
- Verifica velocidad de red
- Considera usar tar.gz si rsync es muy lento
- Verifica que no hay otros procesos usando ancho de banda

---

## 🔒 Seguridad

**⚠️ IMPORTANTE**: 
- No compartas este archivo con las credenciales
- Considera cambiar la contraseña después de configurar SSH keys
- Elimina este archivo después de descargar el repositorio si contiene información sensible

---

## ✅ Checklist

- [ ] Descargar scripts o usar comandos directos
- [ ] Ejecutar descarga (rsync o tar.gz)
- [ ] Verificar que los archivos se descargaron correctamente
- [ ] Configurar variables de entorno (env.local)
- [ ] Instalar dependencias Python
- [ ] Instalar dependencias Node.js
- [ ] Probar que el proyecto funciona localmente

