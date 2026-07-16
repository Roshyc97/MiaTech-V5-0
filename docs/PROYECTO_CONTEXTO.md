# Mi@Tech v5.0 (PHP) — Contexto Completo del Proyecto

**Última revisión:** 2026-07-14 (contrastado contra el código real de este repositorio)

> ⚠️ Nota histórica: hasta 2026-07-14 este archivo (y los otros 3 MD maestros de `docs/`)
> describían por error el proyecto **v4.0 Node/Express** (otra carpeta, otro stack). Se
> reescribieron para reflejar el backend real de este proyecto: **PHP + PDO**, pensado para
> correr completo en SiteGround sin Render. Si algo de lo de abajo no coincide con el código,
> el código manda — avisar para corregir el documento.

## Qué es Mi@Tech

Sistema web de evaluación oral de inglés para el **Instituto Tecnológico Superior Japón**
(Centro de Idiomas). El estudiante graba una respuesta oral describiendo una imagen aleatoria;
el audio se transcribe con Whisper (GROQ) y se evalúa con un LLM para determinar el nivel CEFR
(A1, A2.1, A2.2, B1). El resultado va al instructor; el alumno solo recibe una constancia sin
calificación.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | PHP 8.x puro (sin framework) + PDO |
| Base de datos | MySQL (SiteGround, producción) / SQLite (`DB_DRIVER=sqlite`, desarrollo local) — mismo código, `Schema.php` es driver-aware |
| IA — Transcripción | GROQ Whisper (`whisper-large-v3-turbo`) vía cURL |
| IA — Evaluación CEFR | GROQ LLM (`GROQ_MODEL`, `.env`; actual `openai/gpt-oss-120b`) vía cURL |
| PDF | Generador propio sin dependencias (`lib/Pdf.php`, fuente Helvetica core) |
| Frontend | HTML/CSS/JS vanilla, reutilizado de la v4.0 (mismo origen, sin CORS) |
| Autenticación | Sesión PHP nativa; bcrypt para roles, cédula en texto plano para alumnos |
| Correo | SMTP mínimo por `fsockopen` + `AUTH LOGIN` (`lib/Mailer.php`), sin librerías externas |

No hay `package.json`, `npm`, Express, ni Render en este proyecto — eso es v4.0, en otra carpeta.

---

## Estructura de archivos (real)

```
MiaTech-v5-PHP/
├── public_html/                    # <- se sube al web root de SiteGround
│   ├── index.html, admin-*.html, recuperar.html, css/, js/, img/, audio/  (frontend, de v4-0)
│   └── api/                        # backend PHP
│       ├── index.php               # front controller: router por tabla "METODO ruta" -> archivo
│       ├── config.php              # carga .env -> array de config (bloqueado por .htaccess)
│       ├── bootstrap.php           # autoload MiaTech\, sesion, cabeceras seguridad,
│       │                           #   handler global de errores/fatales -> JSON
│       ├── .htaccess               # rewrite a index.php; Options -MultiViews; bloquea config/bootstrap/.env
│       ├── lib/                    # namespace MiaTech\
│       │   ├── Database.php        # conexion PDO agnostica (mysql/sqlite)
│       │   ├── Schema.php          # crea las 11 tablas (driver-aware)
│       │   ├── Seed.php            # datos de prueba (roles + 10 alumnos)
│       │   ├── Auth.php            # sesion + guardas requireAuth/requireAdmin/requireRol
│       │   ├── RateLimit.php       # anti fuerza bruta basado en archivos (por IP+bucket), fail-open
│       │   ├── Request.php         # helpers de entrada (input, ip, userAgent)
│       │   ├── Response.php        # helpers JSON { ok: true|false }
│       │   ├── Ffmpeg.php          # extraerAudio() via exec()
│       │   ├── Groq.php            # transcribir() + evaluar() via cURL
│       │   ├── Mailer.php          # SMTP minimo (fsockopen)
│       │   ├── Pdf.php             # constanciaAlumno() (sin nota) / evaluacionProfesor() (con nota)
│       │   └── Storage/
│       │       ├── StorageInterface.php
│       │       ├── LocalStorage.php     # driver activo (SiteGround)
│       │       ├── OneDriveStorage.php  # stub, futuro
│       │       └── StorageFactory.php   # arma el driver segun STORAGE_DRIVER
│       └── routes/                 # handlers, uno por endpoint
│           ├── health.php, config.php, imagen.php, consentimiento.php
│           ├── submission.php, submission_pdf.php, submission_pdf_profesor.php
│           ├── auth/ (login, logout, me, change-password, forgot, reset)
│           └── admin/dispatch.php  # sub-router del panel (estudiantes/docentes/periodos/admins/estadisticas)
├── tools/
│   ├── migrate.php                 # php tools/migrate.php [--seed] -> crea/verifica esquema
│   └── seed.php                    # php tools/seed.php -> solo datos de prueba
├── storage/                        # FUERA del web root: videos, pdf, tmp (rate limit, audio temporal)
├── db/                              # sqlite local (solo si DB_DRIVER=sqlite)
├── docs/                            # 4 MD maestros + CHECKLIST_PRUEBAS + DESPLIEGUE + DUDAS_PENDIENTES
├── .env.example
└── .gitignore
```

---

## Flujo del alumno

```
1. HOME -> "Test Assessment"
2. LOGIN -> correo institucional + cedula (texto plano, es la clave)
3. INSTRUCTIONS -> guia de la plataforma
4. CONSENTIMIENTO (modal) -> POST /api/consentimiento -> se registra en BD
5. RECORDING -> imagen aleatoria (GET /api/imagen/aleatoria), graba pantalla+camara (1-5 min)
   -> Submit -> POST /api/submission (multipart: video + imagen_id)
6. SUBMITTED -> confirmacion sin nota + descarga de PDF propio (GET /api/submission/pdf)
```

## Flujo del servidor en `POST /api/submission` (routes/submission.php)

```
1. Auth::requireAuth() + verifica tipo=estudiante
2. Candado: 1 intento por alumno por periodo (tabla intentos_evaluacion) -> 403 si ya rindio
3. Guarda el video subido en storage/tmp/
4. Ffmpeg::extraerAudio()          -> exec() con FFMPEG_BIN (.env)
5. Groq::transcribir()             -> Whisper (GROQ), vía cURL
6. Groq::evaluar()                 -> LLM CEFR (GROQ), vía cURL, valida JSON estricto
7. Pdf::evaluacionProfesor()       -> PDF con nota
8. StorageFactory::crear()->guardar() -> video + PDF profesor a storage/{periodo}/
9. INSERT evaluaciones_rendidas + INSERT intentos_evaluacion (candado)
10. Mailer::enviar()                -> correo de confirmacion al alumno (best-effort, sin nota)
11. Limpieza de temporales -> Response::ok(['pdf_url' => '/api/submission/pdf'])
```
El PDF del alumno (`Pdf::constanciaAlumno()`, sin nota) se genera al vuelo en
`submission_pdf.php` y **no se almacena**; solo el PDF de profesor se guarda en `storage/`.

---

## Base de datos (11 tablas — `lib/Schema.php`, driver-aware MySQL/SQLite)

| Tabla | Propósito |
|-------|-----------|
| `configuracion` | Fila única: periodo académico activo, fecha máxima, ruta de storage |
| `estudiantes` | correo, nombre, **apellido**, **carrera**, cedula (clave, texto plano), activo |
| `administradores` | correo, password_hash (bcrypt), rol (ti/coordinador/docente), must_change_password, reset_token/reset_expira |
| `intentos_login` | Auditoría de logins de alumnos (éxito/fallo, IP, user-agent) |
| `evaluaciones_rendidas` | Resultado CEFR, justificación, transcripción, referencias a video/PDF en storage |
| `consentimientos` | Registro legal de aceptación (identificador = correo) |
| `periodos` | Períodos académicos (fecha inicio/fin, activo) |
| `docentes` | correo, nombre, apellido, especialidad, activo |
| `estudiantes_periodos` | Relación N:M estudiante↔período |
| `intentos_evaluacion` | Candado de 1 intento por alumno por período (consultado en `submission.php`) |
| `importaciones` | Auditoría de cargas masivas CSV |

`estudiantes` **ya tiene** `apellido` y `carrera` (a diferencia de la v4.0 — esto quedó resuelto
en el diseño de esta reescritura, ver `DECISIONES_IMPORTANTES.md`).

---

## Endpoints reales (ver `public_html/api/index.php` y `routes/admin/dispatch.php`)

```
GET  /api/health                          -> estado del backend (php, ffmpeg, bd, storage)
GET  /api/config                          -> config publica para el frontend
GET  /api/imagen/aleatoria                -> imagen aleatoria para la evaluacion

POST /api/auth/login                      -> login (admin/rol o alumno, misma ruta)
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password            -> solo roles (requiere sesion admin)
POST /api/auth/forgot                     -> recuperacion, SOLO roles (no alumnos)
POST /api/auth/reset                      -> con token de 1 hora

POST /api/consentimiento                  -> requiere sesion de alumno
POST /api/submission                      -> flujo completo (ver arriba)
GET  /api/submission/pdf                  -> PDF del alumno (sin nota, generado al vuelo)
GET  /api/submission/pdf/{usuario}/profesor -> PDF con nota, solo admin/docente

GET  /api/admin/estadisticas
GET  /api/admin/estudiantes                 (?page&limit&search&filtro=activos|inactivos|todos)
GET  /api/admin/estudiantes/{id}            (incluye periodo{id,periodo} + intentos[])
GET  /api/admin/estudiantes/{id}/intentos   (historial de intentos, badge del dashboard)
POST/PUT/DELETE /api/admin/estudiantes/{id} (+ PATCH .../estado)
POST /api/admin/estudiantes/importar-masivo (carga CSV; alias "importar" tambien aceptado)
GET/POST/PUT/DELETE /api/admin/docentes     (?page&limit&search&filtro; solo rol 'ti' crea/edita)
GET/POST/PUT/DELETE /api/admin/periodos     (?page&limit&filtro)
GET  /api/admin/periodos/{id}/evaluaciones  (evaluaciones rendidas en ese periodo)
GET/POST /api/admin/administradores         (+ PATCH .../estado, solo rol 'ti')
```

Todas las rutas `admin/*` pasan por `Auth::requireAdmin()` en `dispatch.php`; algunas acciones
además exigen un rol específico (`ti`, `coordinador`) vía el helper `$rol()`.

**Dashboard (frontend):** reutiliza el frontend de v4.0 (`js/admin-sections/*.js`), que espera el
contrato de arriba (paginación, búsqueda, filtro por estado, sub-recursos). Ya está 100%
alineado con el backend PHP, incluida una sección **Administrators** (solo rol `ti`) agregada en
esta reescritura — permite crear administradores y activar/desactivar, pero no editar
nombre/rol ni borrar (el backend tampoco lo soporta).

---

## Convenciones y reglas del proyecto

1. Toda configuración sensible vive en `.env` (nunca hardcodeada, nunca en el frontend).
2. PDO agnóstico: `DB_DRIVER=sqlite` (dev) o `mysql` (SiteGround); la app no cambia de código.
3. Almacenamiento abstracto (`StorageInterface`): la BD guarda clave lógica, no ruta física.
   Migrar `local -> onedrive` es cambiar un driver + un flag, sin tocar el resto.
4. Mismo origen frontend/backend: sesión PHP normal, sin CORS ni cookies cross-domain.
5. FFmpeg vía `exec()` — confirmado disponible en SiteGround (Fase 0).
6. El frontend nunca recibe la calificación del alumno; solo el instructor la ve.
7. Recuperación de contraseña por correo: **solo para roles**, nunca para alumnos (su clave es
   la cédula, y se resetea manualmente si hace falta).
8. `estudiantes.cedula` se guarda y se muestra en el dashboard en texto plano — decisión
   explícita del usuario (ver `DUDAS_PENDIENTES.md`, D-01).

---

## Estado actual (pruebas)

- **Nivel 0** (salud + carga de página): ✅ resuelto.
- **Nivel 1** (sin claves — auth, dashboard, flujo hasta grabación): en curso. Bugs de este
  nivel ya corregidos en código: colisión `/api/config` (403 por `MultiViews`), warnings de
  `RateLimit.php` filtrándose en el JSON, y varios endpoints del panel admin que el frontend
  llamaba pero no existían (import CSV, edición de estudiante, intentos, paginación/filtro de
  estudiantes/docentes/períodos, evaluaciones por período) — todos alineados y agregada la
  sección Administrators. Ver el changelog en `PENDIENTES_PRODUCCION.md` y detalle en
  `DECISIONES_IMPORTANTES.md`. **Falta re-probar en el navegador** tras estos últimos cambios
  del dashboard (import CSV, editar estudiante, filtro de status, clic en período,
  administradores) — no se ha confirmado aún que funcionen en vivo.
- **Nivel 2** (con GROQ): validado en local — instalado `ffmpeg` en el entorno de pruebas, la
  evaluación completa (audio -> Whisper -> LLM -> PDF -> storage) corrió correctamente.
- **Nivel 3** (SMTP): pendiente de probar con servidor real (`speakingtest@itsjapon.edu.ec`).

Ver `docs/CHECKLIST_PRUEBAS.md` para el detalle ítem por ítem.

---

## Notas para continuar en una nueva sesión

- Servir en local: `php -S localhost:8000 -t public_html` (con `.env` copiado de `.env.example`).
- `ffmpeg` debe estar instalado y en el `PATH` del entorno donde corra PHP (local o SiteGround);
  si no, `Ffmpeg::extraerAudio()` lanza `RuntimeException` y `submission.php` responde 500.
- Migración/seed: `php tools/migrate.php --seed` (crea las 11 tablas + datos de prueba).
- Antes de subir a SiteGround: revisar `docs/DESPLIEGUE.md` (reparto de `public_html/` vs
  `storage/`, `tools/`, `.env` un nivel arriba) y `docs/PENDIENTES_PRODUCCION.md`.
- Dudas de seguridad abiertas a resolver antes del cierre: `docs/DUDAS_PENDIENTES.md`.
