# Migración a SiteGround — MiaTech v5 (PHP)

**Documento:** Guía completa para llevar el código de LOCAL a SiteGround  
**Fecha:** 2026-07-20  
**Estado:** Desde LOCAL (funcionando) → SiteGround (institutoj20.sg-host.com)

---

## 📋 Tabla de contenidos

1. [Cambios en código necesarios](#cambios-en-código)
2. [Estructura de directorios en SiteGround](#estructura-de-directorios)
3. [Variables .env para SiteGround](#variables-env-siteground)
4. [Pasos de deployment](#pasos-de-deployment)
5. [Verificación post-despliegue](#verificación-post-despliegue)
6. [Troubleshooting](#troubleshooting)

---

## Cambios en código

### ✅ SIN cambios de código necesarios

El código PHP actual **ya está preparado** para funcionar en ambos entornos (local y SiteGround) porque:

- `config.php` carga variables de `.env` automáticamente
- `Database.php` abstrae MySQL/SQLite mediante PDO
- `StorageFactory.php` detecta el driver activo sin cambios de código
- `Ffmpeg.php` encuentra `ffmpeg` en el PATH o usa `FFMPEG_BIN` del `.env`

**Verificación:** El único lugar donde se hardcodea algo es `.env` — TODO lo demás lee de ahí.

### ⚠️ Cambios menores (confirmación/seguridad)

#### 1. **`public_html/api/bootstrap.php`** — Headers de seguridad
```php
// Ya implementado. Verificar que esté en la sección de cabeceras:
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
```
En SiteGround, considerar agregar CSP y HSTS (ver `DUDAS_PENDIENTES.md` D-08).

#### 2. **`public_html/api/.htaccess`** — Confirmación
```apache
# Ya debe tener:
Options -MultiViews
```
Asegurar que está ahí para evitar el 403 de `/api/config`.

#### 3. **`tools/migrate.php`** — Seguridad en producción
Actualmente, cualquiera que tenga acceso PHP puede ejecutarlo. En SiteGround:
- Ejecutar SOLO por SSH (no exponerlo por web)
- Alternativa: agregar token de setup protegido (futuro)

### 🟢 Confirmaciones antes de subir

- [ ] `public_html/` no tiene `.env` ni credenciales hardcodeadas
- [ ] `public_html/api/.htaccess` tiene `Options -MultiViews`
- [ ] `bootstrap.php` tiene el error handler global (try/catch en RateLimit)
- [ ] No hay rutas absolutas de Windows (`C:\...`) en el código
- [ ] `lib/Database.php` puede conectar a MySQL (probado en local si es posible)

---

## Estructura de directorios

### En tu máquina LOCAL (actual)
```
MiaTech-v5-PHP/
├── .env                          ← CONFIGURACIÓN LOCAL
├── .env.local                    ← OVERRIDES LOCALES (no se sube)
├── .env.example                  ← PLANTILLA (siempre en git)
├── public_html/                  ← CONTENIDO WEB (sale igual)
│   ├── index.html, *.css, *.js
│   └── api/
│       ├── index.php
│       ├── config.php
│       ├── .htaccess
│       ├── lib/
│       └── routes/
├── storage/                      ← ARCHIVOS (local)
│   ├── 2025B/
│   │   ├── videos/
│   │   ├── pdf/
│   │   └── tmp/               ← rate limit + audio temp
│   └── ...
├── db/                           ← SOLO LOCAL (SQLite)
│   └── miatech.sqlite
├── tools/
│   ├── migrate.php
│   └── seed.php
└── docs/
```

### En SiteGround (NUEVO LAYOUT)
```
/home/customer/www/institutoj20.sg-host.com/
├── .env                          ← CONFIGURACIÓN SITEGROUND (con claves reales)
├── .env.local                    ← IGNORAR (opcional para override)
├── storage/                      ← ARCHIVOS (fuera de web root)
│   ├── 2025B/
│   │   ├── videos/
│   │   ├── pdf/
│   │   └── tmp/
│   └── ...
├── tools/
│   ├── migrate.php
│   └── seed.php
├── docs/                         ← OPCIONAL
├── public_html/                  ← WEB ROOT (accesible por HTTPS)
│   ├── index.html, *.css, *.js
│   ├── js/, css/, img/, audio/
│   └── api/
│       ├── index.php
│       ├── config.php
│       ├── .htaccess
│       ├── lib/
│       └── routes/
└── (NO db/ si usas MySQL)
```

### Cambio de ruta importante
```
LOCAL:       MiaTech-v5-PHP/db/miatech.sqlite
SITEGROUND:  ELIMINADO (usaremos MySQL en Site Tools)
```

---

## Variables .env para SiteGround

### .env.example (ya en git, sin cambios)
Mantener igual. Es la plantilla de referencia.

### .env para LOCAL (actual)
```bash
APP_ENV=development
APP_DEBUG=true
APP_BASE_URL=http://localhost:8000
DB_DRIVER=sqlite
DB_SQLITE_PATH=./db/miatech.sqlite
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage
GROQ_API_KEY=
SMTP_HOST=
# ... más variables (ver .env actual)
```

### .env para SITEGROUND (NUEVO — crear antes de subir)

```bash
# ============================================================
# ENTORNO
# ============================================================
APP_ENV=production
APP_DEBUG=false
APP_BASE_URL=https://institutoj20.sg-host.com
PERIODO_ACADEMICO=2025B

# ============================================================
# BASE DE DATOS — MySQL (en SiteGround Site Tools)
# ============================================================
DB_DRIVER=mysql
DB_HOST=localhost                                    # ← Típico en SiteGround
DB_PORT=3306
DB_NAME=miatech                                      # ← Reemplazar con nombre real
DB_USER=miatech_user                                 # ← Reemplazar con usuario real
DB_PASSWORD=xxxxxxxxxxxxxxxx                         # ← CLAVE REAL de Site Tools
DB_CHARSET=utf8mb4

# NO NECESARIO EN SITEGROUND (MySQL no requiere sqlite_path):
# DB_SQLITE_PATH=

# ============================================================
# ALMACENAMIENTO
# ============================================================
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/home/customer/www/institutoj20.sg-host.com/storage
# Alternativa: usar ruta relativa si está fuera de public_html
# STORAGE_LOCAL_PATH=../storage

# ============================================================
# GROQ (IA: Transcripción + Evaluación CEFR)
# ============================================================
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   # ← CLAVE REAL (plan pago)
GROQ_MODEL=openai/gpt-oss-120b
GROQ_WHISPER_MODEL=whisper-large-v3-turbo
GROQ_BASE_URL=https://api.groq.com/openai/v1

# ============================================================
# SMTP (Correo institucional)
# ============================================================
# Proveedor: SiteGround (mismo servidor) o Gmail / externo
SMTP_HOST=smtp.gmail.com                             # ← Verificar con TI
SMTP_PORT=587                                        # ← O 465 si usas SSL
SMTP_USER=speakingtest@itsjapon.edu.ec
SMTP_PASSWORD=xxxxxxxxxxxxxxxx                       # ← CONTRASEÑA REAL
SMTP_FROM=speakingtest@itsjapon.edu.ec
SMTP_FROM_NAME=MiaTech - Centro de Idiomas

# ============================================================
# ONEDRIVE (Futuro)
# ============================================================
ONEDRIVE_TENANT_ID=
ONEDRIVE_CLIENT_ID=
ONEDRIVE_CLIENT_SECRET=
ONEDRIVE_DRIVE_ID=
ONEDRIVE_BASE_FOLDER=MiaTech

# ============================================================
# GRABACIÓN DE AUDIO
# ============================================================
MIN_RECORDING_DURATION=60
MAX_RECORDING_DURATION=300
RECORDING_TIME_LABEL=1-5 min
TASK_TEXT=Describe the picture.
IMAGE_PATH=./public_html/img/imagenes/

# ============================================================
# FFMPEG
# ============================================================
FFMPEG_BIN=ffmpeg                                    # ← Disponible en SiteGround
```

### Resumen de cambios en .env

| Variable | LOCAL | SITEGROUND |
|----------|-------|-----------|
| `APP_ENV` | `development` | `production` |
| `APP_DEBUG` | `true` | `false` |
| `APP_BASE_URL` | `http://localhost:8000` | `https://institutoj20.sg-host.com` |
| `DB_DRIVER` | `sqlite` | `mysql` |
| `DB_HOST` | (ignorado) | `localhost` |
| `DB_NAME` | (ignorado) | `miatech` (nombre real) |
| `DB_USER` | (ignorado) | usuario real de Site Tools |
| `DB_PASSWORD` | (vacío) | contraseña real de Site Tools |
| `STORAGE_LOCAL_PATH` | `./storage` | `/home/customer/.../storage` |
| `GROQ_API_KEY` | vacío o testing | `gsk_...` (plan pago) |
| `SMTP_HOST` | vacío | `smtp.gmail.com` o SiteGround |
| `SMTP_PASSWORD` | vacío | contraseña real |

---

## Pasos de deployment

### Fase 0: Preparación en SiteGround

1. **Crear base de datos MySQL**
   - Acceder a SiteGround → Site Tools → MySQL
   - Crear BD: nombre `miatech` (o el que prefieras)
   - Crear usuario con todos los permisos en esa BD
   - Copiar datos: host, usuario, contraseña, nombre de BD

2. **Verificar permisos de carpeta**
   - `/home/customer/www/institutoj20.sg-host.com/` debe ser escribible
   - `public_html/` debe ser de SiteGround

3. **Confirmar SSL**
   - `institutoj20.sg-host.com` debe tener SSL activo (HTTPS)
   - Verificar en navegador: 🔒 junto a la URL

### Fase 1: Preparar archivos en LOCAL

1. **Limpiar datos locales**
   ```bash
   # En tu máquina:
   rm -rf db/miatech.sqlite              # No llevar BD local
   rm -rf storage/*                      # No llevar videos viejos
   mkdir -p storage/tmp                  # Crear dir vacío
   ```

2. **Crear .env.production** (NO .env, para no confundirse)
   ```bash
   # Copiar el contenido de la sección "SITEGROUND" de arriba
   # Completar con datos reales de Site Tools
   ```

3. **Verificar que NO hay secretos en git**
   ```bash
   git status
   # Debe mostrar:
   #   - .env no está
   #   - .env.local no está
   #   - .env.example SÍ está
   ```

### Fase 2: Subir a SiteGround

**Opción A: Por SFTP (recomendado)**

1. Conectar con SFTP (credenciales de SiteGround)
   ```
   Host: tudominio.com
   Usuario: tu_user_siteground
   Contraseña: tu_pass_siteground
   Puerto: 18765
   ```

2. Subir carpetas completas:
   ```
   LOCAL: MiaTech-v5-PHP/public_html/*   →   REMOTO: /public_html/
   LOCAL: MiaTech-v5-PHP/storage/        →   REMOTO: /home/customer/www/institutoj20.sg-host.com/storage/
   LOCAL: MiaTech-v5-PHP/tools/          →   REMOTO: /home/customer/www/institutoj20.sg-host.com/tools/
   LOCAL: MiaTech-v5-PHP/docs/           →   REMOTO: /home/customer/www/institutoj20.sg-host.com/docs/ (opcional)
   ```

3. Crear `.env` en REMOTO:
   - Ruta: `/home/customer/www/institutoj20.sg-host.com/.env`
   - Contenido: datos reales de BD, GROQ, SMTP (de arriba)
   - Modo: 600 (solo lectura para propietario)

**Opción B: Por Git (si lo usas en SiteGround)**

```bash
# En SiteGround (SSH):
cd /home/customer/www/institutoj20.sg-host.com
git clone https://tu_repo.git .
# (Esto clona todo menos .env y .gitignore excluye .env)
# Luego crear .env manualmente
```

**Opción C: Por ZIP**

1. Comprimir localmente (sin .env, sin db/)
   ```
   MiaTech-v5-PHP-v2.zip  (public_html, storage, tools, docs)
   ```
2. Subir ZIP a SiteGround por panel de control
3. Descomprimir
4. Crear .env

### Fase 3: Migración de base de datos

**Conéctate por SSH a SiteGround:**

```bash
ssh usuario@institutoj20.sg-host.com -p 18765

# Ir a la carpeta del proyecto:
cd /home/customer/www/institutoj20.sg-host.com

# Crear la BD con esquema (sin datos de prueba):
php tools/migrate.php

# Opcional: si quieres datos de prueba (para probar antes de usuarios reales):
php tools/migrate.php --seed
```

Si no tienes SSH, usar cron de SiteGround:
- Site Tools → Cron Jobs → Agregar:
  ```
  Comando: /opt/php82/bin/php /home/customer/www/institutoj20.sg-host.com/tools/migrate.php
  Ejecutar: Una sola vez (una vez)
  ```

### Fase 4: Subir imágenes de evaluación

1. Conectar SFTP a SiteGround
2. Ir a: `/public_html/img/imagenes/`
3. Subir las imágenes PNG/JPG (cualquier tamaño, se redimensionan en frontend)

---

## Verificación post-despliegue

### ✅ Checklist de funcionamiento

```bash
# 1. Health check (servidor vivo)
GET https://institutoj20.sg-host.com/api/health
# Esperado: JSON con:
# {
#   "ok": true,
#   "php": "8.x.x",
#   "ffmpeg": { "disponible": true, "version": "..." },
#   "bd": { "ok": true, "driver": "mysql" }
# }

# 2. Página principal carga
GET https://institutoj20.sg-host.com/
# Esperado: HTML del frontend

# 3. Login de rol
POST https://institutoj20.sg-host.com/api/auth/login
Body: { "correo": "admin.ti@itsjapon.edu.ec", "clave": "admin1234" }
# (Si ejecutaste --seed)
# Esperado: { "ok": true, "usuario": {...}, "must_change_password": true }

# 4. Login de alumno
POST https://institutoj20.sg-host.com/api/auth/login
Body: { "correo": "cavasconezp@itsjapon.edu.ec", "clave": "1712345678" }
# Esperado: { "ok": true, "usuario": {...} }

# 5. Envío de grabación (si tienes GROQ_API_KEY)
POST https://institutoj20.sg-host.com/api/submission
Body: multipart/form-data con video
# Esperado: { "ok": true, "resultado_cefr": "A2.1", ... }

# 6. Correo de recuperación (si tienes SMTP real)
POST https://institutoj20.sg-host.com/api/auth/forgot
Body: { "correo": "coordinador.idiomas@itsjapon.edu.ec" }
# Esperado: { "ok": true }
# Verificar que llega correo en la bandeja
```

### 🟢 Si todo OK

- [ ] `/api/health` devuelve ok:true y bd.driver:mysql
- [ ] Frontend carga sin errores
- [ ] Login de roles funciona
- [ ] Login de alumnos funciona
- [ ] Dashboard visible (si eres rol)
- [ ] Grabación funciona
- [ ] Almacenamiento persiste (ver archivos en `storage/`)
- [ ] Correos llegan (si SMTP está configurado)

### 🔴 Si hay problemas

Ver sección **Troubleshooting** abajo.

---

## Troubleshooting

### Error 500 en blanco
**Causa:** `APP_DEBUG=false` oculta el error.  
**Fix:**
```bash
# En SiteGround, editar .env:
APP_DEBUG=true
# Recargar y ver el error real
# Luego volver a false
```

### `/api/health` devuelve bd.ok:false
**Causa:** DB_* incorrectos.  
**Fix:**
1. Verificar en SiteGround Site Tools → MySQL:
   - Nombre de BD exacto
   - Usuario exacto
   - Contraseña exacta
   - Host (típicamente `localhost`)
2. Actualizar `.env` en SiteGround
3. Probar conexión manual:
   ```bash
   # En SiteGround SSH:
   mysql -h localhost -u tu_usuario -p
   # Entrar contraseña
   # Escribir: USE nombre_bd;
   # Escribir: SHOW TABLES;
   ```

### Login siempre falla (401)
**Causa:** BD sin datos o usuario no existe.  
**Fix:**
```bash
# En SiteGround SSH:
php tools/migrate.php --seed
# Luego probar login con usuario de prueba (ver CHECKLIST_PRUEBAS.md)
```

### `/api/config` devuelve 403
**Causa:** Colisión de nombres con archivo `api/config.php`.  
**Fix:** Verificar que `public_html/api/.htaccess` tiene:
```apache
Options -MultiViews
```

### Login devuelve HTML en vez de JSON
**Causa:** `storage/tmp/` no es escribible.  
**Fix:**
```bash
# En SiteGround SSH:
mkdir -p /home/customer/www/institutoj20.sg-host.com/storage/tmp
chmod 755 /home/customer/www/institutoj20.sg-host.com/storage/tmp
```

### GROQ no funciona (evaluación devuelve error)
**Causa:** `GROQ_API_KEY` vacía o incorrecta.  
**Fix:**
1. Ir a https://console.groq.com/keys
2. Copiar una API key válida
3. Actualizar en `.env` de SiteGround
4. Probar `/api/submission` nuevamente

### SMTP no envía correos
**Causa:** `SMTP_HOST`/`SMTP_PASSWORD` incorrectos o puerto bloqueado.  
**Fix:**
1. Verificar con TI:
   - ¿SMTP_HOST correcto? (Gmail, SiteGround, otro)
   - ¿Puerto 587 o 465?
   - ¿STARTTLS o SSL?
   - ¿Contraseña de app (no contraseña de email)?
2. Actualizar `.env`
3. Prueba: `/api/auth/forgot` y revisa bandeja de spam
4. Si no llega, verificar logs de PHP:
   ```bash
   # En SiteGround SSH:
   tail -f /home/customer/logs/institutoj20.sg-host.com/error.log
   ```

### Videos no se guardan en storage/
**Causa:** `STORAGE_LOCAL_PATH` incorrecta o sin permisos.  
**Fix:**
```bash
# En SiteGround SSH:
ls -la /home/customer/www/institutoj20.sg-host.com/storage/
# Debe mostrar directorios con permisos 755

# Si faltan:
mkdir -p /home/customer/www/institutoj20.sg-host.com/storage/{2025B/videos,2025B/pdf,tmp}
chmod -R 755 /home/customer/www/institutoj20.sg-host.com/storage
```

---

## Tareas adicionales en SiteGround

### 1. Cron de limpieza de temporales (recomendado)
Archivos viejos (>2 horas) en `storage/tmp/` pueden acumularse.

En SiteGround Site Tools → Cron Jobs, agregar:
```
Comando: find /home/customer/www/institutoj20.sg-host.com/storage/tmp -type f -mmin +120 -delete
Frecuencia: Cada hora (0 * * * *)
```

### 2. Backup automático de base de datos
SiteGround ofrece backups automáticos. Verificar en Site Tools → Backups.

### 3. Seguridad: cambiar credenciales de prueba
Antes de usuarios reales, eliminar datos de seed:

```bash
# En SiteGround SSH:
mysql -h localhost -u tu_usuario -p < /dev/null
# Conectar e correr:
USE nombre_bd;
DELETE FROM administradores WHERE correo LIKE '%@itsjapon.edu.ec' AND rol != 'custom';
DELETE FROM estudiantes;
DELETE FROM intentos_login;
DELETE FROM evaluaciones_rendidas;
DELETE FROM periodos;
```

O simplemente dejar los datos de prueba (inofensivos si APP_DEBUG=false).

---

## Checklist final

Antes de decir "listo para producción":

- [ ] Código: `public_html/` subido; `storage/`, `tools/`, `.env` fuera de web root
- [ ] BD: MySQL creada en Site Tools; `tools/migrate.php` ejecutado
- [ ] `.env`: `APP_ENV=production`, `APP_DEBUG=false`
- [ ] `.env`: `DB_DRIVER=mysql` con credenciales reales
- [ ] `.env`: `GROQ_API_KEY` real (plan pago con límite mensual)
- [ ] `.env`: `SMTP_HOST` y `SMTP_PASSWORD` reales
- [ ] SSL: HTTPS activo (🔒 en navegador)
- [ ] `/api/health` → ok:true, bd.driver:mysql
- [ ] Login de rol y alumno funciona
- [ ] Grabación + evaluación completa funciona
- [ ] Correos se envían correctamente
- [ ] Datos de prueba eliminados (si no quieres que se vean)
- [ ] Cron de limpieza activado
- [ ] Logs monitoreados (ver errores en `.../error.log`)
- [ ] Documentación de SiteGround actualizada (credenciales guardadas de forma segura)

---

## Referencias rápidas

- `CHECKLIST_PRUEBAS.md` — Plan de pruebas Nivel 0-3
- `DESPLIEGUE.md` — Estructura de carpetas (resumen)
- `VARIABLES_FUNCIONAMIENTO.md` — Todas las variables del proyecto
- `PENDIENTES_PRODUCCION.md` — Tareas before go-live
- `DUDAS_PENDIENTES.md` — Preguntas de seguridad abiertas
- `docs/DECISIONES_IMPORTANTES.md` — Decisiones de diseño
- `docs/PROYECTO_CONTEXTO.md` — Visión general del backend

---

**Última actualización:** 2026-07-20  
**Próxima revisión:** Tras primer despliegue a SiteGround
