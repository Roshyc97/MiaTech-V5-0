# Checklist Ejecutivo: Flujo de Evaluación — MiaTech v5 (PHP)

**Fecha:** 2026-07-15  
**Nivel:** 1 (Sin claves externas — validación estructura + permisos)  
**Uso:** Barrido sección por sección durante pruebas en navegador

---

## 🏠 SECCIÓN 1: HOME

### Validaciones
- [ ] Página carga sin errores (F12 → Console vacía o warnings legítimos)
- [ ] Avatar visible y animado
- [ ] Barra progreso muestra step 1 activo
- [ ] Botón "Test Assessment" visible y clickeable

### API Calls
- [ ] `GET /api/config` → responde 200 con JSON (no 403)
  - Verificar respuesta contiene `minDuration`, `maxDuration`, `taskText`

### Navegación
- [ ] Clic en "Test Assessment" → avanza a HOME-section desaparece, aparece student-info-section
- [ ] Progress bar actualiza a step 2

---

## 🔐 SECCIÓN 2: LOGIN

### Formulario
- [ ] Input correo visible (placeholder: `username@itsjapon.edu.ec`)
- [ ] Input cédula visible (tipo: password, placeholder: `Enter your ID number`)
- [ ] Botón "Continue" visible y habilitado

### Credenciales Válidas
- [ ] Ingresar: `cavasconezp@itsjapon.edu.ec` / `1712345678` (cédula)
- [ ] Clic "Continue" → spinner muestra "Verifying..."
- [ ] `POST /api/auth/login` → responde 200
  - Verificar response: `{ tipo: "estudiante", nombre: "..." }`
- [ ] Avanza a instructions-section
- [ ] Progress bar: step 2 completed, step 3 active

### Credenciales Inválidas
- [ ] Ingresar correo que no existe → error: "Credenciales incorrectas"
- [ ] Ingresar cédula incorrecta → error: "Credenciales incorrectas"
- [ ] Permanece en login, correo/cédula se limpian

### Rate Limiting
- [ ] Intentar login 12+ veces en 5 min (mismo navegador/IP) → validar error después de 12
  - Nota: Si no se controla el rate limit en test, puede quedar bloqueado — esperar 5 min o cambiar VPN/navegador

### Auditoría
- [ ] Abrir admin-dashboard → Audit Log (si existe) → verificar login registrado
- [ ] Verificar `intentos_login` en BD con `exito=1` y correo/IP del estudiante

---

## 📖 SECCIÓN 3: INSTRUCTIONS

### Contenido
- [ ] Título: "Assessment Instructions"
- [ ] Nombre del estudiante personalizado ("Hello [NOMBRE]!")
  - Verificar que se inyecta desde BD (State.usuarioData.nombre)
- [ ] Instrucciones legibles (guía plataforma, controles explicados)
- [ ] Iconos/placeholders de cámara, micrófono, submit

### Botón
- [ ] Botón "Start Assessment" visible y clickeable
- [ ] Clic → abre modal de consentimiento (overlay oscuro aparece)

---

## ✅ SECCIÓN 4: CONSENTIMIENTO (Modal)

### Contenido
- [ ] Texto consentimiento visible (párrafos sobre grabación, IA, almacenamiento)
- [ ] Checkbox de aceptación visible con label
- [ ] Botones "Decline" y "I Accept & Continue" visibles

### Flujo Aceptación
- [ ] Clic "I Accept & Continue" sin marcar checkbox → error: "You must accept the terms to continue."
- [ ] Marcar checkbox
- [ ] Clic "I Accept & Continue" → spinner: "Registering consent..."
- [ ] `POST /api/consentimiento` → responde 200
  - Payload esperado: `{ acepto: 1, texto_version: "v4.0-2026" }`
- [ ] Modal cierra
- [ ] Avanza a recording-section
- [ ] Progress bar: step 3 completed, step 4 active

### Flujo Rechazo
- [ ] Clic "Decline" → modal cierra
- [ ] Permanece en instructions-section (step 3)
- [ ] Puede intentar "Start Assessment" de nuevo

### Auditoría
- [ ] Verificar `consentimientos` en BD (estudiante_id, correo, acepto=1)

---

## 🎥 SECCIÓN 5: RECORDING (Grabación)

### Solicitud Permisos
- [ ] Clic en sección recording → navegador solicita permisos
  - 1. "Compartir pantalla" (share this tab)
  - 2. "Usar micrófono" (allow)
  - 3. "Usar cámara" (allow)
- [ ] Si rechaza cualquiera → error visible: "Debes permitir acceso a..."
- [ ] Si acepta todos → continúa

### Interfaz
- [ ] Imagen aleatoria cargada de `/api/imagen/aleatoria`
  - Verificar: imagen visible, no es placeholder por defecto
- [ ] Timer muestra "00:00"
- [ ] Timer requerido: "Required: 1–5 min"
- [ ] Botón micrófono visible (ícono de micrófono azul)
- [ ] Botón micrófono habilitado
- [ ] Preview de cámara (miniatura vivo en esquina)
- [ ] Texto transcripción: "Start speaking to see your transcription here..."

### Grabación
- [ ] Clic micrófono (inicio) → micrófono cambia ícono (onda animada roja)
- [ ] Timer comienza: 00:01, 00:02, ...
- [ ] Hablar → transcripción en vivo actualiza (si navegador soporta Web Speech API)
- [ ] Grabación continúa hasta 5 min (máximo)

### Timer
- [ ] Timer a 4:30 (30 seg antes de máximo) → cambia color (amarillo/naranja)
- [ ] Timer a 5:00 (máximo) → grabación para automáticamente
  - Verificar mensaje: "Maximum recording time reached. Your recording has been stopped automatically."

### Parada Grabación (< 5 min)
- [ ] Clic micrófono (parada) → onda animada desaparece, ícono micrófono vuelve normal
- [ ] Timer se congela (ej: 03:45)
- [ ] Validación duración: si < 1 min, aviso: "Your recording is too short..."

### Botones Post-Grabación
- [ ] Botón "Record Again" visible (si no se ha usado regrabación)
- [ ] Botón "Submit Response" habilitado (no más grisado)

### Re-grabación (1 oportunidad)
- [ ] Clic "Record Again" → modal advertencia:
  - Mensaje: "By restarting the recording, a new evaluation will be initiated..."
  - Opciones: "Cancel" y "Restart"
- [ ] Clic "Cancel" → modal cierra, permanece en recording con datos previos
- [ ] Clic "Restart" → modal cierra
  - [ ] Nueva imagen aleatoria cargada de `/api/imagen/aleatoria`
  - [ ] Timer resetea a 00:00
  - [ ] Botón micrófono habilitado
  - [ ] Botón "Record Again" desaparece (ya usada la regrabación)
- [ ] Intentar clic "Record Again" una 2ª vez → no aparece botón, o error si logra hacerlo

---

## 📤 SECCIÓN 6: SUBMISSION (Envío)

### Preparación
- [ ] Clic "Submit Response" → spinner: "Uploading and processing your recording..."
- [ ] Botón submit se deshabilita
- [ ] Botón "Record Again" se oculta

### Upload
- [ ] `POST /api/submission` (multipart/form-data)
  - Campos: `video` (blob .webm/.mp4), `imagen_id` (string)
  - Esperar respuesta del servidor

### Procesamiento Servidor (Nivel 1 sin GROQ)
- [ ] Si GROQ_API_KEY **NO configurada**:
  - Spinner puede tardar unos segundos (servidor procesa, luego error GROQ)
  - Respuesta esperada: 500 con `{ error: "Error procesando la evaluacion: GROQ_API_KEY..." }`
  - Frontend: error modal "Submission Error: GROQ_API_KEY no está configurada"
  - Botón submit se rehabilita
  - Botón "Record Again" reaparece (si no se usó regrabación)

- [ ] Si GROQ_API_KEY **sí configurada** (Nivel 2):
  - Spinner espera mientras procesa audio → transcripción → evaluación
  - Respuesta esperada: 200 con `{ ok: true, pdf_url: "/api/submission/pdf" }`

### Validaciones Servidor
- [ ] Si 2º intento (mismo alumno, mismo período):
  - Respuesta: 403 con `{ error: "Ya rendiste tu evaluacion..." }`
  - Botón submit se rehabilita

---

## ✅ SECCIÓN 7: RESULTS (Confirmación)

### (Solo si GROQ_API_KEY configurada — Nivel 2+)

### Contenido
- [ ] Título: "Assessment Submitted"
- [ ] Mensaje éxito: "✓ Your recording has been submitted successfully."
- [ ] Botón "Download Feedback (PDF)" visible
- [ ] Botón "Back to Home" visible

### Descarga PDF
- [ ] Clic "Download Feedback (PDF)" → `GET /api/submission/pdf`
  - Navegador abre PDF en nueva tab o descarga archivo
  - Nombre: `constancia_[usuario].pdf`
  - Contenido: constancia SIN calificación (solo justificación y transcripción)

### Retorno
- [ ] Clic "Back to Home" → `location.reload()`
  - Página recarga
  - Barra progreso reset a step 1
  - Puede intentar de nuevo o verificar en dashboard

### Auditoría
- [ ] Abrir admin-dashboard → Estudiantes → buscar estudiante
  - Verificar que aparece con `nivel` = resultado CEFR
  - Verificar que `accesos` o badge de intentos actualiza a 1

---

## 🔧 CHECKLIST TÉCNICO (Inspector Navegador)

### Pantalla LOGIN
```javascript
// En Console (F12), verificar que el formulario se construye:
$('student-form')  // Debe retornar <form> con inputs correo/cedula
$('login-correo')  // Input email
$('login-cedula')  // Input password (type=password)
```

### Pantalla RECORDING
```javascript
// Verificar State global:
State.videoBlob     // Después de grabar: Blob con datos video
State.imagenId      // ID imagen aleatoria
State.imagenSrc     // URL imagen (/img/imagenes/...)
State.segundos      // Contador de grabación
State.rerecordUsed   // false antes de regrabación, true después
```

### Network Tab (F12 → Network)
- [ ] Filtrar por "submission" (POST)
  - Verificar FormData: campos `video` (bytes) y `imagen_id` (string)
  - Verificar respuesta: 200 o 403 (candado)

### Console (F12 → Console)
- [ ] Buscar logs: `✅ Configuración cargada desde .env`
  - Si no aparece, `/api/config` falló
- [ ] Buscar logs: `✅ User data from DB`
  - Si no aparece, login falló
- [ ] Buscar warnings o errores rojos
  - RateLimit warnings (si no tiene try/catch en `file_put_contents`)

---

## ⚠️ ERRORES COMUNES A DETECTAR (Nivel 1)

### Colisión `/api/config` (Resuelto)
- ❌ **Síntoma:** `GET /api/config` → 403 Forbidden
- ✅ **Validación:** Debe retornar 200 con JSON
- ✅ **Fix:** `Options -MultiViews` en `api/.htaccess` (ya aplicado)

### Warnings RateLimit en JSON (Resuelto)
- ❌ **Síntoma:** Login responde HTML en vez de JSON (`<br />\n<b>...`)
- ✅ **Validación:** Respuesta siempre JSON válido
- ✅ **Fix:** RateLimit fail-open + handler global en `bootstrap.php` (ya aplicado)

### Endpoints faltantes en Dashboard (Resuelto)
- ❌ **Síntoma:** Admin-dashboard llama a endpoints que no existen (404)
  - `GET /api/admin/estudiantes/{id}`
  - `GET /api/admin/estudiantes/{id}/intentos`
  - `POST /api/admin/estudiantes/importar-masivo`
  - etc.
- ✅ **Validación:** Todos los endpoints del frontend funcionan
- ✅ **Fix:** Endpoints agregados en `routes/admin/dispatch.php` (ya aplicados)

### Storage no escribible (Nivel 2+)
- ❌ **Síntoma:** Submission falla al guardar video/pdf
- ✅ **Validación:** Verificar permisos `storage/` en servidor

### FFmpeg no encontrado (Nivel 2+)
- ❌ **Síntoma:** Submission falla: "ffmpeg no se reconoce"
- ✅ **Validación:** Verificar `FFMPEG_BIN` en `.env` o instalación

---

## 📊 RESUMEN: QUÉ BUSCAR EN CADA SECCIÓN

| Sección | Funcionalidad Clave | API Critical | Error Esperado (Nivel 1) |
|---|---|---|---|
| HOME | Avatar, progreso, config | `/api/config` 200 | 403 (si MultiViews activo) |
| LOGIN | Form, auditoría, sesión | `/api/auth/login` 200/401/403 | 401 credenciales, 403 período cerrado |
| INSTRUCTIONS | Nombre personalizado, botón | — | — |
| CONSENTIMIENTO | Checkbox obligatorio, BD | `/api/consentimiento` 200 | 403 si no autenticado |
| RECORDING | Permisos, timer, media recorder | `/api/imagen/aleatoria` 200 | NotAllowedError si rechaza permisos |
| SUBMISSION | Candado 1 intento | `/api/submission` 200/403/500 | 403 2º intento, 500 si sin GROQ |
| RESULTS | Confirmación, PDF | `/api/submission/pdf` 200 | 404 si no hay evaluación previa |

---

**Próximo paso:** Ejecutar este checklist paso a paso en navegador (localhost:8000 o SiteGround en vivo) e anotar cualquier desviación.
