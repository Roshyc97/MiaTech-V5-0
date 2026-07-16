# Checklist de pruebas de funcionamiento — MiaTech v5 (PHP)

Se prueba por niveles. Cada nivel agrega dependencias. Si un nivel falla, no sigas al siguiente.

## Usuarios de prueba (cargados con `php tools/migrate.php --seed`)

**Roles** (en el primer ingreso se les pide cambiar la contrasena, `must_change_password=1`):

| Correo | Clave inicial | Rol |
|---|---|---|
| admin.ti@itsjapon.edu.ec | admin1234 | TI |
| coordinador.idiomas@itsjapon.edu.ec | coord1234 | coordinador |
| docente.ingles@itsjapon.edu.ec | docente1234 | docente |

**Alumnos** (la clave es la cedula):

| Correo | Clave (cedula) |
|---|---|
| cavasconezp@itsjapon.edu.ec | 1712345678 |
| malopezg@itsjapon.edu.ec | 1723456789 |
| (hay 10 en total, ver seed) | |

---

## Pre-requisitos (una sola vez)

- [ ] `public_html/` subido al `public_html` de SiteGround; `storage/`, `tools/`, `.env` un nivel arriba
- [ ] `.env` completado (DB_*, y para niveles 2-3: GROQ_API_KEY, SMTP_*)
- [ ] BD MySQL creada en Site Tools
- [ ] Migracion ejecutada: `php tools/migrate.php --seed`
- [ ] Imagenes en `public_html/img/imagenes/`
- [ ] SSL activo (HTTPS)

---

## Nivel 0 — El servidor responde

- [ ] Abrir `https://institutoj20.sg-host.com/api/health`
      Esperado: JSON con `ok:true`, `php` 8.x, `ffmpeg.disponible:true`, `bd.ok:true` y `bd.driver:mysql`.
      Si `bd.ok:false` -> revisar DB_* en `.env`. Si 500 en blanco -> poner `APP_DEBUG=true`.
- [ ] Abrir `https://institutoj20.sg-host.com/` -> carga la pagina principal (frontend).

---

## Nivel 1 — Sin claves externas (auth + dashboard + flujo alumno)

### Login de roles y cambio de contrasena
- [ ] Ir a `/admin-login.html`, entrar con `admin.ti / admin1234`.
- [ ] Debe **pedir cambiar la contrasena** (primer ingreso). Cambiarla (min 8 caracteres).
- [ ] Cerrar sesion y volver a entrar con la **nueva** contrasena -> OK.

### Dashboard
- [ ] Ver estadisticas (totales y por nivel CEFR).
- [ ] Estudiantes: ver el listado con nombre, apellido, clave (cedula), periodo, consentimiento (si/no), nivel, accesos.
- [ ] Crear, editar y desactivar un estudiante.
- [ ] Crear/editar un periodo y un docente.
- [ ] Como TI: crear un administrador nuevo con rol.
- [ ] (Opcional) Carga masiva CSV: `POST /api/admin/estudiantes/importar` con columnas `correo,nombre,apellido,carrera,cedula` + `periodo_id`.
- [ ] Probar permisos: entrar como `docente.ingles` y confirmar que NO puede crear administradores.

### Flujo del alumno (hasta la grabacion)
- [ ] En `/`, iniciar el test, hacer login con `cavasconezp / 1712345678`.
- [ ] Ver instrucciones, aceptar consentimiento (debe registrarse; verificar en dashboard).
- [ ] Ver imagen aleatoria y que el avatar hable (TTS) y anime (gif).
- [ ] Grabar pantalla+camara y verificar la re-grabacion (1 vez).

> En este nivel el "Submit" fallara en la transcripcion si aun no cargaste GROQ_API_KEY. Es lo esperado.

---

## Nivel 2 — Con GROQ (envio completo)

Requiere `GROQ_API_KEY` en `.env` (recomendado plan de pago).

- [ ] Completar una grabacion y pulsar **Submit**.
      Esperado: procesa (audio -> Whisper -> LLM), responde OK y muestra confirmacion **sin nota**.
- [ ] Descargar el PDF del alumno (`/api/submission/pdf`) -> constancia **sin calificacion**.
- [ ] En el dashboard, el alumno aparece con **nivel** obtenido.
- [ ] Intentar un **segundo envio** con el mismo alumno -> **bloqueado** (candado 1 intento, 403).
- [ ] Como rol, descargar el PDF de profesor `/api/submission/pdf/{usuario}/profesor` -> **con** nivel CEFR.
- [ ] Verificar que el video y el PDF de profesor quedaron en `storage/` (video + reporte).

---

## Nivel 3 — Con SMTP (correos)

Requiere `SMTP_HOST` y `SMTP_PASSWORD` en `.env`.

- [ ] Tras un envio, el alumno recibe **correo de confirmacion** (sin nota).
- [ ] Recuperacion de contrasena de rol: en `/admin-login.html` pedir recuperar con `coordinador.idiomas@itsjapon.edu.ec`.
- [ ] Llega correo con enlace a `/recuperar.html?token=...` -> abrirlo, poner nueva clave, y entrar con ella.
- [ ] Confirmar que un **alumno** NO puede recuperar contrasena (solo roles).

---

## Troubleshooting rapido

- **500 en blanco** -> `APP_DEBUG=true` en `.env` para ver el error.
- **`bd.ok:false`** -> DB_NAME/DB_USER/DB_PASSWORD o permisos del usuario MySQL.
- **Login siempre 401** -> ¿corriste `migrate --seed`? ¿correo en minusculas?
- **Camara/microfono no arrancan** -> falta HTTPS (SSL).
- **Submit: "GROQ_API_KEY no configurada"** -> falta la clave en `.env` (Nivel 2).
- **No llegan correos** -> revisar SMTP_HOST/puerto (587 STARTTLS o 465 SSL) y que TI habilito el envio.
- **Rutas /api/... dan 404 de SiteGround** -> revisar que el `.htaccess` de `public_html/api/` subio (archivos ocultos).
