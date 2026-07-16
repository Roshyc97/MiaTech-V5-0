# Decisiones importantes del proyecto — MiaTech v5.0 (PHP)

## Fecha: 2026-07-14
## Versión: MiaTech v5.0 (reescritura PHP de v4.0 Node/Express)

> ⚠️ Nota histórica: este archivo describía por error las decisiones de la v4.0 Node/Express.
> Se reescribió para reflejar las decisiones reales tomadas en la reescritura a PHP + PDO.

---

## 1. Por qué reescribir a PHP

- **Motivo:** correr completo en SiteGround (hosting compartido con PHP + MySQL nativos),
  eliminando la dependencia de Render.com y su free tier.
- **Alcance:** reescritura 1:1 del backend (Node/Express -> PHP/PDO). El frontend
  (HTML/CSS/JS vanilla) se reutiliza tal cual de la v4.0, sin cambios de UX.
- Proyecto **separado** de la v4.0 — carpetas y repos distintos, no se mezclan archivos.

---

## 2. Base de datos: PDO agnóstico, no una migración de una vez

- **Decisión:** en vez de decidir entre MySQL o SQLite, `lib/Database.php` y `lib/Schema.php`
  soportan ambos por `DB_DRIVER` en `.env`. El resto del código usa PDO sin saber el motor.
- **Razón:** permite desarrollar y probar en local con SQLite (cero configuración) y desplegar
  en SiteGround con MySQL sin tocar una sola línea de la aplicación.
- `Schema::crear()` genera las 11 tablas ajustando tipos (`AUTO_INCREMENT` vs
  `INTEGER PRIMARY KEY AUTOINCREMENT`, `CURRENT_TIMESTAMP` vs `datetime('now')`, etc.) según el
  driver detectado en runtime.

---

## 3. Campos `apellido` y `carrera` en `estudiantes`

- **Decisión:** a diferencia de la v4.0 (donde quedó pendiente), en el esquema de v5 la tabla
  `estudiantes` **ya nace** con `apellido` y `carrera` (`lib/Schema.php`). No es deuda técnica
  heredada; se incluyó desde el diseño inicial de esta reescritura.

---

## 4. Autenticación: sesión PHP nativa, sin librerías

- **Decisión:** `lib/Auth.php` usa `$_SESSION` + `session_regenerate_id()` al login, sin
  paquete externo (no hay Composer en el proyecto).
- **Roles** (`administradores`): password con `password_hash()` (bcrypt), `must_change_password`
  obligatorio en el primer ingreso, recuperación por correo con token (`reset_token` hasheado
  con `sha256`, expira en 1 hora — `routes/auth/forgot.php` y `reset.php`).
- **Alumnos** (`estudiantes`): la clave es la **cédula en texto plano**, comparada directo
  (`$est['cedula'] !== trim($password)`), **sin hash**. Decisión explícita del usuario — ver
  `DUDAS_PENDIENTES.md` D-01. Los alumnos **no tienen** recuperación de contraseña por correo.
- Rate limiting de login: `RateLimit::comprobar('login', 12, 300)` — máx. 12 intentos / 5 min
  por IP (fail-open: si `storage/` no es escribible, no bloquea el login, solo pierde la
  protección temporalmente — ver punto 8).

---

## 5. Flujo de envío (grabación -> nivel CEFR)

```
video (webm, screen+camara+audio) -> Ffmpeg::extraerAudio() (exec, extrae a webm/opus)
  -> Groq::transcribir() (Whisper, GROQ, cURL)
  -> Groq::evaluar() (LLM, GROQ, cURL, exige JSON estricto con nivel_cefr/confianza/justificacion)
  -> Pdf::evaluacionProfesor() (con nota) -> storage
  -> INSERT evaluaciones_rendidas + intentos_evaluacion (candado 1 intento/periodo)
  -> Mailer::enviar() confirmacion al alumno (sin nota, best-effort)
```
- **PDF del alumno:** se genera al vuelo en `GET /api/submission/pdf` (sin nota) y **no se
  almacena** — solo el PDF de profesor (con nota) se guarda en `storage/{periodo}/pdf/`.
- **Niveles CEFR válidos:** `A1, A2.1, A2.2, B1` — el LLM se rechaza si devuelve otro valor
  (`Groq::evaluar()` lanza excepción).
- **Candado de 1 intento:** implementado desde el inicio en `routes/submission.php`
  (a diferencia de la v4.0, donde la tabla existía pero no se aplicaba la validación).

---

## 6. FFmpeg vía `exec()`, sin librerías PHP

- **Decisión:** `lib/Ffmpeg.php` llama al binario de sistema con `exec()` y `escapeshellarg()`,
  usando `FFMPEG_BIN` de `.env` (por defecto `ffmpeg`, resuelto por `PATH`).
- **Confirmado disponible en SiteGround** (Fase 0 de pruebas).
- **Importante para desarrollo local:** si el entorno local (ej. Windows) no tiene `ffmpeg` en
  el `PATH`, `submission.php` falla con 500 y el mensaje literal del sistema operativo
  ("no se reconoce como un comando..."). Solución: instalar ffmpeg y/o apuntar `FFMPEG_BIN` a
  la ruta absoluta del ejecutable.

---

## 7. Almacenamiento abstracto (Storage)

- **Decisión:** `StorageInterface` + `StorageFactory` seleccionan el driver por
  `STORAGE_DRIVER` en `.env`. Activo: `LocalStorage` (disco, fuera del web root). Preparado
  pero no activo: `OneDriveStorage` (stub, pendiente de registro de app en Entra ID / TI).
- La BD guarda una **clave lógica** (`{periodo}/videos/{usuario}.webm`), no una ruta física —
  cambiar de driver no requiere tocar la lógica de negocio.
- `LocalStorage` sanea la clave contra path traversal (`str_replace(['..', "\0"], ...)`).

---

## 8. Manejo de errores: nunca romper el contrato JSON

- **Problema encontrado en pruebas (Nivel 1):** un `Warning` de PHP (ej. `RateLimit.php`
  escribiendo en un `storage/tmp/ratelimit/` inexistente o sin permisos) se imprimía como HTML
  antes del JSON de `Response::ok()`, rompiendo el parseo en el frontend (login devolvía HTML
  en vez de JSON).
- **Decisión:** `bootstrap.php` registra un `set_error_handler` global (todo warning/notice se
  loguea con `error_log()`, nunca se imprime) y un `register_shutdown_function` que atrapa
  errores fatales y responde JSON 500 en vez de dejar que PHP imprima HTML crudo.
  `RateLimit.php` además es **fail-open**: si no puede leer/escribir su archivo de control,
  loguea el problema y deja pasar la request en vez de tumbarla.

---

## 9. Colisión de rutas `/api/config` vs `api/config.php`

- **Problema encontrado en pruebas (Nivel 1):** `GET /api/config` devolvía 403 en SiteGround.
  Causa: `Options +MultiViews` de Apache resolvía la petición sin extensión `/api/config` hacia
  el archivo físico `api/config.php` (el cargador de `.env`), que el `.htaccess` bloquea a
  propósito (`FilesMatch "^(config|bootstrap)\.php$"`).
- **Decisión:** agregar `Options -MultiViews` en `public_html/api/.htaccess` para que Apache no
  intente resolver por content-negotiation y el rewrite a `index.php` (que sí sabe distinguir
  la ruta `/api/config` del archivo `config.php`) sea el único camino.

---

## 10. Correo (SMTP) sin librerías externas

- **Decisión:** `lib/Mailer.php` implementa SMTP mínimo por `fsockopen` + `AUTH LOGIN` (soporta
  465/SSL directo y 587/STARTTLS), sin PHPMailer ni Composer.
- Cuenta institucional prevista: `speakingtest@itsjapon.edu.ec`. Aún sin probar contra servidor
  real (ver `DUDAS_PENDIENTES.md` D-07).
- Uso: confirmación de envío al alumno (sin nota) y recuperación de contraseña de roles.

---

## 11. Generación de PDF sin dependencias

- **Decisión:** `lib/Pdf.php` construye el PDF a mano (objetos PDF 1.4, fuente Helvetica core),
  sin librerías como pdfmake o mPDF, para no depender de Composer/extensiones extra en
  SiteGround. Suficiente para constancias de texto; no soporta imágenes ni maquetado complejo.
- Dos documentos: `constanciaAlumno()` (sin nota) y `evaluacionProfesor()` (con nota CEFR).

---

## 12. GROQ: modelo y costos

- **Transcripción:** `whisper-large-v3-turbo`.
- **Evaluación LLM:** `GROQ_MODEL` en `.env`, actualmente `openai/gpt-oss-120b`.
- Igual que en v4.0: mantener free tier hasta cerrar pruebas, cambiar a plan de pago antes de
  producción real (ver `PENDIENTES_PRODUCCION.md`).

---

## 13. Reglas de seguridad y confirmación

- Ninguna decisión que afecte seguridad se toma sin confirmar con el usuario primero; las
  dudas se acumulan en `docs/DUDAS_PENDIENTES.md` y se resuelven al cierre del proyecto.
- Toda variable importante (API keys, correos, modelos, rutas) vive en `.env`, nunca hardcodeada.
