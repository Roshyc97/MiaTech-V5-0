// ==========================================
// MiaTech English Assessment v5.0
// Legacy script — funciones auxiliares y compatibilidad
// La lógica principal está en js/recorder.js
// ==========================================

// ==========================================
// SECCIÓN 1: CONFIGURACIÓN Y DATOS
// ==========================================

// 1.1 - Detectar navegador
function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Edg") > -1) return "edge";
    if (ua.indexOf("Chrome") > -1) return "chrome";
    if (ua.indexOf("Firefox") > -1) return "firefox";
    return "other";
}

const BROWSER = detectBrowser();

// 1.2 - Mensajes del sistema
const MESSAGES = {
    greeting: "Hello! I'm MiaTech, it's a pleasure to have you here. I'll be your assistant and evaluator today.\n\nNow we'll begin the assessment.\n\nGood luck!",
    confirmSelection: "When you're ready, press the microphone button to start recording your response.",
    farewell: "Thank you for completing this assessment. Goodbye."
};

// 1.3 - Configuración global (valores legacy compatibles con recorder.js)
// NOTA: La API key y el modelo se manejan exclusivamente en el servidor vía .env
// No se exponen al frontend
const CONFIG_LEGACY = {
    currentLanguage: 'en',
    isRecording: false,
    isSpeaking: false,
    recognition: null,
    synthesis: window.speechSynthesis,
    reconnectionAttempts: 0,
    browser: BROWSER,
    voiceSettings: {
        speed: 0.8,
        pitch: 1.2,
        volume: 1.0
    },

    evaluacionIniciada: false,
    evaluacionActiva: true,
    pasoActual: 0,

    // Datos de evaluación — los datos del estudiante vienen de la BD (sesión),
    // no del formulario del cliente
    datosEvaluacion: {
        firstName: '',
        lastName: '',
        major: '',
        pictureTask: '',
        minTime: 1,
        maxTime: 5,
        recordingStartTime: null,
        recordingDuration: 0,
        fullTranscription: '',
        fechaInicio: '',
        conversacionCompleta: []
    },

    intentosCalificacion: 0,
    maxIntentosAutomaticos: 3,
    reintentosManual: 0,
    maxReintentosManual: 3
};

// Alias global para compatibilidad con navigation.js que referencia CONFIG
if (typeof window.CONFIG === 'undefined') {
    window.CONFIG = CONFIG_LEGACY;
}

// ==========================================
// SECCIÓN 2: INICIALIZACIÓN
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 MiaTech Assessment v5.0');
    console.log('🌐 Browser:', BROWSER);

    if (CONFIG_LEGACY.synthesis.onvoiceschanged !== undefined) {
        CONFIG_LEGACY.synthesis.onvoiceschanged = loadVoices;
    }
    setTimeout(loadVoices, 1000);

    CONFIG_LEGACY.datosEvaluacion.fechaInicio = new Date().toISOString();
});

function loadVoices() {
    const voices = CONFIG_LEGACY.synthesis.getVoices();
    if (voices.length > 0) {
        console.log('🎤 Voices loaded');
    }
}

// ==========================================
// SECCIÓN 3: SISTEMA DE VOZ
// ==========================================

function speakText(text) {
    if (CONFIG_LEGACY.isSpeaking) {
        CONFIG_LEGACY.synthesis.cancel();
    }

    CONFIG_LEGACY.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = CONFIG_LEGACY.voiceSettings.speed;
    utterance.pitch = CONFIG_LEGACY.voiceSettings.pitch;
    utterance.volume = CONFIG_LEGACY.voiceSettings.volume;

    const voices = CONFIG_LEGACY.synthesis.getVoices();
    let voice = null;

    // Prioridad 1: Microsoft Jenny (Neural)
    voice = voices.find(v =>
        v.name.includes('Microsoft Jenny') ||
        v.name === 'Microsoft Jenny Online (Natural) - English (United States)'
    );

    // Prioridad 2: Microsoft Zira
    if (!voice) {
        voice = voices.find(v =>
            v.name.includes('Microsoft Zira') ||
            v.name === 'Microsoft Zira - English (United States)'
        );
    }

    // Prioridad 3: Otras voces femeninas en inglés
    if (!voice) {
        voice = voices.find(v =>
            v.lang.startsWith('en') &&
            (v.name.toLowerCase().includes('female') ||
             v.name.includes('Samantha') ||
             v.name.includes('Karen'))
        );
    }

    // Prioridad 4: Cualquier voz en inglés de EE.UU.
    if (!voice) {
        voice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
    }

    // Prioridad 5: Cualquier voz en inglés
    if (!voice) {
        voice = voices.find(v => v.lang.startsWith('en'));
    }

    if (voice) {
        utterance.voice = voice;
    }

    utterance.onstart = () => {
        const container = document.getElementById('avatar-container');
        if (container) container.classList.add('speaking');

        const gif = document.getElementById('miatech-gif');
        if (gif) {
            const animatedSrc = gif.getAttribute('data-animated');
            gif.src = animatedSrc + '?t=' + new Date().getTime();
        }
    };

    utterance.onend = () => {
        const container = document.getElementById('avatar-container');
        if (container) container.classList.remove('speaking');
        CONFIG_LEGACY.isSpeaking = false;

        const gif = document.getElementById('miatech-gif');
        if (gif) {
            gif.src = gif.getAttribute('data-static');
        }
    };

    utterance.onerror = (event) => {
        console.error('❌ Synthesis error:', event);
        const container = document.getElementById('avatar-container');
        if (container) container.classList.remove('speaking');
        CONFIG_LEGACY.isSpeaking = false;

        const gif = document.getElementById('miatech-gif');
        if (gif) {
            gif.src = gif.getAttribute('data-static');
        }
    };

    CONFIG_LEGACY.synthesis.speak(utterance);
}

// ==========================================
// SECCIÓN 4: FUNCIONES AUXILIARES
// ==========================================

function addMessageToChat(role, text) {
    console.log(`💬 [${role}]:`, text);
    CONFIG_LEGACY.datosEvaluacion.conversacionCompleta.push({
        role: role,
        message: text,
        timestamp: new Date().toISOString()
    });
}

function updateCurrentResponse(text) {
    console.log('📝 [Update Response]:', text);
}

function showSpinner(text) {
    const spinner = document.getElementById('spinner-container');
    const spinnerText = document.getElementById('spinner-text');
    if (spinnerText) spinnerText.textContent = text || 'Processing...';
    if (spinner) spinner.classList.add('active');
}

function hideSpinner() {
    const spinner = document.getElementById('spinner-container');
    if (spinner) spinner.classList.remove('active');
}

function reiniciarEvaluacion() {
    location.reload();
}

// ==========================================
// SECCIÓN 5: STUBS PARA COMPATIBILIDAD
// Funciones legacy que ya no se usan en v5.0
// ==========================================

function generatePictureCards() { return; }
function showTab(num) { }
function getLevelName(level) { return ''; }
function selectTabPicture(num) { }
function confirmarSeleccion() { }
function submitStudentForm(event) { if (event) event.preventDefault(); }
