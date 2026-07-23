# Resumen: Cambios de .env (LOCAL → SITEGROUND)

**Referencia rápida para migración**

---

## 📊 Comparación de variables

| Variable | LOCAL | SITEGROUND | Notas |
|----------|-------|-----------|-------|
| **APP_ENV** | `development` | `production` | Deshabilita debug verbose |
| **APP_DEBUG** | `true` | `false` | Nunca true en producción |
| **APP_BASE_URL** | `http://localhost:8000` | `https://institutoj20.sg-host.com` | Para recepción de cookies/cors |
| **PERIODO_ACADEMICO** | `2025B` | `2025B` | Puede cambiar, mismo valor |
| | | | |
| **DB_DRIVER** | `sqlite` | `mysql` | 🔄 **CAMBIO CRÍTICO** |
| **DB_HOST** | (ignorado) | `localhost` | Típicamente localhost en SiteGround |
| **DB_PORT** | (ignorado) | `3306` | Puerto MySQL estándar |
| **DB_NAME** | (ignorado) | `miatech` | Nombre de BD en Site Tools |
| **DB_USER** | (ignorado) | usuario real | Usuario MySQL creado en Site Tools |
| **DB_PASSWORD** | (vacío) | contraseña real | Contraseña MySQL de Site Tools |
| **DB_CHARSET** | `utf8mb4` | `utf8mb4` | Sin cambios |
| **DB_SQLITE_PATH** | `./db/miatech.sqlite` | **(NO USAR)** | Solo para SQLite; no necesario |
| | | | |
| **STORAGE_DRIVER** | `local` | `local` | Sin cambios (OneDrive futuro) |
| **STORAGE_LOCAL_PATH** | `./storage` | `/home/customer/.../storage` | Ruta absoluta en SiteGround |
| | | | |
| **GROQ_API_KEY** | vacío | `gsk_...` | 🔄 **CAMBIO CRÍTICO** (plan pago) |
| **GROQ_MODEL** | `openai/gpt-oss-120b` | `openai/gpt-oss-120b` | Sin cambios |
| **GROQ_WHISPER_MODEL** | `whisper-large-v3-turbo` | `whisper-large-v3-turbo` | Sin cambios |
| **GROQ_BASE_URL** | `https://api.groq.com/openai/v1` | igual | Sin cambios |
| | | | |
| **SMTP_HOST** | vacío | servidor real | 🔄 **CAMBIO CRÍTICO** |
| **SMTP_PORT** | `587` | `587` o `465` | Depende del proveedor |
| **SMTP_USER** | vacío | `speakingtest@itsjapon.edu.ec` | Usuario del correo |
| **SMTP_PASSWORD** | vacío | contraseña real | 🔄 **CAMBIO CRÍTICO** |
| **SMTP_FROM** | `speakingtest@itsjapon.edu.ec` | igual | Sin cambios |
| **SMTP_FROM_NAME** | `MiaTech - Centro de Idiomas` | igual | Sin cambios |
| | | | |
| **MIN_RECORDING_DURATION** | `60` | `60` | Sin cambios |
| **MAX_RECORDING_DURATION** | `300` | `300` | Sin cambios |
| **RECORDING_TIME_LABEL** | `1-5 min` | `1-5 min` | Sin cambios |
| **TASK_TEXT** | `Describe the picture.` | igual | Sin cambios |
| **IMAGE_PATH** | `./public_html/img/imagenes/` | igual | Sin cambios |
| | | | |
| **FFMPEG_BIN** | `ffmpeg` | `ffmpeg` | Sin cambios (en PATH) |

---

## 🔴 Cambios CRÍTICOS (acción requerida)

### 1. **Base de datos: SQLite → MySQL**
```
LOCAL:      DB_DRIVER=sqlite
SITEGROUND: DB_DRIVER=mysql
            DB_HOST=localhost (de Site Tools)
            DB_NAME=miatech (de Site Tools)
            DB_USER=usuario (de Site Tools)
            DB_PASSWORD=contraseña (de Site Tools)
```
**Acción:** Obtener credenciales MySQL de SiteGround Site Tools → MySQL.

### 2. **GROQ: vacío → API key real (plan pago)**
```
LOCAL:      GROQ_API_KEY=
SITEGROUND: GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```
**Acción:** Ir a https://console.groq.com → Billing → cambiar a plan pago → copiar API key.

### 3. **SMTP: vacío → servidor real**
```
LOCAL:      SMTP_HOST=
            SMTP_PASSWORD=
SITEGROUND: SMTP_HOST=smtp.gmail.com (o servidor)
            SMTP_PASSWORD=contraseña real
```
**Acción:** Verificar con TI qué servidor SMTP usar. Probar puerto (587 o 465).

### 4. **APP_DEBUG: true → false**
```
LOCAL:      APP_DEBUG=true
SITEGROUND: APP_DEBUG=false
```
**Acción:** NO cambiar hasta confirmar que todo funciona.

---

## 🟢 Variables SIN cambios

Estas variables pueden tener el mismo valor:

```
PERIODO_ACADEMICO
STORAGE_DRIVER
GROQ_MODEL
GROQ_WHISPER_MODEL
GROQ_BASE_URL
SMTP_FROM
SMTP_FROM_NAME
MIN_RECORDING_DURATION
MAX_RECORDING_DURATION
RECORDING_TIME_LABEL
TASK_TEXT
IMAGE_PATH
FFMPEG_BIN
```

---

## ⚠️ Variables a ELIMINAR en SiteGround

```
DB_SQLITE_PATH=
  └─ Solo para SQLite. No necesaria con MySQL.
```

---

## 📋 Pasos rápidos

### En SiteGround Site Tools (obtener datos)

1. **MySQL**
   - Anotar: Host, Nombre BD, Usuario, Contraseña

2. **Email**
   - Verificar SMTP_HOST y puerto con administrador

3. **Crear carpeta storage**
   ```
   /home/customer/www/institutoj20.sg-host.com/storage/
   chmod 755 storage/
   ```

### En GROQ Console

1. Ir a https://console.groq.com
2. Billing → Add payment method
3. Copy new API key
4. Set monthly limit ($5 sugerido)

### Crear .env en SiteGround

```bash
# Contenido: ver .env.SITEGROUND.template
# Ubicación: /home/customer/www/institutoj20.sg-host.com/.env
# Permisos: chmod 600 .env
```

---

## 🧪 Verificación final

```bash
# Después de crear .env en SiteGround:

# 1. Health check
curl https://institutoj20.sg-host.com/api/health
# → Debe devolver ok:true, bd.driver:mysql

# 2. Login
curl -X POST https://institutoj20.sg-host.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin.ti@itsjapon.edu.ec","clave":"admin1234"}'
# → Si sembraste datos: { "ok": true, "usuario": {...} }

# 3. Evaluación completa
# → Grabar video, submit, verificar que se procesa con GROQ
```

---

## 📁 Archivos de referencia

- `MIGRACION_A_SITEGROUND.md` — Guía completa
- `.env` — Configuración actual (LOCAL)
- `.env.SITEGROUND.template` — Plantilla para SiteGround
- `docs/VARIABLES_FUNCIONAMIENTO.md` — Referencia de todas las variables
- `docs/DESPLIEGUE.md` — Estructura de carpetas en SiteGround
