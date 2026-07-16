'use strict';

(function() {
    let periodosCache = [];
    let paginaActual = 1;
    let filtroActual = 'todos';
    let editandoId = null;

async function initPeriodosSection() {
    console.log('[Periodos] Initializing section...');
    try {
        const btnNew = document.getElementById('btnNewPeriodo');
        if (btnNew) btnNew.addEventListener('click', openCreateModalPeriodos);

        const filter = document.getElementById('filterPeriodos');
        if (filter) filter.addEventListener('change', handleFilterChangePeriodos);

        const btnCancel = document.getElementById('btnCancelEditPeriodo');
        if (btnCancel) btnCancel.addEventListener('click', closeEditModalPeriodos);

        const form = document.getElementById('formEditarPeriodo');
        if (form) form.addEventListener('submit', handleSavePeriodo);

        await loadPeriodos(1);
    } catch (error) {
        console.error('[Periodos] Init error:', error);
    }
}

async function loadPeriodos(page = 1) {
    try {
        console.log('[Periodos] Loading page', page);
        const params = new URLSearchParams({ page, limit: 20, filtro: filtroActual });
        const response = await fetch(`/api/admin/periodos?${params}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        if (!data.ok) { showToastPeriodos(data.error || 'Error loading periods', 'error'); return; }
        periodosCache = data.periodos;
        // Convertir activo a booleano para consistent handling
        periodosCache.forEach(per => {
            per.activo = !!parseInt(per.activo);
            per.id = parseInt(per.id);
            console.log('[LoadPeriodos] Per:', per.periodo, 'activo:', per.activo, 'id:', per.id);
        });
        paginaActual = page;
        renderTablaPeriodos(data);
        renderPaginacionPeriodos(data);
    } catch (error) {
        console.error('[Periodos] Load error:', error);
        showToastPeriodos('Error loading periods: ' + error.message, 'error');
    }
}

function renderTablaPeriodos(data) {
    const tbody = document.getElementById('periodosTableBody');
    if (!periodosCache || periodosCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px;">No periods found</td></tr>';
        return;
    }
    tbody.innerHTML = periodosCache.map(per => {
        const inicio = new Date(per.fecha_inicio).toLocaleDateString('es-ES');
        const fin = new Date(per.fecha_fin).toLocaleDateString('es-ES');
        return `
            <tr onclick="loadEvaluacionesPeriodo(${per.id}, '${per.periodo}')" style="cursor: pointer;">
                <td><strong>${per.periodo}</strong></td>
                <td>${inicio}</td>
                <td>${fin}</td>
                <td><span class="badge ${per.activo ? 'badge-active' : 'badge-inactive'}">${per.activo ? 'Active' : 'Inactive'}</span></td>
                <td class="actions" onclick="event.stopPropagation();">
                    <button class="btn-icon btn-edit" onclick="openEditModalPeriodos(${per.id})">✏️</button>
                    <button class="btn-icon btn-delete" onclick="confirmDeletePeriodos(${per.id}, '${per.periodo}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPaginacionPeriodos(data) {
    const container = document.getElementById('periodosPagination');
    if (data.total <= 20) { container.innerHTML = ''; return; }
    const totalPages = Math.ceil(data.total / data.limit);
    let html = '<div class="pagination">';
    if (data.page > 1) html += `<button onclick="loadPeriodos(1)">« First</button><button onclick="loadPeriodos(${data.page - 1})">‹ Prev</button>`;
    html += `<span class="pag-info">Page ${data.page} of ${totalPages}</span>`;
    if (data.page < totalPages) html += `<button onclick="loadPeriodos(${data.page + 1})">Next ›</button><button onclick="loadPeriodos(${totalPages})">Last »</button>`;
    html += '</div>';
    container.innerHTML = html;
}

async function handleFilterChangePeriodos(event) {
    filtroActual = event.target.value;
    paginaActual = 1;
    await loadPeriodos(1);
}

function openCreateModalPeriodos() {
    editandoId = null;
    document.getElementById('modalTitleEditPeriodo').textContent = 'Create New Period';
    document.getElementById('periodoEditPeriodo').value = '';
    document.getElementById('fechaInicioEditPeriodo').value = '';
    document.getElementById('fechaFinEditPeriodo').value = '';
    document.getElementById('statusEditPeriodo').value = '1';
    document.getElementById('modalEditarPeriodo').style.display = 'flex';
    clearEditErrorsPeriodos();
}

async function openEditModalPeriodos(idPeriodoEdit) {
    try {
        const idNumericoPeriodo = parseInt(idPeriodoEdit);
        const periodo = periodosCache.find(p => parseInt(p.id) === idNumericoPeriodo);
        console.log('[EditModal] Buscando período con ID:', idNumericoPeriodo, 'Encontrado:', periodo);
        if (!periodo) { showToastPeriodos('Period not found', 'error'); return; }

        editandoId = parseInt(periodo.id);
        console.log('[EditModal] editandoId asignado a:', editandoId);
        document.getElementById('modalTitleEditPeriodo').textContent = 'Edit Period';
        document.getElementById('periodoEditPeriodo').value = periodo.periodo;
        // Formatear fechas: el input type="date" requiere YYYY-MM-DD
        const fechaInicio = new Date(periodo.fecha_inicio).toISOString().split('T')[0];
        const fechaFin = new Date(periodo.fecha_fin).toISOString().split('T')[0];
        document.getElementById('fechaInicioEditPeriodo').value = fechaInicio;
        document.getElementById('fechaFinEditPeriodo').value = fechaFin;
        // Establecer estado
        const statusValue = periodo.activo ? '1' : '0';
        document.getElementById('statusEditPeriodo').value = statusValue;
        console.log('[EditModal] Período cargado - periodo:', periodo.periodo, 'activo:', periodo.activo, 'statusValue:', statusValue);
        document.getElementById('modalEditarPeriodo').style.display = 'flex';
        clearEditErrorsPeriodos();
    } catch (error) {
        console.error('[Periodos] Edit modal error:', error);
        showToastPeriodos('Error loading period: ' + error.message, 'error');
    }
}

function closeEditModalPeriodos() {
    document.getElementById('modalEditarPeriodo').style.display = 'none';
    editandoId = null;
    clearEditErrorsPeriodos();
}

async function handleSavePeriodo(event) {
    event.preventDefault();
    const periodo = document.getElementById('periodoEditPeriodo').value.trim().toUpperCase();
    const fechaInicio = document.getElementById('fechaInicioEditPeriodo').value.trim();
    const fechaFin = document.getElementById('fechaFinEditPeriodo').value.trim();
    const activo = document.getElementById('statusEditPeriodo').value;

    clearEditErrorsPeriodos();

    if (!periodo) { showEditErrorPeriodos('periodoEditPeriodo', 'Period is required'); return; }
    if (!/^[0-9]{4}[A-Z]$/.test(periodo)) { showEditErrorPeriodos('periodoEditPeriodo', 'Invalid format (ej: 2025A)'); return; }
    if (!fechaInicio) { showEditErrorPeriodos('fechaInicioEditPeriodo', 'Start date is required'); return; }
    if (!fechaFin) { showEditErrorPeriodos('fechaFinEditPeriodo', 'End date is required'); return; }
    if (new Date(fechaFin) <= new Date(fechaInicio)) { showEditErrorPeriodos('fechaFinEditPeriodo', 'End date must be after start date'); return; }

    await savePeriodo(periodo, fechaInicio, fechaFin, activo);
}

async function savePeriodo(periodo, fechaInicio, fechaFin, activo) {
    try {
        const method = editandoId ? 'PUT' : 'POST';
        const url = editandoId ? `/api/admin/periodos/${editandoId}` : '/api/admin/periodos';
        const body = {
            periodo,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            activo: activo === '1'
        };
        console.log('[SavePeriodo] Enviando:', { method, url, body });
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[SavePeriodo] Error:', data);
            showEditErrorPeriodos('formErrorPeriodo', data.error || 'Error saving period');
            return;
        }
        console.log('[SavePeriodo] ✅ Éxito');
        showToastPeriodos(data.mensaje || 'Period saved successfully', 'success');
        closeEditModalPeriodos();
        await loadPeriodos(paginaActual);
    } catch (error) {
        console.error('[Periodos] Save error:', error);
        showEditErrorPeriodos('formErrorPeriodo', 'Error saving period: ' + error.message);
    }
}

function confirmDeletePeriodos(id, periodo) {
    if (confirm(`Are you sure you want to delete "${periodo}"?`)) deletePeriodo(id);
}

async function deletePeriodo(id) {
    try {
        const response = await fetch(`/api/admin/periodos/${id}`, { method: 'DELETE', credentials: 'include' });
        const data = await response.json();
        if (!response.ok) { showToastPeriodos(data.error || 'Error deleting period', 'error'); return; }
        showToastPeriodos(data.mensaje || 'Period deleted successfully', 'success');
        await loadPeriodos(paginaActual);
    } catch (error) {
        console.error('[Periodos] Delete error:', error);
        showToastPeriodos('Error deleting period: ' + error.message, 'error');
    }
}

async function loadEvaluacionesPeriodo(periodId, periodNombre) {
    try {
        console.log('[Periodos] Loading evaluations for period:', periodNombre);
        const response = await fetch(`/api/admin/periodos/${periodId}/evaluaciones?limit=100`, { credentials: 'include' });
        if (!response.ok) { showToastPeriodos('Error loading evaluations', 'error'); return; }
        const data = await response.json();
        if (!data.ok) { showToastPeriodos(data.error || 'Error loading evaluations', 'error'); return; }
        showEvaluacionesModal(data);
    } catch (error) {
        console.error('[Periodos] Evaluations error:', error);
        showToastPeriodos('Error loading evaluations: ' + error.message, 'error');
    }
}

function showEvaluacionesModal(data) {
    const html = `
        <div id="modalEvaluaciones" class="modal-overlay" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Evaluations for Period ${data.periodo.periodo}</h3>
                    <button type="button" onclick="document.getElementById('modalEvaluaciones').remove()" style="position: absolute; background: grey; border: none; font-size: 20px; cursor: pointer;">×</button>
                </div>
                <div style="overflow-y: auto; max-height: 400px;">
                    <table style="width: 100%; font-size: 12px;">
                        <thead style="position: sticky; top: 0; background: var(--bg-secondary);">
                            <tr>
                                <th style="text-align: left; padding: 10px;">Email</th>
                                <th style="text-align: left; padding: 10px;">Name</th>
                                <th style="text-align: center; padding: 10px;">Level</th>
                                <th style="text-align: center; padding: 10px;">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.evaluaciones.map(ev => `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 10px;">${ev.estudiante_email}</td>
                                    <td style="padding: 10px;">${ev.estudiante_nombre}</td>
                                    <td style="text-align: center; padding: 10px;"><strong>${ev.resultado_cefr}</strong></td>
                                    <td style="text-align: center; padding: 10px; font-size: 11px;">${new Date(ev.timestamp).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p style="margin-top: 15px; font-size: 12px; color: var(--text-secondary);">Total: ${data.total} evaluations</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function showEditErrorPeriodos(fieldId, message) {
    const errorContainer = document.getElementById(fieldId);
    if (errorContainer && fieldId.includes('Error')) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
}

function clearEditErrorsPeriodos() {
    const errorDivs = ['periodoEditPeriodo-error', 'fechaInicioEditPeriodo-error', 'fechaFinEditPeriodo-error', 'formErrorPeriodo'];
    errorDivs.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
}

function showToastPeriodos(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) { console.log('[Toast]', message); return; }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

    window.initPeriodosSection = initPeriodosSection;
    window.loadPeriodos = loadPeriodos;
    window.openEditModalPeriodos = openEditModalPeriodos;
    window.confirmDeletePeriodos = confirmDeletePeriodos;
    window.openCreateModalPeriodos = openCreateModalPeriodos;
    window.closeEditModalPeriodos = closeEditModalPeriodos;
    window.handleSavePeriodo = handleSavePeriodo;
    window.loadEvaluacionesPeriodo = loadEvaluacionesPeriodo;
})();
