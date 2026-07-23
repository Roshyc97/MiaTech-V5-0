# Post-Despliegue: Checklist de verificación

**Verificaciones DESPUÉS de subir a SiteGround**

Use este checklist para confirmar que todo funciona correctamente.

---

## 🟢 Nivel 0: El servidor responde

### Health check (servidor vivo)

```bash
curl https://institutoj20.sg-host.com/api/health
```

**Esperado:**
```json
{
  "ok": true,
  "php": "8.x.x",
  "ffmpeg": {
    "disponible": true,
    "version": "..."
  },
  "bd": {
    "ok": true,
    "driver": "mysql"
  }
}
```

**Verificación:**

- [ ] `ok: true` (servidor responde)
- [ ] `php: 8.x` o superior (versión OK)
- [ ] `ffmpeg.disponible: true` (ffmpeg disponible)
- [ ] `bd.ok: true` (base de datos conecta)
- [ ] `bd.driver: mysql` (usando MySQL, NO sqlite)

**Si falla algo:**
- [ ] `ok: false` → Ver `APP_DEBUG` error
- [ ] `bd.ok: false` → Revisar credenciales DB en `.env`
- [ ] `ffmpeg.disponible: false` → FFmpeg no instalado (raro en SiteGround)
- [ ] 500 error → Ver logs: `/home/customer/logs/.../error.log`

### Página principal carga

```bash
curl https://institutoj20.sg-host.com/
```

**Esperado:** HTML del frontend (sin errores 404 o 500)

- [ ] Página carga sin errores
- [ ] No hay 404 (archivo no encontrado)
- [ ] No hay 500 (error del servidor)

---

## 🟢 Nivel 1: Sin claves externas (auth + dashboard)

### Login de rol (administrador)

```bash
curl -X POST https://institutoj20.sg-host.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "admin.ti@itsjapon.edu.ec",
    "clave": "admin1234"
  }'
```

**Esperado (si ejecutaste `--seed`):**
```json
{
  "ok": true,
  "usuario": {
    "id": 1,
    "correo": "admin.ti@itsjapon.edu.ec",
    "nombre": "Admin",
    "rol": "ti",
    "tipo": "admin"
  },
  "must_change_password": true
}
```

- [ ] Login funciona
- [ ] `ok: true`
- [ ] `must_change_password: true` (debe cambiar contraseña en primer ingreso)
- [ ] Rol es correcto (`ti`, `coordinador`, o `docente`)

**Si falla:**
- [ ] 401 → Usuario no existe o contraseña incorrecta
- [ ] 500 → Ver logs
- [ ] JSON está vacío → Ver `.env`, verificar `.env.production` edición

### Cambio de contraseña (primer ingreso)

```bash
# 1. Login (del paso anterior)
# 2. Cambiar contraseña
curl -X POST https://institutoj20.sg-host.com/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=..." \
  -d '{
    "clave_actual": "admin1234",
    "clave_nueva": "NuevaContraseña123!",
    "clave_confirmacion": "NuevaContraseña123!"
  }'
```

**Esperado:**
```json
{
  "ok": true,
  "mensaje": "Contraseña cambiada exitosamente"
}
```

- [ ] Cambio de contraseña funciona
- [ ] Puede hacer login con la nueva contraseña

### Login de alumno

```bash
curl -X POST https://institutoj20.sg-host.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "cavasconezp@itsjapon.edu.ec",
    "clave": "1712345678"
  }'
```

**Esperado (si ejecutaste `--seed`):**
```json
{
  "ok": true,
  "usuario": {
    "id": 1,
    "correo": "cavasconezp@itsjapon.edu.ec",
    "nombre": "Cristian",
    "apellido": "Avasconez",
    "carrera": "Ingeniería en Sistemas",
    "cedula": "1712345678",
    "tipo": "estudiante"
  }
}
```

- [ ] Login de alumno funciona
- [ ] `ok: true`
- [ ] Usuario contiene datos esperados
- [ ] `tipo: estudiante` (no admin)

### Acceso a dashboard

1. Abrir navegador: `https://institutoj20.sg-host.com/admin-login.html`
2. Login con usuario de prueba (admin.ti / nueva_contraseña)

- [ ] Página dashboard carga sin errores
- [ ] Puede ver estadísticas
- [ ] Puede ver listado de estudiantes
- [ ] Puede ver listado de docentes

---

## 🟢 Nivel 2: Con GROQ (evaluación completa)

### Probar grabación + evaluación

1. Abrir `https://institutoj20.sg-host.com/`
2. Iniciar prueba, hacer login con alumno (cavasconezp / 1712345678)
3. Aceptar consentimiento
4. Ver imagen aleatoria
5. Grabar video (hablar en inglés, 60+ segundos)
6. Hacer clic en "Submit"

**Esperado:**
```json
{
  "ok": true,
  "resultado_cefr": "A1" | "A2.1" | "A2.2" | "B1",
  "transcripcion": "...",
  "justificacion": "...",
  "mensaje": "Evaluación completada"
}
```

- [ ] Grabación funciona (se guarda audio)
- [ ] Evaluación procesa (GROQ responde)
- [ ] Resultado CEFR es válido (A1, A2.1, A2.2, B1)
- [ ] Transcripción incluida
- [ ] Justificación incluida

**Si falla:**
- [ ] `ok: false` con error GROQ → Verificar `GROQ_API_KEY` en `.env`
- [ ] Error de rate limit → GROQ free tier saturado, cambiar a plan pago
- [ ] Timeout → GROQ tardando mucho (normal, puede tardar 30+ segundos)

### Descargar PDF del alumno

```bash
# Después de una evaluación exitosa:
curl https://institutoj20.sg-host.com/api/submission/pdf \
  -H "Cookie: PHPSESSID=..." \
  -o diploma_alumno.pdf
```

**Esperado:**
- [ ] PDF se descarga
- [ ] PDF contiene datos del alumno
- [ ] PDF muestra "Constancia" (SIN calificación, por privacidad)

### Descargar PDF del profesor

```bash
# Como usuario con rol:
curl https://institutoj20.sg-host.com/api/submission/pdf/cavasconezp/profesor \
  -H "Cookie: PHPSESSID=..." \
  -o reporte_profesor.pdf
```

**Esperado:**
- [ ] PDF se descarga
- [ ] PDF contiene datos del alumno
- [ ] PDF muestra nivel CEFR obtenido
- [ ] PDF muestra evaluación detallada

### Verificar almacenamiento

- [ ] Archivos en `storage/2025B/videos/`:
  ```bash
  ls -la /home/customer/www/institutoj20.sg-host.com/storage/2025B/videos/
  # Debe mostrar archivos .mp4
  ```

- [ ] Archivos en `storage/2025B/pdf/`:
  ```bash
  ls -la /home/customer/www/institutoj20.sg-host.com/storage/2025B/pdf/
  # Debe mostrar archivos .pdf (reportes profesor)
  ```

- [ ] Archivos no son accesibles directamente por web:
  ```bash
  curl https://institutoj20.sg-host.com/storage/2025B/videos/test.mp4
  # Debe devolver 404 o 403 (no se deben descargar directo)
  ```

### Probar candado de 1 intento

1. Alumno intenta grabar y enviar 2ª vez en el MISMO período
2. Esperado: **403 Forbidden** (bloqueado)

```bash
# Intento 2 del mismo alumno:
curl -X POST https://institutoj20.sg-host.com/api/submission \
  -H "Cookie: PHPSESSID=..." \
  -F video=@video.mp4
# Debe devolver: { "ok": false, "error": "Ya tienes una evaluación..." }
```

- [ ] Candado funciona
- [ ] Se bloquea segundo intento
- [ ] Mensaje es claro

---

## 🟢 Nivel 3: Con SMTP (correos)

### Probar confirmación de envío

1. Alumno envía evaluación (Nivel 2)
2. Esperar 5-10 segundos

**Esperado:** Correo de confirmación llega a:
- [ ] Bandeja de entrada
- [ ] Asunto: "MiaTech - Evaluación completada" (o similar)
- [ ] Contiene: "Tu evaluación fue recibida"
- [ ] NO contiene: Calificación (privacidad)

**Si no llega:**
- [ ] Ver logs: `/home/customer/logs/.../error.log`
- [ ] Verificar SMTP_HOST, SMTP_PASSWORD en `.env`
- [ ] Revisar carpeta de spam
- [ ] Probar puerto SMTP (587 vs 465)

### Probar recuperación de contraseña

```bash
curl -X POST https://institutoj20.sg-host.com/api/auth/forgot \
  -H "Content-Type: application/json" \
  -d '{"correo": "coordinador.idiomas@itsjapon.edu.ec"}'
```

**Esperado:**
```json
{
  "ok": true,
  "mensaje": "Correo de recuperación enviado"
}
```

- [ ] Respuesta OK
- [ ] Correo de recuperación llega
- [ ] Correo contiene enlace con token
- [ ] Enlace funciona: abre `/recuperar.html?token=...`

### Verificar reset de contraseña

1. Abrir enlace de recuperación del correo
2. Poner nueva contraseña
3. Submit

- [ ] Reset funciona
- [ ] Puede hacer login con nueva contraseña
- [ ] Token no se reutiliza (segundo intento falla)

---

## 🔐 Nivel 4: Seguridad

### Verificar que `.env` está protegido

```bash
ls -la /home/customer/www/institutoj20.sg-host.com/.env
# Debe mostrar: -rw------- (permisos 600)
```

- [ ] `.env` no es accesible por web:
  ```bash
  curl https://institutoj20.sg-host.com/.env
  # Debe devolver 403 o error (NO mostrar contenido)
  ```

### Verificar que `storage/` no es accesible por web

- [ ] Intentar acceder directamente:
  ```bash
  curl https://institutoj20.sg-host.com/storage/2025B/videos/test.mp4
  # Debe devolver 404 o error (NO descargar archivo)
  ```

### Verificar headers de seguridad

```bash
curl -I https://institutoj20.sg-host.com/api/health
```

**Debe incluir:**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Strict-Transport-Security` (HSTS)

### Verificar que APP_DEBUG=false

```bash
# Intentar error en la app:
curl https://institutoj20.sg-host.com/api/badendpoint

# Debe devolver:
# { "error": "Ruta no encontrada" } (genérico)
# NO debe mostrar stack trace o archivos internos
```

- [ ] Errores son genéricos (no exponen rutas)
- [ ] No hay información sensible en errores

---

## 📊 Performance (opcional)

### Tiempo de respuesta

```bash
# Medir tiempo de respuesta:
time curl https://institutoj20.sg-host.com/api/health
```

**Esperado:**
- [ ] `< 500ms` para salud
- [ ] `< 1s` para login
- [ ] `< 30s` para evaluación GROQ (puede ser lento)

---

## 📋 Checklist de finalización

### Si TODO pasó

- [ ] Nivel 0 (servidor vivo): ✅ PASS
- [ ] Nivel 1 (auth + dashboard): ✅ PASS
- [ ] Nivel 2 (GROQ completo): ✅ PASS
- [ ] Nivel 3 (SMTP correos): ✅ PASS
- [ ] Nivel 4 (seguridad): ✅ PASS

**RESULTADO: ✅ DESPLIEGUE EXITOSO**

→ Proceder a tareas finales (limpiar datos de prueba, monitoreo)

### Si algo falló

- [ ] Anotar qué falló
- [ ] Revisar sección "Troubleshooting" en README.md
- [ ] Ajustar `.env` o configuración
- [ ] Repetir test que falló

---

## 🧹 Tareas finales (recomendadas)

### Antes de usuarios reales

- [ ] Eliminar datos de prueba (si no los necesitas):
  ```bash
  mysql -u miatech_user -p
  USE miatech_bd;
  DELETE FROM administradores WHERE correo LIKE '%itsjapon%' AND correo != 'your_email@...';
  DELETE FROM estudiantes;
  ```

- [ ] Crear usuario real (admin):
  ```php
  // Usar comando o hacer desde dashboard
  ```

- [ ] Configurar cron de limpieza de temporales:
  ```
  SiteGround → Cron Jobs:
  Comando: find /home/customer/www/institutoj20.sg-host.com/storage/tmp -type f -mmin +120 -delete
  Frecuencia: Cada hora
  ```

- [ ] Configurar backups automáticos (SiteGround lo hace)

- [ ] Monitorear logs:
  ```bash
  tail -f /home/customer/logs/institutoj20.sg-host.com/error.log
  ```

---

## 📝 Notas post-despliegue

```
Fecha de despliegue:        _________________
Versión PHP:                _________________
Versión MySQL:              _________________
Clave GROQ plan:            _________________
Correo SMTP probado:        _________________

Observaciones:
____________________________________________
____________________________________________
____________________________________________
```

---

## 📞 Contacto rápido

Si algo no funciona:
- [ ] Ver logs: `/home/customer/logs/.../error.log`
- [ ] Verificar `.env`: `cat /home/customer/www/institutoj20.sg-host.com/.env`
- [ ] Probar `/api/health`
- [ ] Leer esta guía de atrás a adelante

---

**Despliegue completado:** ✅

**Fecha:** _________________

**Responsable:** _________________
