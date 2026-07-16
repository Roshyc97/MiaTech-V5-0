# Pendientes para producción — MiaTech v5.0 (PHP)

## Estado actual
- **Fase:** Pruebas de funcionamiento por niveles (ver `CHECKLIST_PRUEBAS.md`)
- **Deploy real:** SiteGround (`institutoj20.sg-host.com`), sin Render
- **GROQ:** free tier (mantener hasta finalizar pruebas), modelo `openai/gpt-oss-120b`
- **Fecha documento:** 2026-07-14 (reescrito; la versión anterior describía la v4.0 Node/Express)

---

## 🟢 Resuelto recientemente

### FFmpeg no encontrado en entorno local (Windows)
`Ffmpeg::extraerAudio()` fallaba con "'ffmpeg' no se reconoce como un comando..." al no estar
instalado/en el PATH del entorno de pruebas local. Solución: instalar ffmpeg y agregarlo al
PATH (o apuntar `FFMPEG_BIN` a la ruta absoluta en `.env`). Confirmado: la evaluación completa
corre correctamente en local tras el fix.

### Colisión `/api/config` → 403 (Nivel 1)
Apache resolvía `/api/config` hacia el archivo físico `api/config.php` vía `MultiViews`,
disparando el bloqueo de `.htaccess`. **Aplicado:** `Options -MultiViews` agregado en
`public_html/api/.htaccess`.

### Dashboard: import CSV y varios endpoints faltantes en `routes/admin/dispatch.php` (Nivel 1)
El frontend (`estudiantes.js`, `docentes.js`, `periodos.js`, reutilizado de v4.0) llama a varios
endpoints que el router PHP no tenía: import CSV apuntaba a `importar-masivo` y el backend solo
tenía `importar` (404); no existía `GET /api/admin/estudiantes/{id}` (necesario para el modal de
edición) ni `GET /api/admin/estudiantes/{id}/intentos` (badge de intentos); las listas de
estudiantes/docentes/períodos ignoraban `page`, `limit`, `search` y `filtro` (paginación y filtro
de estado no funcionaban); no existía `GET /api/admin/periodos/{id}/evaluaciones` (clic en una
fila de período daba 404). **Aplicado:** los 5 endpoints/parámetros se agregaron en
`dispatch.php`, alineados con lo que el frontend ya espera.

**Resuelto:** se agregó la sección "Administrators" al dashboard (solo visible para rol `ti`):
`public_html/js/admin-sections/administradores.js` + entrada de menú + modal de creación. Permite
listar, crear administradores y activar/desactivar — no permite editar nombre/rol ni borrar,
porque el backend (`dispatch.php`) tampoco lo soporta (solo GET, POST y PATCH .../estado).

### Warning de `RateLimit.php` rompiendo el JSON de login (Nivel 1)
Si `storage/tmp/ratelimit/` no existía o no era escribible, un `Warning` de PHP se imprimía
antes del JSON de respuesta (el frontend recibía HTML en vez de JSON). **Aplicado:**
`RateLimit.php` ahora es fail-open (try/catch, loguea con `error_log()` y no bloquea la
request), y `bootstrap.php` registra un `set_error_handler` + `register_shutdown_function`
globales para que ningún warning/error fatal vuelva a filtrarse crudo en la salida.

---

## 🔴 Pendiente: completar `CHECKLIST_PRUEBAS.md` por niveles

- **Nivel 1** (sin claves): falta terminar de validar dashboard completo (CRUD estudiantes/
  docentes/períodos, permisos por rol, carga CSV) con los 2 fixes de arriba ya aplicados.
- **Nivel 2** (con GROQ): validado el flujo de envío en local; falta confirmar en el checklist
  candado de 1 intento, descarga de PDF profesor, y que el video+PDF queden bien en `storage/`.
- **Nivel 3** (SMTP): sin probar — requiere `SMTP_HOST`/`SMTP_PASSWORD` reales
  (`speakingtest@itsjapon.edu.ec`). Confirmar puerto (587 STARTTLS o 465 SSL) y que el correo no
  caiga en spam.

### Prioridad
🔴 **Alta** — bloquea la subida a SiteGround hasta completar Nivel 1 y 2 en el checklist.

---

## 🔴 PENDIENTE: GROQ — cambiar a cuenta de pago

### Problema actual
- Free tier limitado a 9,000 tokens/minuto.
- Estimado ~100 evaluaciones en 2 días = picos de 5-10 videos/minuto → riesgo de rate limit.

### Costo estimado
```
100 evaluaciones (4 min c/u): ~$0.20-0.35 USD (cifra original calculada con otro modelo;
revisar consumo real de openai/gpt-oss-120b en la consola de GROQ antes de confirmar)
```

### Pasos
1. https://console.groq.com → Billing → Add payment method.
2. Copiar nueva API key y actualizar `GROQ_API_KEY` en `.env` de producción.
3. Establecer límite mensual (sugerido $5 USD) por seguridad.

### Prioridad
🔴 **Alta** — antes de producción real (no bloquea seguir probando en Nivel 2 con la key actual).

---

## 🟡 PENDIENTE: Rate limiting — umbrales definitivos

`RateLimit.php` ya está implementado (login: 12/5min, forgot: 6/10min, ambos por IP) y ahora
fail-open. Falta decisión de negocio: ¿son estos umbrales suficientes, o hace falta rate
limiting también en `/api/submission` para evitar abuso de GROQ? Ver `DUDAS_PENDIENTES.md` D-04.

### Prioridad
🟡 Media — confirmar antes de producción real con estudiantes.

---

## 🟡 PENDIENTE: Endurecer cabeceras / CSP en producción

`bootstrap.php` ya agrega `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
Falta evaluar `Content-Security-Policy` estricta y HSTS antes del cierre (ver
`DUDAS_PENDIENTES.md` D-08).

### Prioridad
🟡 Media — antes de producción real.

---

## 📌 Checklist antes de subir a SiteGround (resumen operativo)

Ver `docs/DESPLIEGUE.md` para el detalle completo del reparto de carpetas. Resumen:

- [ ] Completar Nivel 1 y Nivel 2 de `CHECKLIST_PRUEBAS.md` en local (con los 2 fixes ya aplicados)
- [ ] `public_html/` al web root; `storage/`, `tools/`, `.env` **un nivel arriba** (no dentro de public_html)
- [ ] BD MySQL creada en Site Tools; `.env` con `DB_DRIVER=mysql` y credenciales reales
- [ ] `php tools/migrate.php --seed` ejecutado (o sin `--seed` si ya hay usuarios reales)
- [ ] `.env`: `APP_ENV=production`, `APP_DEBUG=false`, `GROQ_API_KEY` real, `SMTP_*` reales
- [ ] Imágenes de evaluación subidas a `public_html/img/imagenes/`
- [ ] SSL activo (confirmado en Fase 0, pero verificar de nuevo tras redeploy)
- [ ] Nivel 3 (SMTP) probado con servidor real
- [ ] GROQ cambiado a plan de pago con límite mensual
- [ ] Cron de limpieza de `storage/tmp/` (video/audio temporales + rate limit)
- [ ] Dudas de seguridad de `DUDAS_PENDIENTES.md` resueltas o conscientemente aceptadas
- [ ] Usuarios de prueba (seed) eliminados antes de producción real; usuarios reales creados

---

## 📁 Documentos relacionados

- `PROYECTO_CONTEXTO.md` — visión general del backend PHP real
- `DECISIONES_IMPORTANTES.md` — decisiones de diseño y fixes aplicados
- `VARIABLES_FUNCIONAMIENTO.md` — `.env`, esquema BD, endpoints reales
- `CHECKLIST_PRUEBAS.md` — plan de pruebas por niveles (0 a 3)
- `DESPLIEGUE.md` — pasos de subida a SiteGround
- `DUDAS_PENDIENTES.md` — dudas de seguridad abiertas, a resolver al cierre

---

## 📝 Última actualización

**Fecha:** 2026-07-14
**Próxima revisión:** al terminar Nivel 2 completo del checklist, antes de probar Nivel 3 (SMTP)
