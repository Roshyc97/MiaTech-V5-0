'use strict';

// ============================================
// MI@TECH v5.0 - Admin Login
// Maneja login de administradores
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('adminLoginForm');
    const correoInput = document.getElementById('correo');
    const passwordInput = document.getElementById('password');

    // Enfocar en email al cargar
    correoInput.focus();

    // Manejar submit del formulario
    form.addEventListener('submit', handleLogin);

    // Permitir enter en password
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
    });
});

/**
 * Manejar login de admin
 */
async function handleLogin(event) {
    event.preventDefault();

    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;

    // Validar entrada
    if (!correo || !password) {
        showError('Please enter email and password');
        return;
    }

    showLoading(true);
    hideError();

    try {
        // POST a /api/auth/login
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                correo: correo,
                password: password
            }),
            credentials: 'include' // Guardar cookies de sesión
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'Login failed. Please try again.');
            showLoading(false);
            return;
        }

        // Validar que sea admin
        if (data.tipo !== 'admin') {
            showError('This portal is for administrators only. Student login is unavailable.');
            showLoading(false);
            return;
        }

        console.log('[Admin Login] ✅ Authenticated as:', data.rol);

        // Si debe cambiar contraseña
        if (data.must_change_password) {
            console.log('[Admin Login] ⚠️ Must change password on first access');
            // Redirigir a página de cambio (será implementada en siguiente fase)
            // Por ahora redirigir al dashboard con mensaje
            setTimeout(() => {
                window.location.href = '/admin-dashboard.html?role=' + encodeURIComponent(data.rol) + '&mustChangePassword=true';
            }, 500);
            return;
        }

        // Login exitoso - redirigir al dashboard según rol
        console.log('[Admin Login] ✅ Redirecting to dashboard...');
        redirectByRole(data.rol);

    } catch (error) {
        console.error('[Admin Login] Error:', error);
        showError('Connection error. Please check your internet and try again.');
        showLoading(false);
    }
}

/**
 * Redirigir al dashboard según rol
 */
function redirectByRole(rol) {
    const validRoles = {
        'ti': 'ti',
        'coordinador': 'coordinador',
        'docente': 'docente'
    };

    const userRole = validRoles[rol] || 'docente';
    const dashboardUrl = '/admin-dashboard.html?role=' + encodeURIComponent(userRole);

    console.log('[Admin Login] Redirecting to:', dashboardUrl);

    // Pequeño delay para que se vea la transición
    setTimeout(() => {
        window.location.href = dashboardUrl;
    }, 300);
}

/**
 * Mostrar spinner de carga
 */
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const form = document.getElementById('adminLoginForm');
    const btn = document.getElementById('loginBtn');

    if (show) {
        spinner.style.display = 'flex';
        form.style.display = 'none';
        btn.disabled = true;
    } else {
        spinner.style.display = 'none';
        form.style.display = 'block';
        btn.disabled = false;
    }
}

/**
 * Mostrar mensaje de error
 */
function showError(message) {
    const el = document.getElementById('errorMessage');
    el.textContent = message;
    el.style.display = 'block';

    // Auto-ocultar error después de 5 segundos
    setTimeout(() => {
        if (el.style.display !== 'none') {
            hideError();
        }
    }, 5000);
}

/**
 * Ocultar mensaje de error
 */
function hideError() {
    const el = document.getElementById('errorMessage');
    el.style.display = 'none';
}
