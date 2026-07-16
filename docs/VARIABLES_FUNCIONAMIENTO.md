# Variables de funcionamiento — MiaTech v5.0 (PHP)

## Archivo de referencia técnica para configuración del proyecto

**Revisado 2026-07-14 contra el código real** (`config.php`, `Schema.php`, `index.php`,
`routes/`). Reemplaza la versión anterior de este documento, que describía por error el
proyecto v4.0 Node/Express.

---

## 1. Archivo `.env` (plantilla real: `.env.example`)

```bash
APP_ENV=development
APP_DEBUG=true
APP_BASE_URL=https://institutoj20.sg-host.com
PERIODO_ACADEMICO=2025B

# --- Base de datos ---
# driver: sqlite (local) | mysql (SiteGround)
DB_DRIVER=sqlite
DB_HOST=localhost
DB_PORT=3306
DB_NAME=miatech
DB_USER=
DB_PASSWORD=
DB_CHARSET=utf8mb4
# DB_SQLITE_PATH=                 # por defecto: <raiz>/db/miatech.sqlite

# --- GROQ (IA: Whisper + evaluacion CEFR) ---
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
GROQ_WHISPER_MODEL=whisper-large-v3-turbo

# --- SMTP (correo institucional) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=speakingtest@itsjapon.edu.ec
SMTP_PASSWORD=
SMTP_FROM=speakingtest@itsjapon.edu.ec
SMTP_FROM_NAME=MiaTech - Centro de Idiomas

# --- Almacenamiento ---
STORAGE_DRIVER=local              # local | onedrive (futuro)
# STORAGE_LOCAL_PATH=             # por defecto: <raiz>/storage

# --- OneDrive (pendiente de registro de app en Entra ID / TI) ---
ONEDRIVE_TENANT_ID=
ONEDRIVE_CLIENT_ID=
ONEDRIVE_CLIENT_SECRET=
ONEDRIVE_DRIVE_ID=
ONEDRIVE_BASE_FOLDER=MiaTech

# --- Grabacion ---
MIN_RECORDING_DURATION=60
MAX_RECORDING_DURATION=300
RECORDING_TIME_LABEL=1-5 min
TASK_TEXT=Describe the picture.

# --- FFmpeg ---
FFMPEG_BIN=ffmpeg                 # o ruta absoluta si no esta en el PATH
```

Hay también un `.env.local` opcional (mismo formato) que se carga **antes** que `.env` y no se
sube al repositorio — útil para overrides puramente locales (`config.php`, líneas 46-47).

Notas de ubicación: `.env` vive **un nivel arriba** de `public_html/` (ver `docs/DESPLIEGUE.md`).
`config.php` (`api/config.php`) lo busca con `dirname(__DIR__, 2)`.

---

## 2. Tabla de configuración real (`api/config.php` → función `config()`)

```php
config('app.env')                  // APP_ENV
config('app.debug')                // APP_DEBUG (bool)
config('app.base_url')             // APP_BASE_URL
config('app.periodo_academico')    // PERIODO_ACADEMICO

config('db.driver')                // sqlite | mysql
config('db.host' | 'port' | 'name' | 'user' | 'password' | 'charset')
config('db.sqlite_path')           // default: <raiz>/db/miatech.sqlite

config('groq.api_key' | 'model' | 'whisper_model' | 'base_url')
// base_url default: https://api.groq.com/openai/v1

config('smtp.host' | 'port' | 'user' | 'password' | 'from' | 'from_name')

config('storage.driver')           // local | onedrive
config('storage.local_path')       // default: <raiz>/storage
config('storage.onedrive.*')       // tenant_id, client_id, client_secret, drive_id, base_folder

config('grabacion.min_seg' | 'max_seg' | 'label' | 'task_text' | 'image_path')
// image_path default: public_html/img/imagenes/

config('ffmpeg.bin')               // default: 'ffmpeg' (resuelto por PATH)
```

Acceso desde cualquier clase con la función global `config('ruta.con.puntos')` (definida en
`bootstrap.php`); sin argumento devuelve el array completo.

---

## 3. Esquema de base de datos (11 tablas — `lib/Schema.php`, MySQL/SQLite)

### `configuracion` (fila única)
```sql
id, periodo_academico, fecha_max, storage_local_path
```

### `estudiantes`
```sql
id, correo (UNIQUE), nombre, apellido, carrera, cedula, activo, created_at
-- cedula = clave de acceso del alumno, TEXTO PLANO (decision del usuario, ver DUDAS_PENDIENTES D-01)
```

### `administradores`
```sql
id, correo (UNIQUE), password_hash, nombre,
rol CHECK IN ('ti','coordinador','docente'), activo, created_at, created_by,
must_change_password, reset_token, reset_expira
```

### `intentos_login`
```sql
id, estudiante_id, correo_ingresado, exito, ip_address, user_agent, timestamp
```

### `evaluaciones_rendidas`
```sql
id, estudiante_id, periodo_academico, nivel_seleccionado (default 'auto'),
resultado_cefr, justificacion, transcripcion, video_ref, reporte_ref, storage_driver, timestamp
```

### `consentimientos`
```sql
id, estudiante_id, identificador, acepto, timestamp, texto_version
```

### `periodos`
```sql
id, periodo (UNIQUE), fecha_inicio, fecha_fin, activo, created_at
```

### `docentes`
```sql
id, correo (UNIQUE), nombre, apellido, especialidad, activo, created_at
```

### `estudiantes_periodos` (N:M)
```sql
id, estudiante_id, periodo_id, asignado_en, UNIQUE(estudiante_id, periodo_id)
```

### `intentos_evaluacion` (candado de 1 intento/período)
```sql
id, estudiante_id, periodo_id, fecha_intento, resultado_cefr, duracion_seg
-- SI se consulta en routes/submission.php para bloquear un segundo envio (a diferencia de v4.0)
```

### `importaciones`
```sql
id, nombre_grupo, periodo_id, cantidad, importado_por, fecha_importacion
```

Migración/creación: `php tools/migrate.php [--seed]` (usa `Schema::crear(Database::conn())`).
Seed por separado: `php tools/seed.php`.

---

## 4. Modelos GROQ

```
Transcripción: whisper-large-v3-turbo
Evaluación LLM: configurable en .env (GROQ_MODEL), actual openai/gpt-oss-120b
Base URL: https://api.groq.com/openai/v1 (configurable, GROQ_BASE_URL)
Llamadas: cURL directo (lib/Groq.php), sin SDK — multipart para Whisper, JSON para chat/completions
Niveles válidos: A1, A2.1, A2.2, B1 (se valida estrictamente; cualquier otro valor lanza excepción)
```

---

## 5. Rutas de archivos importantes

```
Proyecto raíz: MiaTech-v5-PHP/  (SEPARADO de MiaTech-v4-0/, no mezclar)

public_html/
├── index.html, admin-login.html, admin-dashboard.html, recuperar.html   (frontend, reutilizado de v4-0)
├── js/, css/, img/imagenes/, audio/
└── api/
    ├── index.php            # front controller / router
    ├── config.php           # loader de .env (bloqueado por .htaccess a nivel web)
    ├── bootstrap.php         # autoload, sesion, headers seguridad, error handler global
    ├── .htaccess
    ├── lib/                  # namespace MiaTech\ (ver PROYECTO_CONTEXTO.md para el listado completo)
    └── routes/                # handlers por endpoint

tools/
├── migrate.php            # php tools/migrate.php --seed
└── seed.php                # php tools/seed.php

storage/                   # FUERA del web root: {periodo}/videos/, {periodo}/pdf/, tmp/ (audio + rate limit)
db/                          # solo si DB_DRIVER=sqlite: miatech.sqlite
docs/                       # documentación del proyecto
```

### Despliegue en SiteGround (ver `docs/DESPLIEGUE.md` para el detalle)
```
Subdominio: institutoj20.sg-host.com
Web root:   /home/customer/www/institutoj20.sg-host.com/public_html/
Un nivel arriba de public_html/: .env, storage/, tools/, docs/ (opcional), db/ (solo sqlite)
```

---

## 6. Puertos y endpoints

### Servidor (desarrollo)
```
php -S localhost:8000 -t public_html
Health check: /api/health
Main app:     /
```

### Endpoints API reales (ver `PROYECTO_CONTEXTO.md` sección "Endpoints reales" para el listado
completo con verbos HTTP — se resume aquí el router de `index.php`):
```php
$rutas = [
    'GET health'                => 'health.php',
    'GET config'                => 'config.php',
    'GET imagen/aleatoria'      => 'imagen.php',
    'POST consentimiento'       => 'consentimiento.php',
    'POST submission'           => 'submission.php',
    'GET submission/pdf'        => 'submission_pdf.php',
    'POST auth/login'           => 'auth/login.php',
    'POST auth/logout'          => 'auth/logout.php',
    'GET auth/me'               => 'auth/me.php',
    'POST auth/change-password' => 'auth/change-password.php',
    'POST auth/forgot'          => 'auth/forgot.php',
    'POST auth/reset'           => 'auth/reset.php',
];
// + GET submission/pdf/{usuario}/profesor (regex especial)
// + todo lo que empieza con 'admin/' -> routes/admin/dispatch.php
```

---

## 7. Límites y validaciones

### Grabación (desde `.env`, sección `grabacion`)
```
MIN_RECORDING_DURATION = 60 segundos
MAX_RECORDING_DURATION = 300 segundos
RECORDING_TIME_LABEL   = "1-5 min"
TASK_TEXT              = "Describe the picture."
```

### Rate limiting (`lib/RateLimit.php`, basado en archivos por IP+bucket, fail-open)
```
login:  máx. 12 intentos / 300 s por IP
forgot: máx. 6 intentos / 600 s por IP
```

### Candado de evaluación
```
1 intento por alumno por período (tabla intentos_evaluacion, validado en submission.php)
```

---

## 8. Comandos importantes

```bash
# Desarrollo
cp .env.example .env
php -S localhost:8000 -t public_html

# Base de datos
php tools/migrate.php --seed     # crea esquema + datos de prueba
php tools/migrate.php            # solo esquema (producción real, sin seed)
php tools/seed.php               # solo datos de prueba

# Producción (SiteGround)
# migrar por SSH o cron: php tools/migrate.php (sin --seed, con usuarios reales)
```

No hay `npm`, `composer.json` ni build step: PHP puro, sin dependencias externas.

---

## 9. Librerías / dependencias

Ninguna externa. Todo implementado a mano dentro de `lib/`:
```
Ffmpeg.php  -> exec() del binario del sistema (no fluent-ffmpeg)
Groq.php    -> cURL directo (no groq-sdk)
Mailer.php  -> fsockopen + AUTH LOGIN (no PHPMailer)
Pdf.php     -> generador de PDF 1.4 a mano (no pdfmake/mPDF)
Database.php -> PDO nativo (no ORM)
```
Extensiones PHP requeridas (verificadas en `/api/health`): `pdo_mysql`, `pdo_sqlite`, `curl`,
`mbstring`, `gd`, `openssl`.

---

## 10. Variables de sesión (`$_SESSION['usuario']`)

```php
// Admin/rol (Auth::login() en routes/auth/login.php)
['id', 'correo', 'nombre', 'rol', 'tipo' => 'admin', 'must_change_password']

// Alumno
['id', 'correo', 'nombre', 'apellido', 'carrera', 'cedula', 'rol' => 'estudiante', 'tipo' => 'estudiante']
```

---

## 11. Credenciales de prueba (`php tools/migrate.php --seed`)

Ver `docs/CHECKLIST_PRUEBAS.md` sección "Usuarios de prueba" para la lista completa y vigente
de roles y alumnos (correo/clave). No se duplica aquí para evitar que quede desactualizada en
dos archivos a la vez.

**⚠️ Cambiar contraseñas y eliminar usuarios de prueba antes de producción real.**

---

## 12. Referencias rápidas

- Contexto general: `PROYECTO_CONTEXTO.md`
- Decisiones de diseño: `DECISIONES_IMPORTANTES.md`
- Pendientes antes de producción: `PENDIENTES_PRODUCCION.md`
- Plan de pruebas por niveles: `CHECKLIST_PRUEBAS.md`
- Despliegue en SiteGround: `DESPLIEGUE.md`
- Dudas de seguridad abiertas: `DUDAS_PENDIENTES.md`
- GROQ: https://console.groq.com/docs · https://console.groq.com/docs/models
