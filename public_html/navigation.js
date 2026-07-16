// ============================================
// MI@TECH v5.0 - NAVIGATION SYSTEM
// ============================================

// Current state
let currentStep = 1;
const totalSteps = 5;

// Section mapping
const sections = {
    'home': 1,
    'student-info': 2,
    'instructions': 3,
    'recording': 4,
    'results': 5
};

const sectionIds = [
    'home-section',
    'student-info-section',
    'instructions-section',
    'recording-section',
    'results-section'
];

// ============================================
// REQUEST MICROPHONE PERMISSIONS
// ============================================

async function requestMicrophonePermissionV3() {
    console.log('🎤 Requesting microphone permissions...');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Microphone permissions granted');
            return true;
        } catch (err) {
            console.error('❌ Permissions denied:', err);
            alert('⚠️ Microphone access is required for this assessment.\n\nPlease allow microphone permissions and try again.');
            return false;
        }
    } else {
        alert('⚠️ Your browser does not support microphone access.\n\nPlease use Chrome or Edge.');
        return false;
    }
}

// ============================================
// NAVIGATION FUNCTION
// ============================================

function navigateTo(sectionName) {
    console.log('📍 Navigating to:', sectionName);

    const targetStep = sections[sectionName];

    if (!targetStep) {
        console.error('❌ Section not found:', sectionName);
        return;
    }

    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSectionId = sectionIds[targetStep - 1];
    const targetSection = document.getElementById(targetSectionId);

    if (targetSection) {
        targetSection.classList.add('active');
        currentStep = targetStep;
        updateProgressBar();
        onSectionChange(sectionName);
    } else {
        console.error('❌ Section element not found:', targetSectionId);
    }
}

// ============================================
// UPDATE PROGRESS BAR
// ============================================

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.toggle('active', stepNumber === currentStep);
        step.classList.toggle('completed', stepNumber < currentStep);
    });
}

// ============================================
// ACTIONS ON SECTION CHANGE
// ============================================

function onSectionChange(sectionName) {
    console.log('📄 Active section:', sectionName);

    switch(sectionName) {
        case 'home':
            console.log('🏠 Home screen ready');
            break;

        case 'student-info':
            console.log('📝 Student login section active');
            break;

        case 'instructions':
            console.log('📋 Instructions section active');
            break;

        case 'recording':
            console.log('🎤 Recording section ready');
            break;

        case 'results':
            console.log('📊 Results section ready');
            break;
    }
}

// ============================================
// START ASSESSMENT (v5.0 FLOW)
// ============================================

async function startAssessmentV3() {
    console.log('🚀 Starting assessment v5.0...');

    const btnBegin = document.getElementById('btn-begin-assessment');
    if (btnBegin) {
        btnBegin.disabled = true;
        btnBegin.style.opacity = '0.5';
        btnBegin.style.cursor = 'pointer';
    }

    // Request microphone permissions FIRST
    const permissionsGranted = await requestMicrophonePermissionV3();

    if (!permissionsGranted) {
        if (btnBegin) {
            btnBegin.disabled = false;
            btnBegin.style.opacity = '1';
        }
        return;
    }

    // Speak greeting (AFTER permissions)
    const greeting = "Hello! I'm MiaTech, it's a pleasure to have you here. I'll be your assistant and evaluator today. Please log in to begin.";

    if (typeof speakText === 'function') {
        speakText(greeting);
    }

    const wordCount = greeting.split(' ').length;
    const estimatedTime = wordCount * 600;

    setTimeout(() => {
        navigateTo('student-info');
    }, estimatedTime);
}

// ============================================
// OVERRIDE: SHOW RESULTS
// ============================================

window.mostrarResultados = function(evaluacion) {
    console.log('📊 Showing evaluation results');

    navigateTo('results');

    setTimeout(() => {
        const resultsDetailedEl = document.getElementById('results-detailed');
        if (resultsDetailedEl && evaluacion) {
            let html = '<div style="line-height: 2; font-size: 16px;">';

            if (evaluacion.lexicalComplexity) {
                html += `<div style="margin-bottom: 20px;">
                    <strong style="color: var(--color-institucional-morado); font-size: 18px;">📚 Lexical Complexity</strong><br>
                    <span style="color: #333;">${evaluacion.lexicalComplexity}</span>
                </div>`;
            }

            if (evaluacion.grammaticalStructure) {
                html += `<div style="margin-bottom: 20px;">
                    <strong style="color: var(--color-institucional-morado); font-size: 18px;">✍️ Grammatical Structure</strong><br>
                    <span style="color: #333;">${evaluacion.grammaticalStructure}</span>
                </div>`;
            }

            if (evaluacion.fluencyCoherence) {
                html += `<div style="margin-bottom: 20px;">
                    <strong style="color: var(--color-institucional-morado); font-size: 18px;">🗣️ Fluency and Coherence</strong><br>
                    <span style="color: #333;">${evaluacion.fluencyCoherence}</span>
                </div>`;
            }

            if (evaluacion.contentQuality) {
                html += `<div style="margin-bottom: 20px;">
                    <strong style="color: var(--color-institucional-morado); font-size: 18px;">📏 Content Quality</strong><br>
                    <span style="color: #333;">${evaluacion.contentQuality}</span>
                </div>`;
            }

            if (evaluacion.durationCompliance) {
                html += `<div style="margin-bottom: 20px;">
                    <strong style="color: var(--color-institucional-morado); font-size: 18px;">⏱️ Duration</strong><br>
                    <span style="color: #333;">${evaluacion.durationCompliance}</span>
                </div>`;
            }

            if (evaluacion.generalAdvice) {
                html += `<div style="margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border-left: 4px solid var(--color-institucional-amarillo); border-radius: 8px;">
                    <strong style="color: var(--color-institucional-morado); font-size: 18px;">💡 Suggestions for Improvement</strong><br>
                    <span style="color: #333;">${evaluacion.generalAdvice}</span>
                </div>`;
            }

            html += '</div>';
            resultsDetailedEl.innerHTML = html;
        }

        // Enable download button
        setTimeout(() => {
            const downloadButton = document.getElementById('btn-download-pdf');
            if (downloadButton) {
                downloadButton.style.display = 'inline-block';
            }
        }, 1000);

    }, 100);
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Navigation system v5.0 initialized');
    updateProgressBar();

    const btnBegin = document.getElementById('btn-begin-assessment');
    if (btnBegin) {
        btnBegin.addEventListener('click', startAssessmentV3);
    }
});

console.log('✅ navigation.js loaded successfully');
