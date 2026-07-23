# Despliegue a SiteGround — MiaTech v5 (PHP)

**Guía paso a paso para llevar el código de LOCAL a SITEGROUND**

---

## 📋 Tabla de contenidos

1. [Antes de empezar](#antes-de-empezar)
2. [Fase 0: Preparación en SiteGround](#fase-0-preparación-en-siteground)
3. [Fase 1: Preparar archivos en LOCAL](#fase-1-preparar-archivos-en-local)
4. [Fase 2: Subir archivos a SiteGround](#fase-2-subir-archivos-a-siteground)
5. [Fase 3: Configuración en SiteGround](#fase-3-configuración-en-siteground)
6. [Fase 4: Migración de base de datos](#fase-4-migración-de-base-de-datos)
7. [Fase 5: Verificación post-despliegue](#fase-5-verificación-post-despliegue)

---

## Antes de empezar

### ✅ Requisitos previos

- [ ] Cuenta activa en SiteGround con acceso a `institutoj20.sg-host.com`
- [ ] Acceso SSH a SiteGround (o panel Site Tools)
- [ ] Credenciales SFTP de SiteGround
- [ ] Clave de API GROQ (plan de pago)
- [ ] Credenciales SMTP (correo institucional)
- [ ] El código LOCAL funciona perfectamente en tu máquina

### ⚠️ Advertencias

- **NO subas `.env` de LOCAL** — tiene secretos locales
- **NO subas `db/miatech.sqlite`** — usaremos MySQL en SiteGround
- **NO modifiques archivos PHP** — son idénticos en ambos lados
- **TODOS los secretos van en `.env` de SiteGround**, nunca en código

---

## Fase 0: Preparación en SiteGround

### Paso 1: Crear base de datos MySQL

1. Acceder a **SiteGround → Site Tools → MySQL**
2. Crear nueva base de datos:
   - Nombre: `miatech` (o el que prefieras)
   - Anotar el nombre exacto
3. Crear nuevo usuario MySQL:
   - Usuario: `miatech_user` (o similar)
   - Contraseña: (generar una fuerte)
   - Anotar usuario y contraseña
4. Asignar usuario a la BD con **todos los permisos**
5. Anotar el **HOST** (típicamente `localhost`)

**Datos a anotar:**
```
HOST:       [anotar aquí]
BD:         [anotar aquí]
USUARIO:    [anotar aquí]
CONTRASEÑA: [anotar aquí]
```

### Paso 2: Verificar permisos de carpeta

1. En SiteGround, verificar que puedas escribir en:
   - `/home/customer/www/institutoj20.sg-host.com/` (raíz)
   - `/home/customer/www/institutoj20.sg-host.com/public_html/` (web root)

2. Crear carpetas necesarias (por SSH o Site Tools File Manager):
   ```bash
   mkdir -p /home/customer/www/institutoj20.sg-host.com/storage/tmp
   chmod 755 /home/customer/www/institutoj20.sg-host.com/storage
   chmod 755 /home/customer/www/institutoj20.sg-host.com/storage/tmp
   ```

### Paso 3: Verificar SMTP/Email

1. En SiteGround Site Tools, anotar:
   - Servidor SMTP (típicamente `localhost` o `mail.institutoj20.sg-host.com`)
   - Puerto (típicamente 587 o 465)
   - Usuario: `speakingtest@itsjapon.edu.ec`
   - Contraseña: (obtener de TI)

**Datos a anotar:**
```
SMTP_HOST:     [anotar aquí]
SMTP_PORT:     [anotar aquí]
SMTP_PASSWORD: [anotar aquí]
```

### Paso 4: Confirmar SSL

1. Ir a `https://institutoj20.sg-host.com/`
2. Verificar que aparece 🔒 (cerrado/seguro)
3. Si no, activar SSL en SiteGround (típicamente automático)

---

## Fase 1: Preparar archivos en LOCAL

### Paso 1: Editar `.env.production`

1. Ir a `deploy/siteground/.env.production`
2. Abrir con editor de texto
3. Reemplazar TODOS los valores `XXXX_..._XXXX`:

```bash
# Ejemplo de reemplazo:

# Antes:
DB_HOST=XXXX_OBTENER_DE_SITEGROUND_XXXX

# Después:
DB_HOST=localhost

# Antes:
DB_NAME=XXXX_NOMBRE_BD_SITEGROUND_XXXX

# Después:
DB_NAME=miatech_bd

# ... y así con el resto
```

**Variables a reemplazar obligatoriamente:**
- `DB_HOST` (de SiteGround)
- `DB_NAME` (de SiteGround)
- `DB_USER` (de SiteGround)
- `DB_PASSWORD` (de SiteGround) ⚠️ SECRETO
- `STORAGE_LOCAL_PATH` (ruta SiteGround)
- `GROQ_API_KEY` (de GROQ console) ⚠️ SECRETO
- `SMTP_HOST` (de SiteGround/proveedor)
- `SMTP_PORT` (de SiteGround/proveedor)
- `SMTP_PASSWORD` (de email) ⚠️ SECRETO

### Paso 2: Limpiar archivos locales

En tu PC (LOCAL), ejecutar:

```bash
# NO subir BD local:
rm -rf db/miatech.sqlite

# NO subir contenido viejo de storage:
rm -rf storage/2025B
rm -rf storage/tmp

# Recrear carpetas vacías (para estructura):
mkdir -p storage/2025B/videos
mkdir -p storage/2025B/pdf
mkdir -p storage/tmp
```

### Paso 3: Verificar .gitignore

El archivo `.gitignore` debe tener:

```
.env
.env.local
db/
storage/
```

Verificar que estos archivos/carpetas NO están en git:
```bash
git status
# No deben aparecer:
# .env
# .env.local
# db/
# storage/ (contenido)
```

---

## Fase 2: Subir archivos a SiteGround

### Opción A: Por SFTP (recomendado)

1. Abrir cliente SFTP (Filezilla, WinSCP, etc.)
2. Conectar:
   ```
   Host: institutoj20.sg-host.com
   Usuario: tu_usuario_siteground
   Contraseña: tu_contraseña_siteground
   Puerto: 18765
   ```

3. Subir carpetas (en este orden):

   **Primero: `public_html/`**
   ```
   LOCAL:  MiaTech-v5-PHP/public_html/*
   REMOTO: /public_html/
   (Copiar TODO dentro de public_html, no la carpeta en sí)
   ```

   **Segundo: `tools/`**
   ```
   LOCAL:  MiaTech-v5-PHP/tools/
   REMOTO: /home/customer/www/institutoj20.sg-host.com/tools/
   ```

   **Tercero: `docs/`** (opcional)
   ```
   LOCAL:  MiaTech-v5-PHP/docs/
   REMOTO: /home/customer/www/institutoj20.sg-host.com/docs/
   ```

   **Cuarto: `storage/`** (carpeta vacía)
   ```
   LOCAL:  MiaTech-v5-PHP/storage/
   REMOTO: /home/customer/www/institutoj20.sg-host.com/storage/
   (Crear si no existe)
   ```

4. Crear archivo `.env` en REMOTO:
   ```
   Ubicación: /home/customer/www/institutoj20.sg-host.com/.env
   Contenido: Copiar .env.production EDITADO con secretos reales
   ```

### Opción B: Por Git (si usas)

```bash
# En tu PC:
git clone https://tu_repo.git miatech-siteground
cd miatech-siteground

# En SiteGround (SSH):
cd /home/customer/www/institutoj20.sg-host.com
git pull origin main  # o la rama que uses
```

### Opción C: Por ZIP (simple)

1. En tu PC, crear ZIP:
   - Incluir: `public_html/`, `tools/`, `docs/`, `storage/`
   - NO incluir: `.env`, `db/`, deployment files

2. Subir ZIP a SiteGround (File Manager)
3. Descomprimir en `/home/customer/www/institutoj20.sg-host.com/`

---

## Fase 3: Configuración en SiteGround

### Paso 1: Crear archivo `.env`

Por SFTP o SSH, crear:
```
/home/customer/www/institutoj20.sg-host.com/.env
```

Contenido: El `.env.production` editado (de Fase 1).

Permisos:
```bash
chmod 600 /home/customer/www/institutoj20.sg-host.com/.env
```

### Paso 2: Crear directorios faltantes

Por SSH:
```bash
ssh usuario@institutoj20.sg-host.com -p 18765

cd /home/customer/www/institutoj20.sg-host.com

# Crear estructura de storage:
mkdir -p storage/2025B/videos
mkdir -p storage/2025B/pdf
mkdir -p storage/tmp

# Permisos:
chmod 755 storage/
chmod 755 storage/2025B/
chmod 755 storage/2025B/videos
chmod 755 storage/2025B/pdf
chmod 755 storage/tmp
```

### Paso 3: Verificar configuración

Por SSH, prueba rápida:
```bash
cd /home/customer/www/institutoj20.sg-host.com

# Verificar que .env existe:
ls -la .env
# Debe mostrar: -rw------- (permisos 600)

# Verificar que storage/ es escribible:
touch storage/test.txt && rm storage/test.txt
# Si no hay error, está bien.
```

---

## Fase 4: Migración de base de datos

### Opción A: Por SSH (recomendado)

```bash
ssh usuario@institutoj20.sg-host.com -p 18765

cd /home/customer/www/institutoj20.sg-host.com

# SOLO para PRIMEA VEZ (crear esquema y datos de prueba):
php tools/migrate.php --seed

# En PRODUCCIÓN REAL (solo crear esquema, sin datos de prueba):
php tools/migrate.php
```

### Opción B: Por Cron (si no tienes SSH)

En SiteGround Site Tools → Cron Jobs:

1. Agregar nuevo cron:
   ```
   Comando: /opt/php82/bin/php /home/customer/www/institutoj20.sg-host.com/tools/migrate.php --seed
   Frecuencia: Una sola vez
   Ejecutar: Ahora
   ```

2. Verificar que se ejecutó:
   - Ir a `/api/health` y confirmar que `bd.ok: true`

### Verificar migración

Por SSH o por API:
```bash
# Por SSH:
mysql -h localhost -u miatech_user -p
USE miatech_bd;
SHOW TABLES;
# Debe mostrar 11 tablas (estudiantes, evaluaciones_rendidas, etc.)

# O por API:
curl https://institutoj20.sg-host.com/api/health
# Debe mostrar: "bd": { "ok": true, "driver": "mysql" }
```

---

## Fase 5: Verificación post-despliegue

### ✅ Verificar salud del servidor

```bash
# 1. Health check
curl https://institutoj20.sg-host.com/api/health

# Esperado:
{
  "ok": true,
  "php": "8.x.x",
  "ffmpeg": { "disponible": true },
  "bd": { "ok": true, "driver": "mysql" }
}
```

### ✅ Verificar frontend

```bash
# 2. Página principal carga
curl https://institutoj20.sg-host.com/

# Debe devolver HTML (no 404 ni 500)
```

### ✅ Probar login de rol

```bash
# 3. Login de administrador
curl -X POST https://institutoj20.sg-host.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "admin.ti@itsjapon.edu.ec",
    "clave": "admin1234"
  }'

# Esperado (si ejecutaste --seed):
{
  "ok": true,
  "usuario": { ... },
  "must_change_password": true
}
```

### ✅ Probar login de alumno

```bash
# 4. Login de alumno
curl -X POST https://institutoj20.sg-host.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "cavasconezp@itsjapon.edu.ec",
    "clave": "1712345678"
  }'

# Esperado (si ejecutaste --seed):
{
  "ok": true,
  "usuario": { ... }
}
```

### 📋 Checklist completo

Ver archivo: **POST_DEPLOY_CHECKLIST.md**

---

## 🆘 Si algo falla

### Error 500 (servidor error)

```bash
# Activar debug temporalmente:
# En SiteGround, editar .env:
APP_DEBUG=true

# Recarga y ver el error real
# Luego volver a false

# O ver logs:
tail -f /home/customer/logs/institutoj20.sg-host.com/error.log
```

### BD no conecta (bd.ok: false)

```bash
# Verificar credenciales de .env:
cat /home/customer/www/institutoj20.sg-host.com/.env | grep DB_

# Probar conexión manual:
mysql -h localhost -u miatech_user -p
# Entrar contraseña
```

### Login siempre falla

```bash
# Verificar que datos de prueba existen:
mysql -h localhost -u miatech_user -p
USE miatech_bd;
SELECT * FROM administradores;
SELECT * FROM estudiantes;

# Si está vacío, ejecutar migración:
php tools/migrate.php --seed
```

### GROQ no funciona

```bash
# Verificar clave:
grep GROQ_API_KEY /home/customer/www/institutoj20.sg-host.com/.env

# Debe tener un valor gsk_...
# Si está vacío o mal, actualizar .env
```

### Correos no llegan

```bash
# Verificar SMTP en .env:
grep SMTP /home/customer/www/institutoj20.sg-host.com/.env

# Ver logs de PHP para errores SMTP:
tail -f /home/customer/logs/institutoj20.sg-host.com/error.log
```

---

## 📞 Resumen rápido

| Fase | Acción | Lugar |
|------|--------|-------|
| **0** | Crear BD MySQL, SMTP, SSL | SiteGround Site Tools |
| **1** | Editar `.env.production` con secretos | Tu PC (LOCAL) |
| **2** | Subir `public_html/`, `tools/`, `storage/` | SFTP a SiteGround |
| **3** | Crear `.env` en raíz SiteGround | SiteGround SFTP o SSH |
| **4** | Ejecutar `php tools/migrate.php --seed` | SiteGround SSH |
| **5** | Probar `/api/health`, login, grabación | Navegador (HTTPS) |

---

**Próximo paso:** Ver **PRE_DEPLOY_CHECKLIST.md** (antes de Fase 2)

**Después de desplegar:** Ver **POST_DEPLOY_CHECKLIST.md**
