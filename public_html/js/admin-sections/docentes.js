'use strict';

(function() {
    let docentesCache = [];
    let paginaActual = 1;
    let filtroActual = 'todos';
    let searchActual = '';
    let editandoId = null;

async function initDocentesSection() {
    console.log('[Docentes] Initializing section...');
    try {
        const btnNew = document.getElementById('btnNewDocente');
        if (btnNew) btnNew.addEventListener('click', openCreateModalDocentes);

        const filter = document.getElementById('filterDocentes');
        if (filter) filter.addEventListener('change', handleFilterChangeDocentes);

        const search = document.getElementById('searchDocentes');
        if (search) search.addEventListener('input', handleSearchDocentes);

        const btnCancel = document.getElementById('btnCancelEditDocente');
        if (btnCancel) btnCancel.addEventListener('click', closeEditModalDocentes);

        const form = document.getElementById('formEditarDocente');
        if (form) form.addEventListener('submit', handleSaveDocente);

        await loadDocentes(1);
    } catch (error) {
        console.error('[Docentes] Init error:', error);
    }
}

async function loadDocentes(page = 1) {
    try {
        console.log('[Docentes] Loading page', page);
        const params = new URLSearchParams({ page, limit: 20, filtro: filtroActual, search: searchActual });
        const response = await fetch(`/api/admin/docentes?${params}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        if (!data.ok) { showToastDocentes(data.error || 'Error loading teachers', 'error'); return; }
        docentesCache = data.docentes;
        // Convertir activo a booleano para consistent handling
        docentesCache.forEach(doc => {
            doc.activo = !!parseInt(doc.activo);
            doc.id = parseInt(doc.id);
            console.log('[LoadDocentes] Doc:', doc.nombre, 'activo:', doc.activo, 'id:', doc.id);
        });
        paginaActual = page;
        renderTablaDocentes(data);
        renderPaginacionDocentes(data);
    } catch (error) {
        console.error('[Docentes] Load error:', error);
        showToastDocentes('Error loading teachers: ' + error.message, 'error');
    }
}

function renderTablaDocentes(data) {
    const tbody = document.getElementById('docentesTableBody');
    if (!docentesCache || docentesCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">No teachers found</td></tr>';
        return;
    }
    tbody.innerHTML = docentesCache.map(doc => `
        <tr>
            <td><strong>${doc.nombre}</strong></td>
            <td>${doc.apellido || '-'}</td>
            <td>${doc.correo}</td>
            <td>${doc.especialidad || '-'}</td>
            <td><span class="badge ${doc.activo ? 'badge-active' : 'badge-inactive'}">${doc.activo ? 'Active' : 'Inactive'}</span></td>
            <td class="actions">
                <button class="btn-icon btn-edit" onclick="openEditModalDocentes(${doc.id})">✏️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDocentes(${doc.id}, '${doc.nombre}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderPaginacionDocentes(data) {
    const container = document.getElementById('docentesPagination');
    if (data.total <= 20) { container.innerHTML = ''; return; }
    const totalPages = Math.ceil(data.total / data.limit);
    let html = '<div class="pagination">';
    if (data.page > 1) html += `<button onclick="loadDocentes(1)">« First</button><button onclick="loadDocentes(${data.page - 1})">‹ Prev</button>`;
    html += `<span class="pag-info">Page ${data.page} of ${totalPages}</span>`;
    if (data.page < totalPages) html += `<button onclick="loadDocentes(${data.page + 1})">Next ›</button><button onclick="loadDocentes(${totalPages})">Last »</button>`;
    html += '</div>';
    container.innerHTML = html;
}

async function handleFilterChangeDocentes(event) {
    filtroActual = event.target.value;
    paginaActual = 1;
    await loadDocentes(1);
}

let searchTimeoutDocentes;
function handleSearchDocentes(event) {
    clearTimeout(searchTimeoutDocentes);
    searchActual = event.target.value;
    paginaActual = 1;
    searchTimeoutDocentes = setTimeout(() => loadDocentes(1), 300);
}

function openCreateModalDocentes() {
    editandoId = null;
    document.getElementById('modalTitleEditDocente').textContent = 'Create New Teacher';
    document.getElementById('correoEditDocente').value = '';
    document.getElementById('nombreEditDocente').value = '';
    document.getElementById('apellidoEditDocente').value = '';
    document.getElementById('especialidadEditDocente').value = '';
    document.getElementById('statusEditDocente').value = '1';
    document.getElementById('modalEditarDocente').style.display = 'flex';
    clearEditErrorsDocentes();
}

async function openEditModalDocentes(idDocenteEdit) {
    try {
        const idNumericoDocente = parseInt(idDocenteEdit);
        const docente = docentesCache.find(d => parseInt(d.id) === idNumericoDocente);
        console.log('[EditModal] Buscando docente con ID:', idNumericoDocente, 'Encontrado:', docente);
        if (!docente) { showToastDocentes('Teacher not found', 'error'); return; }

        editandoId = parseInt(docente.id);
        console.log('[EditModal] editandoId asignado a:', editandoId);
        document.getElementById('modalTitleEditDocente').textContent = 'Edit Teacher';
        document.getElementById('correoEditDocente').value = docente.correo;
        document.getElementById('nombreEditDocente').value = docente.nombre;
        document.getElementById('apellidoEditDocente').value = docente.apellido || '';
        document.getElementById('especialidadEditDocente').value = docente.especialidad || '';
        // Establecer estado
        const statusValue = docente.activo ? '1' : '0';
        document.getElementById('statusEditDocente').value = statusValue;
        console.log('[EditModal] Docente cargado - nombre:', docente.nombre, 'activo:', docente.activo, 'statusValue:', statusValue);
        document.getElementById('modalEditarDocente').style.display = 'flex';
        clearEditErrorsDocentes();
    } catch (error) {
        console.error('[Docentes] Edit modal error:', error);
        showToastDocentes('Error loading teacher: ' + error.message, 'error');
    }
}

function closeEditModalDocentes() {
    document.getElementById('modalEditarDocente').style.display = 'none';
    editandoId = null;
    clearEditErrorsDocentes();
}

async function handleSaveDocente(event) {
    event.preventDefault();
    const correo = document.getElementById('correoEditDocente').value.trim();
    const nombre = document.getElementById('nombreEditDocente').value.trim();
    const apellido = document.getElementById('apellidoEditDocente').value.trim();
    const especialidad = document.getElementById('especialidadEditDocente').value.trim();
    const activo = document.getElementById('statusEditDocente').value;

    clearEditErrorsDocentes();

    if (!correo) { showEditErrorDocentes('correoEditDocente', 'Email is required'); return; }
    if (!correo.includes('@')) { showEditErrorDocentes('correoEditDocente', 'Invalid email format'); return; }
    if (!nombre) { showEditErrorDocentes('nombreEditDocente', 'Name is required'); return; }

    await saveDocente(correo, nombre, apellido, especialidad, activo);
}

async function saveDocente(correo, nombre, apellido, especialidad, activo) {
    try {
        const method = editandoId ? 'PUT' : 'POST';
        const url = editandoId ? `/api/admin/docentes/${editandoId}` : '/api/admin/docentes';
        const body = {
            correo,
            nombre,
            apellido,
            especialidad,
            activo: activo === '1'
        };
        console.log('[SaveDocente] Enviando:', { method, url, body });
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[SaveDocente] Error:', data);
            showEditErrorDocentes('formErrorEditDocente', data.error || 'Error saving teacher');
            return;
        }
        console.log('[SaveDocente] ✅ Éxito');
        showToastDocentes(editandoId ? 'Teacher updated' : 'Teacher created', 'success');
        closeEditModalDocentes();
        await loadDocentes(paginaActual);
    } catch (error) {
        console.error('[Docentes] Save error:', error);
        showEditErrorDocentes('formErrorEditDocente', 'Error saving teacher: ' + error.message);
    }
}

function confirmDeleteDocentes(id, nombre) {
    if (confirm(`Are you sure you want to delete "${nombre}"?`)) deleteDocente(id);
}

async function deleteDocente(id) {
    try {
        const response = await fetch(`/api/admin/docentes/${id}`, { method: 'DELETE', credentials: 'include' });
        const data = await response.json();
        if (!response.ok) { showToastDocentes(data.error || 'Error deleting teacher', 'error'); return; }
        showToastDocentes(data.mensaje || 'Teacher deleted successfully', 'success');
        await loadDocentes(paginaActual);
    } catch (error) {
        console.error('[Docentes] Delete error:', error);
        showToastDocentes('Error deleting teacher: ' + error.message, 'error');
    }
}

function showEditErrorDocentes(fieldId, message) {
    const errorContainer = document.getElementById(fieldId);
    if (errorContainer && fieldId.includes('Error')) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
}

function clearEditErrorsDocentes() {
    const errorDivs = ['correoEditDocente-error', 'nombreEditDocente-error', 'apellidoEditDocente-error', 'especialidadEditDocente-error', 'formErrorEditDocente'];
    errorDivs.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
}

function showToastDocentes(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) { console.log('[Toast]', message); return; }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

    window.initDocentesSection = initDocentesSection;
    window.loadDocentes = loadDocentes;
    window.openEditModalDocentes = openEditModalDocentes;
    window.confirmDeleteDocentes = confirmDeleteDocentes;
    window.openCreateModalDocentes = openCreateModalDocentes;
    window.closeEditModalDocentes = closeEditModalDocentes;
    window.handleSaveDocente = handleSaveDocente;
})();
