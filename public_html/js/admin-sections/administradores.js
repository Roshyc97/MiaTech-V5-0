'use strict';

// ============================================
// Seccion "Administrators" (roles: ti / coordinador / docente)
// Solo visible para el rol 'ti'. El backend (routes/admin/dispatch.php)
// solo soporta: listar, crear y activar/desactivar (no hay edicion de
// nombre/rol ni borrado -> esta UI refleja exactamente eso).
// ============================================
(function() {
    let administradoresCache = [];
    let editandoIdAdmin = null;

    async function initAdministradoresSection() {
        console.log('[Administradores] Initializing section...');
        try {
            const btnNewAdmin = document.getElementById('btnNewAdministrador');
            if (btnNewAdmin) btnNewAdmin.addEventListener('click', openCreateModalAdministradores);

            const btnCancelAdmin = document.getElementById('btnCancelEditAdministrador');
            if (btnCancelAdmin) btnCancelAdmin.addEventListener('click', closeCreateModalAdministradores);

            const formAdmin = document.getElementById('formEditarAdministrador');
            if (formAdmin) formAdmin.addEventListener('submit', handleSaveAdministrador);

            // Testing: Botón para resetear must_change_password
            const btnResetPwdChange = document.getElementById('btnResetPasswordChange');
            if (btnResetPwdChange) {
                btnResetPwdChange.addEventListener('click', resetAllAdministratorsMustChangePassword);
                console.log('[Administradores] Reset button listener attached');
            }

            await loadAdministradores();
        } catch (error) {
            console.error('[Administradores] Init error:', error);
        }
    }

    async function loadAdministradores() {
        try {
            const response = await fetch('/api/admin/administradores', { credentials: 'include' });
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            if (!data.ok) { showToastAdministradores(data.error || 'Error loading administrators', 'error'); return; }
            administradoresCache = data.administradores;
            // Convertir activo y must_change_password a booleano para consistent handling
            administradoresCache.forEach(admin => {
                admin.activo = !!parseInt(admin.activo);
                admin.must_change_password = !!parseInt(admin.must_change_password);
                admin.id = parseInt(admin.id);
                console.log('[LoadAdministradores] Admin:', admin.nombre, 'activo:', admin.activo, 'must_change_password:', admin.must_change_password, 'id:', admin.id);
            });
            renderTablaAdministradores();
        } catch (error) {
            console.error('[Administradores] Load error:', error);
            showToastAdministradores('Error loading administrators: ' + error.message, 'error');
        }
    }

    function renderTablaAdministradores() {
        const tbody = document.getElementById('administradoresTableBody');
        if (!tbody) return;
        if (!administradoresCache || administradoresCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">No administrators found</td></tr>';
            return;
        }
        tbody.innerHTML = administradoresCache.map(adminRow => `
            <tr>
                <td><strong>${adminRow.nombre}</strong></td>
                <td>${adminRow.correo}</td>
                <td>${adminRow.rol.toUpperCase()}</td>
                <td>${adminRow.must_change_password ? '⚠️ Pending' : '✓ Set'}</td>
                <td><span class="badge ${adminRow.activo ? 'badge-active' : 'badge-inactive'}">${adminRow.activo ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn-icon btn-edit" onclick="openEditModalAdministradores(${adminRow.id})" title="Edit">✏️</button>
                    <button class="btn-icon" title="${adminRow.activo ? 'Deactivate' : 'Activate'}"
                        onclick="toggleEstadoAdministrador(${adminRow.id}, ${adminRow.activo ? 0 : 1})">
                        ${adminRow.activo ? '🚫' : '✅'}
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteAdministrador(${adminRow.id}, '${adminRow.nombre}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    function openCreateModalAdministradores() {
        editandoIdAdmin = null;
        document.getElementById('modalTitleEditAdministrador').textContent = 'Create New Administrator';
        document.getElementById('btnSubmitAdministrador').textContent = 'Create';
        document.getElementById('correoEditAdministrador').value = '';
        document.getElementById('correoEditAdministrador').disabled = false;
        document.getElementById('nombreEditAdministrador').value = '';
        document.getElementById('rolEditAdministrador').value = 'docente';
        document.getElementById('passwordEditAdministrador').value = '';
        document.getElementById('passwordEditAdministrador').style.display = 'block';
        document.querySelector('label[for="passwordEditAdministrador"]').style.display = 'block';
        clearEditErrorsAdministradores();
        document.getElementById('modalEditarAdministrador').style.display = 'flex';
    }

    async function openEditModalAdministradores(idAdminEdit) {
        try {
            const idNumericoAdmin = parseInt(idAdminEdit);
            const admin = administradoresCache.find(a => parseInt(a.id) === idNumericoAdmin);
            console.log('[EditModal] Buscando admin con ID:', idNumericoAdmin, 'Encontrado:', admin);
            if (!admin) { showToastAdministradores('Administrator not found', 'error'); return; }

            editandoIdAdmin = parseInt(admin.id);
            console.log('[EditModal] editandoIdAdmin asignado a:', editandoIdAdmin);
            document.getElementById('modalTitleEditAdministrador').textContent = 'Edit Administrator';
            document.getElementById('btnSubmitAdministrador').textContent = 'Save';
            document.getElementById('correoEditAdministrador').value = admin.correo;
            document.getElementById('correoEditAdministrador').disabled = true;
            document.getElementById('nombreEditAdministrador').value = admin.nombre;
            document.getElementById('rolEditAdministrador').value = admin.rol;
            document.getElementById('passwordEditAdministrador').value = '';
            document.getElementById('passwordEditAdministrador').style.display = 'none';
            document.querySelector('label[for="passwordEditAdministrador"]').style.display = 'none';
            clearEditErrorsAdministradores();
            document.getElementById('modalEditarAdministrador').style.display = 'flex';
        } catch (error) {
            console.error('[Administradores] Edit modal error:', error);
            showToastAdministradores('Error loading administrator: ' + error.message, 'error');
        }
    }

    function closeCreateModalAdministradores() {
        document.getElementById('modalEditarAdministrador').style.display = 'none';
        editandoIdAdmin = null;
        clearEditErrorsAdministradores();
    }

    async function handleSaveAdministrador(event) {
        event.preventDefault();
        const correo = document.getElementById('correoEditAdministrador').value.trim();
        const nombre = document.getElementById('nombreEditAdministrador').value.trim();
        const rol = document.getElementById('rolEditAdministrador').value;
        const password = document.getElementById('passwordEditAdministrador').value;

        clearEditErrorsAdministradores();

        if (!correo) { showEditErrorAdministradores('correoEditAdministrador', 'Email is required'); return; }
        if (!correo.includes('@')) { showEditErrorAdministradores('correoEditAdministrador', 'Invalid email format'); return; }
        if (!nombre) { showEditErrorAdministradores('nombreEditAdministrador', 'Name is required'); return; }
        if (!['ti', 'coordinador', 'docente'].includes(rol)) { showEditErrorAdministradores('rolEditAdministrador', 'Select a valid role'); return; }

        // Si es crear (no editandoIdAdmin), validar contraseña
        if (!editandoIdAdmin && password.length < 8) {
            showEditErrorAdministradores('passwordEditAdministrador', 'Password must be at least 8 characters');
            return;
        }

        await saveAdministrador(correo, nombre, rol, password);
    }

    async function saveAdministrador(correo, nombre, rol, password) {
        try {
            const method = editandoIdAdmin ? 'PUT' : 'POST';
            const url = editandoIdAdmin ? `/api/admin/administradores/${editandoIdAdmin}` : '/api/admin/administradores';
            const body = { nombre, rol };
            if (!editandoIdAdmin) {
                body.correo = correo;
                body.password = password;
            }
            console.log('[SaveAdmin] Enviando:', { method, url, body });
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) {
                console.error('[SaveAdmin] Error:', data);
                showEditErrorAdministradores('formErrorAdministrador', data.error || 'Error saving administrator');
                return;
            }
            console.log('[SaveAdmin] ✅ Éxito');
            const mensaje = editandoIdAdmin
                ? 'Administrator updated successfully'
                : 'Administrator created. They must change their password on first login.';
            showToastAdministradores(mensaje, 'success');
            closeCreateModalAdministradores();
            await loadAdministradores();
        } catch (error) {
            console.error('[Administradores] Save error:', error);
            showEditErrorAdministradores('formErrorAdministrador', 'Error saving administrator: ' + error.message);
        }
    }

    async function toggleEstadoAdministrador(id, nuevoEstado) {
        const accion = nuevoEstado ? 'activate' : 'deactivate';
        if (!confirm(`Are you sure you want to ${accion} this administrator?`)) return;
        try {
            const response = await fetch(`/api/admin/administradores/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: nuevoEstado }),
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) { showToastAdministradores(data.error || 'Error updating status', 'error'); return; }
            showToastAdministradores('Status updated', 'success');
            await loadAdministradores();
        } catch (error) {
            console.error('[Administradores] Toggle status error:', error);
            showToastAdministradores('Error updating status: ' + error.message, 'error');
        }
    }

    async function deleteAdministrador(id, nombre) {
        if (!confirm(`Are you sure you want to permanently delete administrator "${nombre}"? This action cannot be undone.`)) return;
        try {
            const response = await fetch(`/api/admin/administradores/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) { showToastAdministradores(data.error || 'Error deleting administrator', 'error'); return; }
            showToastAdministradores(`Administrator "${nombre}" deleted successfully`, 'success');
            await loadAdministradores();
        } catch (error) {
            console.error('[Administradores] Delete error:', error);
            showToastAdministradores('Error deleting administrator: ' + error.message, 'error');
        }
    }

    function showEditErrorAdministradores(fieldId, message) {
        const errorContainer = document.getElementById(fieldId + '-error') || document.getElementById(fieldId);
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        }
    }

    function clearEditErrorsAdministradores() {
        const errorDivs = ['correoEditAdministrador-error', 'nombreEditAdministrador-error', 'rolEditAdministrador-error', 'passwordEditAdministrador-error', 'formErrorAdministrador'];
        errorDivs.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = ''; el.style.display = 'none'; }
        });
    }

    function showToastAdministradores(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) { console.log('[Toast]', message); return; }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
    }

    window.initAdministradoresSection = initAdministradoresSection;
    window.loadAdministradores = loadAdministradores;
    window.openCreateModalAdministradores = openCreateModalAdministradores;
    window.openEditModalAdministradores = openEditModalAdministradores;
    window.closeCreateModalAdministradores = closeCreateModalAdministradores;
    window.handleSaveAdministrador = handleSaveAdministrador;
    window.toggleEstadoAdministrador = toggleEstadoAdministrador;
    window.deleteAdministrador = deleteAdministrador;
    window.resetAllAdministratorsMustChangePassword = resetAllAdministratorsMustChangePassword;
})();
