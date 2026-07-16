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

### D-07 · Prueba en vivo de SMTP
El envio de correo (Mailer, fsockopen+AUTH LOGIN) no se pudo probar en sandbox. Verificar con
`speakingtest@itsjapon.edu.ec`: puerto (465/587), STARTTLS, y que el correo no caiga en spam.

### D-08 · Endurecer cabeceras/CSP en produccion
Se agregaron X-Content-Type-Options, X-Frame-Options, Referrer-Policy. Evaluar Content-Security-Policy
estricta y HSTS al cerrar el proyecto.
