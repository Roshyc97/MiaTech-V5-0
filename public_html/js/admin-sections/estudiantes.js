'use strict';

(function() {
    let estudiantesCache = [];
    let paginaActual = 1;
    let filtroActual = 'activos';
    let searchActual = '';
    let editandoId = null;
    let selectedIds = new Set();

async function initEstudiantesSection() {
    console.log('[Estudiantes] Initializing section...');
    try {
        const btnNew = document.getElementById('btnNewStudent');
        if (btnNew) btnNew.addEventListener('click', openCreateModalEstudiantes);

        const btnImport = document.getElementById('btnImportEstudiantes');
        if (btnImport) btnImport.addEventListener('click', openImportModalEstudiantes);

        const btnDeleteSelected = document.getElementById('btnDeleteSelected');
        if (btnDeleteSelected) btnDeleteSelected.addEventListener('click', deleteSelectedEstudiantes);

        const btnDeleteAll = document.getElementById('btnDeleteAll');
        if (btnDeleteAll) btnDeleteAll.addEventListener('click', deleteAllEstudiantes);

        const chkSelectAll = document.getElementById('chkSelectAll');
        if (chkSelectAll) chkSelectAll.addEventListener('change', handleSelectAllEstudiantes);

        const filter = document.getElementById('filterEstudiantes');
        if (filter) filter.addEventListener('change', handleFilterChange);

        const search = document.getElementById('searchEstudiantes');
        if (search) search.addEventListener('input', handleSearch);

        const btnCancel = document.getElementById('btnCancelEditEstudiante');
        if (btnCancel) btnCancel.addEventListener('click', closeEditModalEstudiantes);

        const form = document.getElementById('formEditarEstudiante');
        if (form) form.addEventListener('submit', handleSaveEstudiante);

        await loadEstudiantes(1);
    } catch (error) {
        console.error('[Estudiantes] Init error:', error);
    }
}

async function loadEstudiantes(page = 1) {
    try {
        console.log('[Estudiantes] Loading page', page);
        const params = new URLSearchParams({ page, limit: 20, search: searchActual, filtro: filtroActual });
        const response = await fetch(`/api/admin/estudiantes?${params}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        if (!data.ok) { showToastEstudiantes(data.error || 'Error loading students', 'error'); return; }
        estudiantesCache = data.estudiantes;
        // Convertir activo a booleano para consistent handling en la tabla
        estudiantesCache.forEach(est => {
            est.activo = !!parseInt(est.activo);
            console.log('[LoadEstudiantes] Est:', est.nombre, 'activo:', est.activo, 'tipo:', typeof est.activo);
        });
        paginaActual = page;
        renderTablaEstudiantes(data);
        renderPaginacionEstudiantes(data);
    } catch (error) {
        console.error('[Estudiantes] Load error:', error);
        showToastEstudiantes('Error loading students: ' + error.message, 'error');
    }
}

function renderTablaEstudiantes(data) {
    const tbody = document.getElementById('estudiantesTableBody');
    if (!estudiantesCache || estudiantesCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px;">No students found</td></tr>';
        selectedIds.clear();
        updateDeleteButtons();
        return;
    }
    tbody.innerHTML = estudiantesCache.map(est => `
        <tr>
            <td style="width: 30px;"><input type="checkbox" class="chk-estudiante" value="${est.id}" onchange="handleCheckboxEstudiante(this, ${est.id})"></td>
            <td>${est.correo}</td>
            <td>${est.nombre}</td>
            <td>${est.apellido || '-'}</td>
            <td>${est.cedula}</td>
            <td><strong>${est.periodo || 'Sin asignar'}</strong></td>
            <td style="text-align: center;">${est.intentos_count > 0 ? 'Si' : 'No'}</td>
            <td><span class="badge ${est.activo ? 'badge-active' : 'badge-inactive'}" style="cursor: pointer;" onclick="toggleEstadoEstudiante(${est.id}, ${est.activo ? 0 : 1})">${est.activo ? 'Active' : 'Inactive'}</span></td>
            <td class="actions">
                <button class="btn-icon btn-edit" onclick="openEditModalEstudiantes(${est.id})" title="Edit">✏️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteEstudiantes(${est.id}, '${est.nombre}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');

    updateDeleteButtons();
}

function renderPaginacionEstudiantes(data) {
    const container = document.getElementById('estudiantesPagination');
    if (data.total_paginas <= 1) { container.innerHTML = ''; return; }
    let html = '<div class="pagination">';
    if (data.pagina > 1) html += `<button onclick="loadEstudiantes(1)">« First</button><button onclick="loadEstudiantes(${data.pagina - 1})">‹ Prev</button>`;
    html += `<span class="pag-info">Page ${data.pagina} of ${data.total_paginas}</span>`;
    if (data.pagina < data.total_paginas) html += `<button onclick="loadEstudiantes(${data.pagina + 1})">Next ›</button><button onclick="loadEstudiantes(${data.total_paginas})">Last »</button>`;
    html += '</div>';
    container.innerHTML = html;
}

async function handleFilterChange(event) {
    filtroActual = event.target.value;
    paginaActual = 1;
    await loadEstudiantes(1);
}

let searchTimeout;
function handleSearch(event) {
    clearTimeout(searchTimeout);
    searchActual = event.target.value;
    paginaActual = 1;
    searchTimeout = setTimeout(() => loadEstudiantes(1), 300);
}

async function openCreateModalEstudiantes() {
    editandoId = null;
    document.getElementById('modalTitleEditEstudiante').textContent = 'Create New Student';
    document.getElementById('correoEditEstudiante').value = '';
    document.getElementById('nombreEditEstudiante').value = '';
    document.getElementById('apellidoEditEstudiante').value = '';
    document.getElementById('cedulaEditEstudiante').value = '';
    document.getElementById('statusEditEstudiante').value = '1';
    document.getElementById('intentosEditEstudiante').value = '0';

    // Cargar períodos
    await loadPeridosForEdit();

    document.getElementById('modalEditarEstudiante').style.display = 'flex';
    clearEditErrorsEstudiantes();
}

async function openEditModalEstudiantes(id) {
    try {
        const response = await fetch(`/api/admin/estudiantes/${id}`, { credentials: 'include' });
        if (!response.ok) { showToastEstudiantes('Error loading student data', 'error'); return; }
        const data = await response.json();
        if (!data.ok) { showToastEstudiantes(data.error || 'Error loading student', 'error'); return; }

        const est = data.estudiante;
        // Convertir activo a booleano para consistent handling
        est.activo = !!parseInt(est.activo);
        console.log('[EditModal] Estudiante cargado:', est);
        console.log('[EditModal] Periodo:', est.periodo);
        console.log('[EditModal] Activo:', est.activo, '(tipo:', typeof est.activo, ')');

        editandoId = est.id;
        document.getElementById('modalTitleEditEstudiante').textContent = 'Edit Student';
        document.getElementById('correoEditEstudiante').value = est.correo;
        document.getElementById('nombreEditEstudiante').value = est.nombre;
        document.getElementById('apellidoEditEstudiante').value = est.apellido || '';
        document.getElementById('cedulaEditEstudiante').value = est.cedula;

        // Establecer status
        const statusValue = est.activo ? '1' : '0';
        document.getElementById('statusEditEstudiante').value = statusValue;
        console.log('[EditModal] Status seteado a:', statusValue);

        // Cargar períodos
        await loadPeridosForEdit();

        // Establecer período actual del estudiante
        if (est.periodo && est.periodo.id) {
            const periodoValue = String(est.periodo.id);
            document.getElementById('periodoEditEstudiante').value = periodoValue;
            console.log('[EditModal] Periodo seteado a:', periodoValue, '(actual value en select:', document.getElementById('periodoEditEstudiante').value, ')');
        } else {
            console.log('[EditModal] No hay periodo asignado o no tiene ID');
        }

        // Mostrar intentos en read-only
        if (est.intentos && est.intentos.length >= 0) {
            document.getElementById('intentosEditEstudiante').value = est.intentos.length;
            console.log('[EditModal] Intentos mostrados:', est.intentos.length);
        }

        document.getElementById('modalEditarEstudiante').style.display = 'flex';
        clearEditErrorsEstudiantes();
    } catch (error) {
        console.error('[Estudiantes] Edit modal error:', error);
        showToastEstudiantes('Error loading student: ' + error.message, 'error');
    }
}

async function loadPeridosForEdit() {
    try {
        const response = await fetch('/api/admin/periodos?limit=100', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        if (data.ok && data.periodos) {
            const select = document.getElementById('periodoEditEstudiante');
            select.innerHTML = '<option value="">Select a period...</option>';
            console.log('[Periodos] Periodos cargados:', data.periodos);
            data.periodos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.periodo}`;
                select.appendChild(opt);
                console.log(`[Periodos] Agregado option: value=${p.id}, text=${p.periodo}`);
            });
        }
    } catch (err) {
        console.error('[Estudiantes] Error loading periods:', err);
    }
}

function closeEditModalEstudiantes() {
    document.getElementById('modalEditarEstudiante').style.display = 'none';
    editandoId = null;
    clearEditErrorsEstudiantes();
}

async function handleSaveEstudiante(event) {
    event.preventDefault();
    const correo = document.getElementById('correoEditEstudiante').value.trim();
    const nombre = document.getElementById('nombreEditEstudiante').value.trim();
    const apellido = document.getElementById('apellidoEditEstudiante').value.trim();
    const cedula = document.getElementById('cedulaEditEstudiante').value.trim();
    const periodoId = document.getElementById('periodoEditEstudiante').value;
    const activo = document.getElementById('statusEditEstudiante').value;

    console.log('[Save] Valores capturados del formulario:');
    console.log('  - correo:', correo);
    console.log('  - nombre:', nombre);
    console.log('  - apellido:', apellido);
    console.log('  - cedula:', cedula);
    console.log('  - periodoId:', periodoId, '(tipo:', typeof periodoId, ')');
    console.log('  - activo (status):', activo, '(tipo:', typeof activo, ')');
    console.log('  - editandoId:', editandoId);

    clearEditErrorsEstudiantes();

    if (!correo) { showEditErrorEstudiantes('correoEditEstudiante', 'Email is required'); return; }
    if (!correo.includes('@')) { showEditErrorEstudiantes('correoEditEstudiante', 'Invalid email format'); return; }
    if (!nombre) { showEditErrorEstudiantes('nombreEditEstudiante', 'Name is required'); return; }
    if (nombre.length < 3) { showEditErrorEstudiantes('nombreEditEstudiante', 'Name must be at least 3 characters'); return; }
    if (!apellido) { showEditErrorEstudiantes('apellidoEditEstudiante', 'Last name is required'); return; }
    if (apellido.length < 2) { showEditErrorEstudiantes('apellidoEditEstudiante', 'Last name must be at least 2 characters'); return; }
    if (!cedula) { showEditErrorEstudiantes('cedulaEditEstudiante', 'ID is required'); return; }
    if (!/^\d+$/.test(cedula)) { showEditErrorEstudiantes('cedulaEditEstudiante', 'ID must contain only numbers'); return; }
    if (!periodoId) { showEditErrorEstudiantes('periodoEditEstudiante', 'Period is required'); return; }
    if (!activo) { showEditErrorEstudiantes('statusEditEstudiante', 'Status is required'); return; }

    console.log('[Save] ✅ Todas las validaciones pasaron');
    await saveEstudiante(correo, nombre, apellido, cedula, periodoId, activo);
}

async function saveEstudiante(correo, nombre, apellido, cedula, periodoId, activo) {
    try {
        const method = editandoId ? 'PUT' : 'POST';
        const url = editandoId ? `/api/admin/estudiantes/${editandoId}` : '/api/admin/estudiantes';

        // Construir body con TODOS los campos necesarios
        const body = {
            correo,
            nombre,
            apellido,
            cedula,
            periodo_id: parseInt(periodoId),  // SIEMPRE enviar - validado antes
            activo: activo === '1'             // SIEMPRE enviar - convertir a booleano
        };

        console.log('[Save] Construcción del body:');
        console.log('  - correo:', body.correo);
        console.log('  - nombre:', body.nombre);
        console.log('  - apellido:', body.apellido);
        console.log('  - cedula:', body.cedula);
        console.log('  - periodo_id:', body.periodo_id, '(tipo:', typeof body.periodo_id, ')');
        console.log('  - activo:', body.activo, '(tipo:', typeof body.activo, ')');
        console.log('[Save] Enviando datos (método:', method, '| url:', url, '):', body);

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include'
        });
        
        console.log('[Save] Response status:', response.status);
        const data = await response.json();
        
        if (!response.ok) { 
            console.error('[Save] Error response:', data);
            showEditErrorEstudiantes('formErrorEstudiante', data.error || 'Error saving student'); 
            return; 
        }
        
        console.log('[Save] ✅ Éxito:', data);
        showToastEstudiantes(data.mensaje || 'Student saved successfully', 'success');
        closeEditModalEstudiantes();
        await loadEstudiantes(paginaActual);
    } catch (error) {
        console.error('[Estudiantes] Save error:', error);
        showEditErrorEstudiantes('formErrorEstudiante', 'Error saving student: ' + error.message);
    }
}

function confirmDeleteEstudiantes(id, nombre) {
    if (confirm(`Are you sure you want to delete "${nombre}"?`)) deleteEstudiante(id);
}

async function deleteEstudiante(id) {
    try {
        const response = await fetch(`/api/admin/estudiantes/${id}`, { method: 'DELETE', credentials: 'include' });
        const data = await response.json();
        if (!response.ok) { showToastEstudiantes(data.error || 'Error deleting student', 'error'); return; }
        showToastEstudiantes(data.mensaje || 'Student deleted successfully', 'success');
        await loadEstudiantes(paginaActual);
    } catch (error) {
        console.error('[Estudiantes] Delete error:', error);
        showToastEstudiantes('Error deleting student: ' + error.message, 'error');
    }
}

async function toggleEstadoEstudiante(idEstudianteToggle, nuevoEstadoToggle) {
    try {
        console.log('[toggleEstado] Cambiando estudiante', idEstudianteToggle, 'a estado:', nuevoEstadoToggle);
        const response = await fetch(`/api/admin/estudiantes/${idEstudianteToggle}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: nuevoEstadoToggle }),
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[toggleEstado] Error:', data);
            showToastEstudiantes(data.error || 'Error updating status', 'error');
            return;
        }
        console.log('[toggleEstado] ✅ Estado actualizado');
        showToastEstudiantes('Student status updated successfully', 'success');
        await loadEstudiantes(paginaActual);
    } catch (error) {
        console.error('[Estudiantes] Toggle estado error:', error);
        showToastEstudiantes('Error updating status: ' + error.message, 'error');
    }
}

function showEditErrorEstudiantes(fieldId, message) {
    const errorContainer = document.getElementById(fieldId);
    if (errorContainer && fieldId.includes('Error')) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
}

function clearEditErrorsEstudiantes() {
    const errorDivs = ['correoEditEstudiante-error', 'nombreEditEstudiante-error', 'cedulaEditEstudiante-error', 'periodoEditEstudiante-error', 'formErrorEstudiante'];
    errorDivs.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
}

function showToastEstudiantes(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) { console.log('[Toast]', message); return; }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ============================================
// Selección Múltiple
// ============================================
function handleCheckboxEstudiante(checkbox, id) {
    if (checkbox.checked) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
    }
    updateDeleteButtons();
    updateSelectAllCheckbox();
}

function handleSelectAllEstudiantes(e) {
    const checkboxes = document.querySelectorAll('.chk-estudiante');
    selectedIds.clear();
    checkboxes.forEach(chk => {
        chk.checked = e.target.checked;
        if (e.target.checked) {
            selectedIds.add(parseInt(chk.value));
        }
    });
    updateDeleteButtons();
}

function updateSelectAllCheckbox() {
    const chkSelectAll = document.getElementById('chkSelectAll');
    if (!chkSelectAll) return;
    const checkboxes = document.querySelectorAll('.chk-estudiante');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(c => c.checked);
    chkSelectAll.checked = allChecked;
}

function updateDeleteButtons() {
    const btnDeleteSelected = document.getElementById('btnDeleteSelected');
    const btnDeleteAll = document.getElementById('btnDeleteAll');
    if (btnDeleteSelected) btnDeleteSelected.style.display = selectedIds.size > 0 ? 'inline-block' : 'none';
    if (btnDeleteAll) btnDeleteAll.style.display = estudiantesCache.length > 0 ? 'inline-block' : 'none';
}

async function deleteSelectedEstudiantes() {
    if (selectedIds.size === 0) {
        showToastEstudiantes('No students selected', 'warning');
        return;
    }

    if (!confirm(`¿Eliminar ${selectedIds.size} estudiante(s)?`)) return;

    try {
        let deleted = 0;
        for (const id of selectedIds) {
            const response = await fetch(`/api/admin/estudiantes/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) deleted++;
        }
        showToastEstudiantes(`✓ Deleted ${deleted} students`, 'success');
        selectedIds.clear();
        await loadEstudiantes(paginaActual);
    } catch (err) {
        console.error('[Estudiantes] Error deleting:', err);
        showToastEstudiantes('Error deleting students: ' + err.message, 'error');
    }
}

async function deleteAllEstudiantes() {
    if (estudiantesCache.length === 0) {
        showToastEstudiantes('No students to delete', 'warning');
        return;
    }

    if (!confirm(`¿ELIMINAR TODOS LOS ${estudiantesCache.length} ESTUDIANTES? Esta acción no se puede deshacer.`)) return;

    try {
        let deleted = 0;
        for (const est of estudiantesCache) {
            const response = await fetch(`/api/admin/estudiantes/${est.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) deleted++;
        }
        showToastEstudiantes(`✓ Deleted all ${deleted} students`, 'success');
        selectedIds.clear();
        await loadEstudiantes(1);
    } catch (err) {
        console.error('[Estudiantes] Error deleting all:', err);
        showToastEstudiantes('Error deleting students: ' + err.message, 'error');
    }
}

// ============================================
// FASE A: Importación Masiva de CSV
// ============================================
function openImportModalEstudiantes() {
    const html = `
        <div id="modalImportEstudiantes" class="modal-overlay" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Students from CSV</h3>
                </div>
                <form id="formImportEstudiantes" style="padding: 20px;">
                    <div class="form-group">
                        <label>Academic Period *</label>
                        <select id="periodoImportEstudiantes" required style="width: 100%;">
                            <option value="">Select a period...</option>
                        </select>
                        <div id="periodoImportEstudiantes-error" class="form-error"></div>
                    </div>
                    <div class="form-group">
                        <label>Group Name</label>
                        <input type="text" id="grupoImportEstudiantes" placeholder="e.g., 101-A" style="width: 100%;">
                    </div>
                    <div class="form-group">
                        <label>CSV File *</label>
                        <input type="file" id="archivoImportEstudiantes" accept=".csv,.xlsx" required style="width: 100%;">
                        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                            Columns: nombre, correo, cedula
                        </p>
                        <div id="archivoImportEstudiantes-error" class="form-error"></div>
                    </div>
                    <div id="formErrorImportEstudiantes" class="form-error"></div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn-primary">Import</button>
                        <button type="button" class="btn-secondary" onclick="closeImportModalEstudiantes()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    loadPeridosForImport();
    document.getElementById('formImportEstudiantes').addEventListener('submit', handleImportEstudiantes);
}

function closeImportModalEstudiantes() {
    const modal = document.getElementById('modalImportEstudiantes');
    if (modal) modal.remove();
}

async function loadPeridosForImport() {
    try {
        const response = await fetch('/api/admin/periodos?limit=100', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        if (data.ok && data.periodos) {
            const select = document.getElementById('periodoImportEstudiantes');
            data.periodos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.periodo} (${new Date(p.fecha_inicio).toLocaleDateString()} - ${new Date(p.fecha_fin).toLocaleDateString()})`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('[Import] Error loading periods:', err);
    }
}

async function handleImportEstudiantes(event) {
    event.preventDefault();
    const periodoId = document.getElementById('periodoImportEstudiantes').value.trim();
    const nombreGrupo = document.getElementById('grupoImportEstudiantes').value.trim() || 'Import';
    const archivo = document.getElementById('archivoImportEstudiantes').files[0];

    const clearErrors = () => {
        ['periodoImportEstudiantes-error', 'archivoImportEstudiantes-error', 'formErrorImportEstudiantes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = ''; el.style.display = 'none'; }
        });
    };
    clearErrors();

    if (!periodoId) {
        document.getElementById('periodoImportEstudiantes-error').textContent = 'Select a period';
        document.getElementById('periodoImportEstudiantes-error').style.display = 'block';
        return;
    }
    if (!archivo) {
        document.getElementById('archivoImportEstudiantes-error').textContent = 'Select a CSV file';
        document.getElementById('archivoImportEstudiantes-error').style.display = 'block';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('periodo_id', periodoId);
        formData.append('nombre_grupo', nombreGrupo);
        formData.append('archivo', archivo);

        const response = await fetch('/api/admin/estudiantes/importar-masivo', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            document.getElementById('formErrorImportEstudiantes').textContent = data.error || 'Import error';
            document.getElementById('formErrorImportEstudiantes').style.display = 'block';
            return;
        }
        showToastEstudiantes(`✓ Imported ${data.insertados}/${data.total} students`, 'success');
        closeImportModalEstudiantes();
        await loadEstudiantes(1);
    } catch (err) {
        console.error('[Import] Error:', err);
        document.getElementById('formErrorImportEstudiantes').textContent = 'Error: ' + err.message;
        document.getElementById('formErrorImportEstudiantes').style.display = 'block';
    }
}

// ============================================
// FASE C: Historial de Intentos
// ============================================
async function showIntentosEstudiante(estId) {
    try {
        const response = await fetch(`/api/admin/estudiantes/${estId}/intentos`, { credentials: 'include' });
        if (!response.ok) { showToastEstudiantes('Error loading attempts', 'error'); return; }
        const data = await response.json();
        if (!data.ok) { showToastEstudiantes(data.error || 'Error loading attempts', 'error'); return; }

        const est = estudiantesCache.find(e => e.id === estId);
        const html = `
            <div id="modalIntentosEstudiante" class="modal-overlay" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Evaluation Attempts - ${est.nombre}</h3>
                        <button type="button" onclick="document.getElementById('modalIntentosEstudiante').remove()" style="position: absolute; right: 20px; top: 20px; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
                    </div>
                    <div style="overflow-y: auto; max-height: 400px;">
                        ${data.intentos.length === 0 ? '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No attempts recorded</p>' : `
                        <table style="width: 100%; font-size: 12px;">
                            <thead style="position: sticky; top: 0; background: var(--bg-secondary);">
                                <tr>
                                    <th style="text-align: left; padding: 10px;">Date</th>
                                    <th style="text-align: center; padding: 10px;">Result</th>
                                    <th style="text-align: center; padding: 10px;">Duration (s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.intentos.map(int => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 10px;">${new Date(int.fecha_intento).toLocaleString()}</td>
                                        <td style="text-align: center; padding: 10px;"><strong>${int.resultado_cefr || '-'}</strong></td>
                                        <td style="text-align: center; padding: 10px;">${int.duracion_seg || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                    <p style="margin-top: 15px; font-size: 12px; color: var(--text-secondary);">Total: ${data.intentos.length} attempts</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    } catch (err) {
        console.error('[Intentos] Error:', err);
        showToastEstudiantes('Error loading attempts: ' + err.message, 'error');
    }
}

    // Exportar funciones globales para acceso desde HTML
    window.initEstudiantesSection = initEstudiantesSection;
    window.loadEstudiantes = loadEstudiantes;
    window.openEditModalEstudiantes = openEditModalEstudiantes;
    window.confirmDeleteEstudiantes = confirmDeleteEstudiantes;
    window.openCreateModalEstudiantes = openCreateModalEstudiantes;
    window.closeEditModalEstudiantes = closeEditModalEstudiantes;
    window.handleSaveEstudiante = handleSaveEstudiante;
    window.openImportModalEstudiantes = openImportModalEstudiantes;
    window.closeImportModalEstudiantes = closeImportModalEstudiantes;
    window.showIntentosEstudiante = showIntentosEstudiante;
    window.handleCheckboxEstudiante = handleCheckboxEstudiante;
    window.handleSelectAllEstudiantes = handleSelectAllEstudiantes;
    window.deleteSelectedEstudiantes = deleteSelectedEstudiantes;
    window.deleteAllEstudiantes = deleteAllEstudiantes;
    window.toggleEstadoEstudiante = toggleEstadoEstudiante;
})();
