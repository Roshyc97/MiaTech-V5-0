# Repositorio de dudas — a resolver al final

Dudas (principalmente de seguridad) que surgieron durante el desarrollo y que se dejaron
pendientes deliberadamente para no bloquear el avance. Se revisan al cerrar el proyecto.

> Regla acordada: NO tomar decisiones que afecten a la seguridad sin confirmar. Aquí se acumulan.

## Abiertas

### D-01 · Contraseña de alumno en texto plano
La clave del alumno es su cédula/ID, sin hash y visible en el dashboard (decisión del usuario).
Implicación: cualquier persona con acceso al dashboard o a la BD ve las cédulas. Aceptado por ahora.
Pendiente confirmar al final: ¿restringir qué roles pueden ver la columna de clave?

### D-02 · Almacenamiento de tokens de recuperación
Los tokens de recuperación de contraseña (roles) se guardan hasheados en BD con expiración.
Confirmar al final: duración del token (por defecto 60 min) y política de un solo uso.

### D-03 · Endpoint de inicialización de BD
La migración/seed se ejecuta por CLI. Si se necesita disparar por web en SiteGround (sin SSH),
haría falta un endpoint protegido con token de setup. Pendiente decidir si se habilita y cómo se protege.

### D-04 · Rate limiting
Aún sin definir umbrales (intentos de login, envíos). Se implementa en Fase 9; confirmar límites.

### D-05 · Secret de sesión / cookies
Confirmar flags de cookie de sesión en producción (Secure, SameSite) y rotación de SESSION.

## Resueltas
(vacío)

### D-06 · Prueba en vivo de GROQ (Whisper + LLM)
El pipeline (video→ffmpeg→audio→GROQ) quedó verificado hasta la llamada a GROQ; falta correr
una evaluacion real con `GROQ_API_KEY` de pago. Confirmar tambien limites de tamano de audio de la API.

### D-07 · Prueba en vivo de SMTP  → PARCIALMENTE RESUELTA (2026-07-23)
El envio de correo (Mailer, fsockopen+AUTH LOGIN) quedó **probado y funcional** en SiteGround
usando una cuenta Gmail personal (STARTTLS/587, app password). Confirmado el flujo real:
confirmacion de envio al alumno y recuperacion de contrasena de roles.
Pendiente: migrar al correo institucional `speakingtest@itsjapon.edu.ec` (ver D-10).

### D-08 · Endurecer cabeceras/CSP en produccion
Se agregaron X-Content-Type-Options, X-Frame-Options, Referrer-Policy. Evaluar Content-Security-Policy
estricta y HSTS al cerrar el proyecto.

### D-09 · Contraseña temporal de recuperación viaja en el correo
El flujo de recuperacion de roles envia una **contrasena temporal en texto** dentro del correo
(decision del usuario, 2026-07-23). Mitigacion aplicada: caducidad de 1 hora, un solo uso, y
cambio obligatorio al ingresar (must_change_password=1 -> "Pending"). La contrasena original
no se altera hasta que la temporal se usa.
Confirmar al final: ¿es aceptable el riesgo o se migra al flujo de enlace de un solo uso
(ya existe `recuperar.html` + tokens) que no expone ninguna clave en el correo?

### D-10 · Remitente SMTP temporal = Gmail personal
Mientras TI no habilite **SMTP AUTH** en el buzon `speakingtest@itsjapon.edu.ec` (Microsoft 365
lo bloquea por defecto a nivel de tenant: error `535 SmtpClientAuthentication is disabled`),
se usa temporalmente un Gmail personal como remitente. El cambio al correo oficial es SOLO en
`.env` (SMTP_HOST/PORT/USER/PASSWORD/FROM), sin tocar codigo.
Pendiente: (a) que TI active SMTP AUTH en el buzon institucional (o usar Graph API/servicio
transaccional si se niegan); (b) rotar/retirar las credenciales personales al migrar.
Nota: durante el diagnostico se compartio una contrasena en el chat; conviene rotarla.

### D-11 · Retirar `smtptest.php` de produccion
Se creo `public_html/smtptest.php` (protegido con `?key=`) para diagnosticar SMTP por navegador.
Es un archivo temporal de diagnostico: **borrarlo del servidor** una vez cerradas las pruebas
de correo. No debe quedar en produccion.
