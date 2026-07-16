// ============================================
// MI@TECH v4.0 — js/recorder.js
// Flujo alumno: Home → Login → Instructions
//              → Consentimiento → Grabación → Envío → Confirmación
//
// NOTA: Toda la configuración variable viene de .env
// y se carga desde /api/config
// ============================================

'use strict';

// ============================================
// CONFIGURACIÓN CENTRALIZADA EN .ENV
// Se carga al inicializar
// ============================================
let CONFIG = {
    minDuration:        60,             // segundos (por defecto: 1 min)
    maxDuration:        300,            // segundos (por defecto: 5 min)
    timeLabel:          '1–5 min',      // Mensaje de duración esperada
    taskText:           'Describe the picture.',  // Instrucción de tarea
    defaultImageFolder: 'imagenes',     // Carpeta de imágenes
    siteName:           'Mi@Tech',      // Nombre del sitio
};

// Cargar configuración desde servidor (variables de .env)
async function cargarConfiguracion() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            CONFIG = { ...CONFIG, ...data };
            console.log('✅ Configuración cargada desde .env:', CONFIG);
        }
    } catch (err) {
        console.warn('⚠️ Usando configuración por defecto:', err.message);
    }
}

// ============================================
// ESTADO GLOBAL
// ============================================
const State = {
    imagenId:               null,        // ID de la imagen (para auditoría)
    imagenSrc:              null,        // src de la imagen para mostrar
    consentimientoRegistrado: false,     // ¿Se registró el consentimiento?
    mediaRecorder:          null,        // MediaRecorder instance
    videoChunks:            [],          // Chunks de pantalla + audio
    videoBlob:              null,        // Blob final
    grabando:               false,       // ¿Está grabando?
    segundos:               0,           // Contador de segundos
    cronometroInterval:     null,        // Interval ID
    speechRecognition:      null,        // Web Speech API
    transcripcionViva:      '',          // Transcripción en vivo (no calificada)
    streamPreview:          null,        // Stream para grabar (pantalla + audio)
    cameraStream:           null,        // Stream de cámara (para preview miniatura)
    rerecordUsed:           false,       // ¿Ya se usó la regrabación?
    usuarioData:            null,        // Datos del usuario autenticado (nombre, apellido, carrera)
    pdfUrl:                 null,        // URL del PDF para descarga del alumno
};

// ============================================
// UTILIDADES DOM
// ============================================
const $ = id => document.getElementById(id);

function mostrarSeccion(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = $(id);
    if (sec) sec.classList.add('active');
    actualizarProgreso(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function actualizarProgreso(seccionId) {
    const mapa = {
        'home-section':            1,
        'student-info-section':    2,
        'instructions-section':    3,
        'recording-section':       4,
        'results-section':         5,
    };
    const paso = mapa[seccionId] || 1;
    document.querySelectorAll('.progress-step').forEach(el => {
        const n = parseInt(el.dataset.step);
        el.classList.toggle('active', n === paso);
        el.classList.toggle('completed', n < paso);
    });
}

function mostrarSpinner(texto = 'Processing...') {
    $('spinner-text').textContent = texto;
    $('spinner-container').classList.add('active');
}

function ocultarSpinner() {
    $('spinner-container').classList.remove('active');
}

function mostrarModal(id) {
    $(id).classList.add('active');
}

function ocultarModal(id) {
    $(id).classList.remove('active');
}

function mostrarError(titulo, mensaje) {
    const errEl = $('modal-error-text');
    if (errEl) {
        errEl.innerHTML = `<strong>${titulo}</strong><br/>${mensaje}`;
    }
    mostrarModal('modal-error');
}

// ============================================
// SECCIÓN 1 — HOME
// ============================================
function initHome() {
    const btn = $('btn-begin-assessment');
    if (btn) {
        btn.onclick = () => mostrarSeccion('student-info-section');
    }
}

// ============================================
// SECCIÓN 2 — LOGIN
// POST /api/auth/login
// ============================================
function initLogin() {
    const form = $('student-form');
    if (!form) return;

    form.innerHTML = `
        <div class="form-group">
            <label for="login-correo" class="form-label">Institutional email *</label>
            <input type="email" id="login-correo" class="form-input"
                   placeholder="username@itsjapon.edu.ec" required autocomplete="username">
        </div>
        <div class="form-group">
            <label for="login-cedula" class="form-label">ID number (cédula) *</label>
            <input type="password" id="login-cedula" class="form-input"
                   placeholder="Enter your ID number" required autocomplete="current-password">
        </div>
        <div id="login-error" class="error-message" style="color:#c0392b;font-size:14px;margin-bottom:12px;display:none;"></div>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:20px;">
            ▶️ Continue
        </button>
    `;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const correo  = $('login-correo').value.trim();
        const cedula  = $('login-cedula').value.trim();
        const errEl   = $('login-error');
        errEl.style.display = 'none';

        mostrarSpinner('Verifying...');
        try {
            const res  = await fetch('/api/auth/login', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ correo, password: cedula }),
            });
            const data = await res.json();
            ocultarSpinner();

            if (!res.ok || data.tipo !== 'estudiante') {
                errEl.textContent   = data.error || 'Access denied.';
                errEl.style.display = 'block';
                return;
            }

            // Guardar datos del usuario desde la BD
            State.usuarioData = {
                nombre:   data.nombre || '',
                correo:   correo,
            };
            console.log('✅ User data from DB:', State.usuarioData);

            // Rellenar nombre del estudiante en la sección de instrucciones
            const nombreDisplay = $('student-name-display');
            if (nombreDisplay && State.usuarioData.nombre) {
                nombreDisplay.textContent = State.usuarioData.nombre;
                console.log('✅ Nombre inyectado en DOM:', State.usuarioData.nombre);
            }

            // Login exitoso → ir a Instructions (NO al consentimiento directo)
            mostrarSeccion('instructions-section');
        } catch (err) {
            ocultarSpinner();
            errEl.textContent   = 'Connection error. Please try again.';
            errEl.style.display = 'block';
        }
    };
}

// ============================================
// SECCIÓN 3 — INSTRUCTIONS
// El botón "Start Assessment" muestra el consentimiento
// ============================================
function initInstructions() {
    const btn = $('btn-start-assessment');
    if (btn) {
        btn.onclick = () => mostrarModalConsentimiento();
    }
}

// ============================================
// MODAL DE CONSENTIMIENTO
// POST /api/consentimiento
// Ahora se muestra DESPUÉS de Instructions
// ============================================
const TEXTO_CONSENTIMIENTO_VERSION = 'v4.0-2026';
const TEXTO_CONSENTIMIENTO = `
By proceeding with this assessment, you consent to the following:

1. Your voice and image will be recorded during this evaluation.
2. The recording will be processed by an AI system (Whisper) for transcription.
3. The transcription will be evaluated by an AI language model.
4. A report containing your result and transcription will be generated and sent to your instructor.
5. Your video recording will be retained for a maximum of 2 months, after which it will be deleted.
6. Your personal data will be processed in accordance with the data protection policies of Instituto Tecnológico Superior Japón.

This recording is used exclusively for academic placement purposes.
`;

function mostrarModalConsentimiento() {
    let modal = $('modal-consentimiento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id        = 'modal-consentimiento';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:580px;">
                <div class="modal-title" style="color:var(--color-institucional-morado);">
                    📋 Informed Consent
                </div>
                <div class="modal-text" style="text-align:left;max-height:260px;overflow-y:auto;
                     font-size:13px;line-height:1.7;border:1px solid #ddd;padding:14px;
                     border-radius:8px;background:#f9f9f9;white-space:pre-line;">
${TEXTO_CONSENTIMIENTO.trim()}
                </div>
                <div style="margin:18px 0 10px;display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" id="consent-check" style="margin-top:3px;width:18px;height:18px;cursor:pointer;">
                    <label for="consent-check" style="font-size:14px;cursor:pointer;line-height:1.5;">
                        I have read and accept the terms above. I consent to the recording and processing of my data for this evaluation.
                    </label>
                </div>
                <div id="consent-error" style="color:#c0392b;font-size:13px;display:none;margin-bottom:8px;">
                    You must accept the terms to continue.
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-secondary" onclick="rechazarConsentimiento()">
                        ✗ Decline
                    </button>
                    <button class="modal-btn modal-btn-primary" id="btn-aceptar-consent"
                            onclick="aceptarConsentimiento()"
                            style="background:var(--color-institucional-morado);color:white;">
                        ✓ I Accept & Continue
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const check = $('consent-check');
    if (check) check.checked = false;
    const errEl = $('consent-error');
    if (errEl) errEl.style.display = 'none';

    mostrarModal('modal-consentimiento');
}

async function aceptarConsentimiento() {
    const check = $('consent-check');
    const errEl = $('consent-error');

    if (!check.checked) {
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';

    mostrarSpinner('Registering consent...');
    try {
        const res = await fetch('/api/consentimiento', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                acepto:          1,
                texto_version:   TEXTO_CONSENTIMIENTO_VERSION,
            }),
        });
        ocultarSpinner();

        if (!res.ok) {
            const data = await res.json();
            mostrarError('Consent Registration Error', data.error || 'Unknown error');
            return;
        }

        State.consentimientoRegistrado = true;
        ocultarModal('modal-consentimiento');
        await iniciarSeccionGrabacion();
    } catch (err) {
        ocultarSpinner();
        mostrarError('Connection Error', err.message);
    }
}

function rechazarConsentimiento() {
    ocultarModal('modal-consentimiento');
    // Permanece en Instructions
}

// ============================================
// SECCIÓN 4 — GRABACIÓN
// ============================================
async function iniciarSeccionGrabacion() {
    // Cargar imagen aleatoria desde el servidor
    try {
        const res = await fetch('/api/imagen/aleatoria');
        if (res.ok) {
            const data = await res.json();
            State.imagenId  = data.id;
            State.imagenSrc = data.src;
        } else {
            console.warn('No image available, using placeholder');
            State.imagenSrc = '/img/imagenes/placeholder.png';
        }
    } catch (err) {
        console.warn('Error loading image:', err.message);
        State.imagenSrc = '/img/imagenes/placeholder.png';
    }

    // NOTA: Imagen se mostrará DESPUÉS de presionar mic-button, no aquí
    // (Ver iniciarGrabacion() para mostrar la imagen)

    // Mostrar tarea (viene de .env)
    const taskEl = $('selected-task-text');
    if (taskEl) taskEl.textContent = CONFIG.taskText;

    // Mostrar duración recomendada
    const timerReq = $('timer-required');
    if (timerReq) timerReq.textContent = `Required: ${CONFIG.timeLabel}`;

    // Resetear estado
    resetearEstadoGrabacion();

    // Mostrar controles
    const controls = $('recording-controls');
    if (controls) controls.style.display = 'flex';

    // Pedir permisos de cámara/micrófono
    await solicitarPermisosMedia();

    // Mostrar sección
    mostrarSeccion('recording-section');
}

async function solicitarPermisosMedia() {
    const micBtn = $('mic-button');
    try {
        console.log('[recorder] Solicitando permisos: pantalla + micrófono + cámara');

        // 1. Solicitar PANTALLA (video de lo que se ve en navegador - esta pestaña automáticamente)
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always',           // Mostrar cursor
                displaySurface: 'browser'   // Preferir esta pestaña del navegador
            },
            audio: false                    // El audio de pantalla no es confiable, usaremos micrófono
        });

        // 2. Solicitar AUDIO del micrófono
        const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

        // 3. Solicitar CÁMARA (para preview en miniatura)
        const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 }
            },
            audio: false  // El audio ya viene del micrófono
        });

        // 4. Combinar: video de pantalla + audio de micrófono (para grabación)
        const combinedStream = new MediaStream([
            ...screenStream.getVideoTracks(),   // Video: pantalla/navegador
            ...audioStream.getAudioTracks()     // Audio: micrófono
        ]);

        console.log('[recorder] ✅ Pantalla + micrófono + cámara listos');

        // Mostrar preview de CÁMARA en miniatura
        _mostrarCameraPreview(cameraStream);

        // Guardar streams para grabación y preview
        State.streamPreview = combinedStream;
        State.cameraStream = cameraStream;  // Guardar para poder detener luego

        if (micBtn) micBtn.disabled = false;

    } catch (err) {
        if (micBtn) micBtn.disabled = true;

        let mensaje = 'Error al preparar la grabación. ';
        if (err.name === 'NotAllowedError') {
            mensaje = 'Debes permitir acceso a pantalla, micrófono y cámara para continuar.';
        } else if (err.name === 'NotFoundError') {
            mensaje = 'No se encontró pantalla o cámara. Verifica que tengas estos dispositivos disponibles.';
        } else {
            mensaje += err.message;
        }

        mostrarErrorGrabacion(mensaje);
    }
}

function _mostrarCameraPreview(stream) {
    let videoEl = $('camera-preview');
    if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.id = 'camera-preview';
        videoEl.className = 'camera-preview';
        videoEl.autoplay   = true;
        videoEl.muted      = true;
        videoEl.playsInline = true;

        const recordingVisuals = $('recording-visuals');
        if (recordingVisuals) {
            recordingVisuals.appendChild(videoEl);
        } else {
            const controls = $('recording-controls');
            if (controls) controls.parentNode.insertBefore(videoEl, controls);
        }
    }
    videoEl.srcObject = stream;
}

function resetearEstadoGrabacion() {
    State.mediaRecorder  = null;
    State.videoChunks    = [];
    State.videoBlob      = null;
    State.grabando       = false;
    State.segundos       = 0;
    State.transcripcionViva = '';

    if (State.cronometroInterval) {
        clearInterval(State.cronometroInterval);
        State.cronometroInterval = null;
    }
    if (State.speechRecognition) {
        try { State.speechRecognition.stop(); } catch {}
        State.speechRecognition = null;
    }

    // Limpiar preview de cámara
    const videoEl = $('camera-preview');
    if (videoEl) {
        videoEl.srcObject = null;
    }

    // UI reset
    const timerEl = $('timer-current');
    if (timerEl) {
        timerEl.textContent = '00:00';
        timerEl.classList.remove('timer-warning', 'timer-over');
    }

    const transcEl = $('transcription-text');
    if (transcEl) {
        transcEl.textContent = 'Start speaking to see your transcription here...';
        transcEl.classList.add('transcription-empty');
    }

    const micBtn = $('mic-button');
    if (micBtn) {
        micBtn.classList.remove('recording');
        micBtn.innerHTML = `
            <div id="mic-icon">
                <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
            </div>`;
    }

    const startOverBtn = $('btn-start-over');
    if (startOverBtn) startOverBtn.style.display = 'none';
    const submitBtn = $('btn-submit');
    if (submitBtn) submitBtn.disabled = true;
}

// ============================================
// CONTROL DE GRABACIÓN
// ============================================
async function toggleRecording() {
    if (State.grabando) {
        detenerGrabacion();
    } else {
        await iniciarGrabacion();
    }
}

async function iniciarGrabacion() {
    try {
        let stream = State.streamPreview;
        if (!stream || stream.getTracks().some(t => t.readyState === 'ended')) {
            throw new Error('Compartir pantalla fue cancelado. Por favor, intenta de nuevo.');
        }

        // Mostrar imagen AHORA (después de presionar mic-button)
        const imgEl = $('selected-level-image');
        if (imgEl && State.imagenSrc) imgEl.src = State.imagenSrc;

        // ✅ GRABAR STREAM COMPLETO (pantalla + audio micrófono)
        if (stream.getAudioTracks().length === 0) {
            throw new Error('No se detectó audio del micrófono. Por favor, verifica los permisos.');
        }

        const mimeType = seleccionarMimeType();
        const options  = mimeType ? { mimeType } : {};

        State.mediaRecorder = new MediaRecorder(stream, options);  // ✅ PANTALLA + AUDIO
        State.videoChunks   = [];
        State.grabando      = true;

        State.mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) State.videoChunks.push(e.data);
        };

        State.mediaRecorder.onstop = () => {
            const mime       = State.mediaRecorder.mimeType || 'video/webm';
            State.videoBlob  = new Blob(State.videoChunks, { type: mime });
            alGrabaciónDetenida();
        };

        // Detectar si pantalla compartida se cierra
        const screenTracks = stream.getVideoTracks();
        if (screenTracks.length > 0) {
            screenTracks[0].onended = () => {
                console.log('[recorder] ⚠️ Pantalla compartida se cerró');
                if (State.grabando) {
                    detenerGrabacion();
                    mostrarAvisoCorto('La pantalla compartida se cerró. Grabación detenida.');
                }
            };
        }

        State.mediaRecorder.start(1000);

        // UI: grabando
        const micBtn = $('mic-button');
        micBtn.classList.add('recording');
        micBtn.innerHTML = `
            <div class="wave-container">
                <div class="wave-bar"></div><div class="wave-bar"></div>
                <div class="wave-bar"></div><div class="wave-bar"></div>
                <div class="wave-bar"></div>
            </div>`;

        // Cronómetro
        State.segundos = 0;
        State.cronometroInterval = setInterval(tickCronometro, 1000);

        // Web Speech API (ayuda visual, no calificada)
        iniciarTranscripcionViva();

    } catch (err) {
        State.grabando = false;
        mostrarErrorGrabacion('Could not start recording: ' + err.message);
    }
}

function detenerGrabacion() {
    if (State.mediaRecorder && State.mediaRecorder.state !== 'inactive') {
        State.mediaRecorder.stop();
    }
    State.grabando = false;

    if (State.cronometroInterval) {
        clearInterval(State.cronometroInterval);
        State.cronometroInterval = null;
    }
    if (State.speechRecognition) {
        try { State.speechRecognition.stop(); } catch {}
    }
}

function alGrabaciónDetenida() {
    const minSecs = CONFIG.minDuration;

    // Validación de duración mínima (solo aviso, no bloquea)
    if (State.segundos < minSecs) {
        const minutos = Math.floor(minSecs / 60);
        const aviso   = `Your recording is too short (${formatTiempo(State.segundos)}). Minimum required: ${minutos} minute(s).`;
        mostrarAvisoCorto(aviso);
    }

    // Mostrar botones post-grabación
    const startOverBtn = $('btn-start-over');
    if (startOverBtn) {
        // Solo mostrar si no se ha usado la regrabación
        if (!State.rerecordUsed) {
            startOverBtn.style.display = 'inline-block';
        } else {
            startOverBtn.style.display = 'none';
        }
    }
    const submitBtn = $('btn-submit');
    if (submitBtn) submitBtn.disabled = false;

    // Restaurar ícono del micrófono
    const micBtn = $('mic-button');
    micBtn.classList.remove('recording');
    micBtn.innerHTML = `
        <div id="mic-icon">
            <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
        </div>`;
    micBtn.disabled = true;
}

// ============================================
// CRONÓMETRO
// ============================================
function tickCronometro() {
    State.segundos++;
    const maxSecs = CONFIG.maxDuration;
    const timerEl = $('timer-current');

    timerEl.textContent = formatTiempo(State.segundos);

    // Advertencia a 30s del máximo
    if (State.segundos >= maxSecs - 30 && State.segundos < maxSecs) {
        timerEl.classList.add('timer-warning');
        timerEl.classList.remove('timer-over');
    }

    // Parar automáticamente al máximo
    if (State.segundos >= maxSecs) {
        timerEl.classList.add('timer-over');
        timerEl.classList.remove('timer-warning');
        detenerGrabacion();
        mostrarAvisoTiempoMaximo();
    }
}

function formatTiempo(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
}

// ============================================
// RE-GRABACIÓN — UNA SOLA OPORTUNIDAD
// Muestra modal de advertencia. Si ya se usó, no permite.
// ============================================
function startOverRecording() {
    if (State.rerecordUsed) {
        // No debería llegar aquí, pero por seguridad
        mostrarError('Re-recording Unavailable', 'You have already used your one re-recording opportunity.');
        return;
    }
    // Mostrar modal de advertencia
    mostrarModal('modal-rerecord');
}

function cancelRerecord() {
    ocultarModal('modal-rerecord');
}

async function confirmRerecord() {
    ocultarModal('modal-rerecord');
    State.rerecordUsed = true;

    // Detener grabación si está activa
    if (State.grabando) detenerGrabacion();

    // Cargar nueva imagen aleatoria
    try {
        const res = await fetch('/api/imagen/aleatoria');
        if (res.ok) {
            const data = await res.json();
            State.imagenId  = data.id;
            State.imagenSrc = data.src;
        }
    } catch (err) {
        console.warn('Error loading new image:', err.message);
    }

    // Actualizar imagen en pantalla
    const imgEl = $('selected-level-image');
    if (imgEl && State.imagenSrc) imgEl.src = State.imagenSrc;

    // Resetear estado de grabación
    resetearEstadoGrabacion();

    // Rehabilitar micrófono
    const micBtn = $('mic-button');
    if (micBtn) micBtn.disabled = false;

    // Mantener preview de cámara
    if (State.streamPreview) _mostrarCameraPreview(State.streamPreview);

    console.log('🔄 Re-recording initiated (one-time). New image assigned.');
}

// ============================================
// WEB SPEECH API — Transcripción en vivo (ayuda visual)
// No se califica. La calificación usa Whisper en servidor.
// ============================================
function iniciarTranscripcionViva() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // Degradar silenciosamente

    const recognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    recognition.onresult = (event) => {
        let interino   = '';
        let definitivo = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const txt = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                definitivo += txt + ' ';
            } else {
                interino += txt;
            }
        }
        State.transcripcionViva += definitivo;

        const transcEl = $('transcription-text');
        if (transcEl) {
            transcEl.classList.remove('transcription-empty');
            transcEl.textContent = (State.transcripcionViva + interino).trim();
            transcEl.scrollTop   = transcEl.scrollHeight;
        }
    };

    recognition.onerror = () => {};

    recognition.onend = () => {
        if (State.grabando) {
            try { recognition.start(); } catch {}
        }
    };

    try {
        recognition.start();
        State.speechRecognition = recognition;
    } catch {}
}

// ============================================
// ENVÍO A /api/submission
// El servidor orquesta: transcripción + evaluación + almacenamiento
// NO retorna calificación al cliente (se envía al instructor)
// ============================================
async function enviarRespuesta() {
    if (!State.videoBlob) {
        alert('No recording found. Please record your response first.');
        return;
    }

    // Validación suave (aviso, pero permite enviar)
    const minSecs = CONFIG.minDuration;
    if (State.segundos < minSecs) {
        const minutos = Math.floor(minSecs / 60);
        const confirmar = confirm(
            `Your recording is ${formatTiempo(State.segundos)} long.\n` +
            `The minimum recommended is ${minutos} minute(s).\n\n` +
            `Do you want to submit anyway?`
        );
        if (!confirmar) return;
    }

    $('btn-submit').disabled           = true;
    $('btn-start-over').style.display  = 'none';
    mostrarSpinner('Uploading and processing your recording...');

    try {
        const mimeType = normalizarMimeTypeParaEnvio(State.mediaRecorder?.mimeType || State.videoBlob.type || seleccionarMimeType() || 'video/webm');
        const ext      = mimeType.includes('mp4') ? '.mp4' : mimeType.includes('webm') ? '.webm' : '.webm';

        const formData = new FormData();
        const videoFile = new File([State.videoBlob], `recording${ext}`, { type: mimeType });
        formData.append('video', videoFile);  // ✅ CAMPO 'video'
        formData.append('imagen_id', State.imagenId || 'unknown');

        const res = await fetch('/api/submission', {
            method: 'POST',
            body:   formData,
        });

        ocultarSpinner();
        const data = await res.json();

        if (!res.ok) {
            mostrarErrorEnvio(data.error || 'Submission failed. Please try again.');
            return;
        }

        // Guardar URL del PDF si el servidor la devuelve
        if (data.pdf_url) {
            State.pdfUrl = data.pdf_url;
        }

        // Envío exitoso → mostrar confirmación (sin calificación)
        mostrarConfirmacionEnvio();

    } catch (err) {
        ocultarSpinner();
        mostrarErrorEnvio('Connection error. Please check your internet and try again.');
    }
}

// ============================================
// SECCIÓN 5 — CONFIRMACIÓN DE ENVÍO
// (SIN mostrar calificación, ya que va solo al instructor)
// ============================================
function mostrarConfirmacionEnvio() {
    // Detener stream de pantalla + micrófono
    if (State.streamPreview) {
        State.streamPreview.getTracks().forEach(t => {
            t.stop();
            console.log(`[recorder] Deteniendo track: ${t.kind}`);
        });
        State.streamPreview = null;
    }

    // Detener stream de cámara (preview)
    if (State.cameraStream) {
        State.cameraStream.getTracks().forEach(t => {
            t.stop();
            console.log(`[recorder] Deteniendo cámara: ${t.kind}`);
        });
        State.cameraStream = null;
        const videoEl = $('camera-preview');
        if (videoEl) videoEl.srcObject = null;
    }

    // Mostrar botón de descarga PDF si hay URL disponible
    const btnPdf = $('btn-download-pdf');
    if (btnPdf && State.pdfUrl) {
        btnPdf.style.display = 'inline-block';
    }

    mostrarSeccion('results-section');
}

// ============================================
// DESCARGA PDF (sin calificación) PARA EL ALUMNO
// ============================================
function descargarPdfAlumno() {
    if (!State.pdfUrl) {
        mostrarError('Download Error', 'No PDF available for download.');
        return;
    }
    // Abrir el PDF en nueva pestaña (el servidor ya excluye la calificación)
    window.open(State.pdfUrl, '_blank');
}

// ============================================
// MANEJO DE ERRORES
// ============================================
function mostrarErrorGrabacion(mensaje) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:#c0392b;background:#fdedec;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:14px;';
    errDiv.textContent   = '⚠️ ' + mensaje;
    const seccion = $('recording-section')?.querySelector('.section-content');
    if (seccion) seccion.insertBefore(errDiv, seccion.firstChild);
    setTimeout(() => errDiv.remove(), 8000);
}

function mostrarErrorEnvio(mensaje) {
    $('btn-submit').disabled          = false;
    $('btn-start-over').style.display = State.rerecordUsed ? 'none' : 'inline-block';
    mostrarError('Submission Error', mensaje);
}

function mostrarAvisoCorto(mensaje) {
    const aviso         = document.createElement('div');
    aviso.style.cssText = 'color:#856404;background:#fff3cd;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:14px;border:1px solid #ffc107;';
    aviso.textContent   = '⚠️ ' + mensaje;
    const seccion = $('recording-section')?.querySelector('.recording-info');
    if (seccion) seccion.parentNode.insertBefore(aviso, seccion.nextSibling);
    setTimeout(() => aviso.remove(), 10000);
}

function mostrarAvisoTiempoMaximo() {
    mostrarAvisoCorto('Maximum recording time reached. Your recording has been stopped automatically.');
}

// ============================================
// MIME TYPE Y COMPATIBILIDAD
// ============================================
function normalizarMimeTypeParaEnvio(mimeType) {
    const raw = (mimeType || '').split(';')[0].trim().toLowerCase();
    const mapa = {
        'video/webm': 'video/webm',      // ✅ MANTENER COMO VIDEO
        'video/x-matroska': 'video/webm',
        'video/mp4': 'video/mp4',
        'audio/webm': 'video/webm',      // ✅ CONVERTIR A VIDEO
        'audio/mp4': 'video/mp4',
        'audio/ogg': 'video/webm',
        'audio/mpeg': 'video/webm',
        'audio/mp3': 'video/webm',
        'audio/wav': 'video/webm',
    };
    return mapa[raw] || (raw.startsWith('audio/') ? 'video/webm' : raw || 'video/webm');
}

function seleccionarMimeType() {
    const tipos = [
        'video/webm',                    // ✅ PRIMERO
        'video/webm;codecs=vp8,opus',
        'video/mp4',
        'video/x-matroska',
        'audio/webm;codecs=opus',        // fallback
        'audio/webm',
    ];
    return tipos.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracion();
    initHome();
    initLogin();
    initInstructions();
});
