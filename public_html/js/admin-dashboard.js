'use strict';

// ============================================
// MI@TECH 5.0 - Admin Dashboard
// ============================================

let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    await initDashboard();
});

/**
 * Inicializar dashboard
 */
async function initDashboard() {
    try {
        // 1. Obtener usuario actual
        currentUser = await fetchCurrentUser();

        if (!currentUser || currentUser.tipo !== 'admin') {
            console.warn('[Dashboard] Not authenticated as admin, redirecting to login');
            window.location.href = '/admin-login.html';
            return;
        }

        console.log('[Dashboard] ✅ User authenticated:', currentUser.rol);

        // 2. Configurar UI según rol
        setupUI(currentUser);

        // 3. Generar menú según rol
        generateMenu(currentUser.rol);

        // 4. Cargar sección por defecto
        await loadSection('dashboard', currentUser.rol);

        // 5. Setup event listeners
        setupEventListeners();

        // 6. Si debe cambiar contraseña, mostrar modal
        const params = new URLSearchParams(window.location.search);
        if (params.get('mustChangePassword') === 'true') {
            showChangePasswordModal();
        }

    } catch (error) {
        console.error('[Dashboard] Init error:', error);
        window.location.href = '/admin-login.html';
    }
}

/**
 * Obtener usuario actual
 */
async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            console.warn('[Dashboard] No active session');
            return null;
        }

        const data = await response.json();
        return data.ok ? data : null;
    } catch (error) {
        console.error('[Dashboard] Fetch user error:', error);
        return null;
    }
}

/**
 * Configurar UI según usuario
 */
function setupUI(user) {
    document.getElementById('userName').textContent = user.nombre || 'Admin';
    document.getElementById('userRole').textContent = (user.rol || 'admin').toUpperCase();
    document.getElementById('sectionTitle').textContent = 'Dashboard';

    console.log('[Dashboard] UI configured for role:', user.rol);
}

/**
 * Generar menú según rol
 */
function generateMenu(rol) {
    const menus = {
        'ti': [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'estudiantes', label: 'Students', icon: '👥' },
            { id: 'periodos', label: 'Periods', icon: '📅' },
            { id: 'docentes', label: 'Teachers', icon: '👨‍🏫' },
            { id: 'administradores', label: 'Administrators', icon: '🔑' },
            { id: 'evaluaciones', label: 'Evaluations', icon: '📋' },
            { id: 'config', label: 'Configuration', icon: '⚙️' },
            { id: 'audit', label: 'Audit Log', icon: '📝' }
        ],
        'coordinador': [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'estudiantes', label: 'Students', icon: '👥' },
            { id: 'periodos', label: 'Periods', icon: '📅' },
            { id: 'docentes', label: 'Teachers', icon: '👨‍🏫' },
            { id: 'evaluaciones', label: 'Evaluations', icon: '📋' }
        ],
        'docente': [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'estudiantes', label: 'Students', icon: '👥' },
            { id: 'evaluaciones', label: 'Evaluations', icon: '📋' }
        ]
    };

    const userMenu = menus[rol] || menus['docente'];
    const navContainer = document.getElementById('sidebarMenu');

    navContainer.innerHTML = userMenu.map(item => `
        <a href="#" class="nav-item" data-section="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
        </a>
    `).join('');

    // Agregar click handlers
    navContainer.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            await loadSection(section, rol);
            setActiveNav(section);
        });
    });

    // Establecer primer item como activo
    setActiveNav('dashboard');

    console.log('[Dashboard] Menu generated for role:', rol);
}

/**
 * Cargar sección dinámicamente
 */
async function loadSection(section, rol) {
    const contentArea = document.getElementById('contentArea');

    // Actualizar título
    const navItem = document.querySelector(`[data-section="${section}"]`);
    if (navItem) {
        const label = navItem.querySelector('.nav-label').textContent;
        document.getElementById('sectionTitle').textContent = label;
    }

    // Mostrar placeholder
    contentArea.innerHTML = `
        <div class="loading-placeholder">
            <div class="spinner"></div>
            <p>Loading ${section}...</p>
        </div>
    `;

    // Obtener contenido de sección
    const sectionContent = getContentForSection(section, rol);

    // Transición suave
    setTimeout(() => {
        contentArea.innerHTML = sectionContent;
        initSectionScripts(section, rol);
    }, 300);

    console.log('[Dashboard] Section loaded:', section);
}

/**
 * Obtener contenido de sección (placeholder)
 */
function getContentForSection(section, rol) {
    const contents = {
        'dashboard': `
            <div class="dashboard-grid">
                <div class="card">
                    <h3>Welcome Back, ${currentUser.nombre}!</h3>
                    <p>Mi@Tech Administration Dashboard v5.0</p>
                    <p style="margin-top: 10px; font-size: 14px; color: #666;">
                        Role: <strong>${rol.toUpperCase()}</strong>
                    </p>
                </div>
                <div class="card">
                    <h3>Quick Stats</h3>
                    <div id="quickStats">
                        <p>Loading statistics...</p>
                    </div>
                </div>
            </div>

            <div class="dashboard-grid" style="margin-top: 20px;">
                <div class="card" style="grid-column: 1 / -1;">
                    <h3>📈 Results Distribution - CEFR Levels</h3>
                    <div id="resultadosChartContainer" style="max-width: 600px; margin: 0 auto;">
                        <canvas id="resultadosChart"></canvas>
                    </div>
                </div>
            </div>
        `,
        'estudiantes': `
            <div class="section-header">
                <h2>Students Management</h2>
                <div class="section-controls">
                    <div class="search-box">
                        <input type="text" id="searchEstudiantes" placeholder="Search by email or name...">
                    </div>
                    <select id="filterEstudiantes" class="filter-dropdown">
                        <option value="activos">Active</option>
                        <option value="inactivos">Inactive</option>
                        <option value="todos">All</option>
                    </select>
                    <button class="btn-primary" id="btnImportEstudiantes">📥 Import CSV</button>
                    <button class="btn-primary" id="btnNewStudent">+ New Student</button>
                    <button class="btn-danger" id="btnDeleteSelected" style="display: none;">🗑️ Delete Selected</button>
                    <button class="btn-danger" id="btnDeleteAll" style="display: none;">🗑️ Delete All</button>
                </div>
            </div>

            <div class="table-container">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30px;"><input type="checkbox" id="chkSelectAll" title="Select all"></th>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Last Name</th>
                                <th>ID</th>
                                <th>Period</th>
                                <th>Attempt</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="estudiantesTableBody">
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 30px;">
                                    Loading...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="estudiantesPagination"></div>

            <!-- Modal Crear/Editar -->
            <div id="modalEditarEstudiante" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitleEditEstudiante">Create New Student</h3>
                    </div>

                    <form id="formEditarEstudiante">
                        <div class="form-group">
                            <label for="correoEditEstudiante">Email *</label>
                            <input type="email" id="correoEditEstudiante" required>
                            <div class="form-error" id="correoEditEstudiante-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="nombreEditEstudiante">Name *</label>
                            <input type="text" id="nombreEditEstudiante" required>
                            <div class="form-error" id="nombreEditEstudiante-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="apellidoEditEstudiante">Last Name *</label>
                            <input type="text" id="apellidoEditEstudiante" required>
                            <div class="form-error" id="apellidoEditEstudiante-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="cedulaEditEstudiante">ID (Cedula) *</label>
                            <input type="text" id="cedulaEditEstudiante" placeholder="Numbers only" required>
                            <div class="form-error" id="cedulaEditEstudiante-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="periodoEditEstudiante">Academic Period *</label>
                            <select id="periodoEditEstudiante" required>
                                <option value="">Select a period...</option>
                            </select>
                            <div class="form-error" id="periodoEditEstudiante-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="intentosEditEstudiante">Attempts</label>
                            <div style="display: flex; gap: 10px; align-items: center; text-align:center;">
                                <input type="number" id="intentosEditEstudiante" disabled style="background-color: #555; cursor: not-allowed; flex: 1;text-align:center;">
                                <button type="button" id="btnResetAttempts" class="btn-modal-secondary" style="white-space: nowrap; width: 50%;">🔄 Reset</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="statusEditEstudiante">Status</label>
                            <select id="statusEditEstudiante">
                                <option value="1">🟢 Active</option>
                                <option value="0">🔴 Inactive</option>
                            </select>
                        </div>

                        <div class="form-error" id="formErrorEstudiante"></div>

                        <div class="modal-buttons">
                            <button type="button" class="btn-modal-secondary" id="btnCancelEditEstudiante">Cancel</button>
                            <button type="submit" class="btn-modal-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Toast Container -->
            <div id="toastContainer"></div>
        `,
        'periodos': `
            <div class="section-header">
                <h2>Academic Periods</h2>
                <div class="section-controls">
                    <select id="filterPeriodos" class="filter-dropdown">
                        <option value="todos">All</option>
                        <option value="activos">Active</option>
                        <option value="inactivos">Inactive</option>
                    </select>
                    <button class="btn-primary" id="btnNewPeriodo">+ New Period</button>
                </div>
            </div>

            <div class="table-container">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="periodosTableBody">
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 30px;">
                                    Loading...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="periodosPagination"></div>

            <!-- Modal Crear/Editar -->
            <div id="modalEditarPeriodo" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitleEditPeriodo">Create New Period</h3>
                    </div>

                    <form id="formEditarPeriodo">
                        <div class="form-group">
                            <label for="periodoEditPeriodo">Period (ej: 2025A) *</label>
                            <input type="text" id="periodoEditPeriodo" placeholder="2025A" required>
                            <div class="form-error" id="periodoEditPeriodo-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="fechaInicioEditPeriodo">Start Date *</label>
                            <input type="date" id="fechaInicioEditPeriodo" required>
                            <div class="form-error" id="fechaInicioEditPeriodo-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="fechaFinEditPeriodo">End Date *</label>
                            <input type="date" id="fechaFinEditPeriodo" required>
                            <div class="form-error" id="fechaFinEditPeriodo-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="statusEditPeriodo">Status</label>
                            <select id="statusEditPeriodo">
                                <option value="1">🟢 Active</option>
                                <option value="0">🔴 Inactive</option>
                            </select>
                        </div>

                        <div class="form-error" id="formErrorPeriodo"></div>

                        <div class="modal-buttons">
                            <button type="button" class="btn-modal-secondary" id="btnCancelEditPeriodo">Cancel</button>
                            <button type="submit" class="btn-modal-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Toast Container -->
            <div id="toastContainer"></div>
        `,
        'evaluaciones': `
            <div class="section-header">
                <h2>Evaluations</h2>
                <div class="filters">
                    <select id="filterPeriod">
                        <option value="">All Periods</option>
                    </select>
                </div>
            </div>
            <div id="evaluacionesContent" class="section-content">
                <p>Evaluations section - Coming in next phases</p>
            </div>
        `,
        'estadisticas': `
            <div class="estadisticas-section">
                <div class="section-header">
                    <h2>📈 Statistics Dashboard</h2>
                </div>

                <div class="stats-header">
                    <p>Overview of evaluations by CEFR level</p>
                </div>

                <div id="chartContainer" class="chart-wrapper">
                    <div class="loading-placeholder">
                        <div class="spinner"></div>
                        <p>Loading chart...</p>
                    </div>
                </div>

                <div id="statsNumbersGrid" class="numbers-grid">
                    <!-- Grid de números se genera por JS -->
                </div>

                <div class="stats-total">
                    <div class="total-label">Total Evaluations</div>
                    <div class="total-value" id="totalEvaluaciones">0</div>
                </div>
            </div>
            <div id="toastContainer"></div>
        `,
        'docentes': `
            <div class="section-header">
                <h2>Teachers Management</h2>
                <div class="section-controls">
                    <div class="search-box">
                        <input type="text" id="searchDocentes" placeholder="Search by name or email...">
                    </div>
                    <select id="filterDocentes" class="filter-dropdown">
                        <option value="activos">Active</option>
                        <option value="inactivos">Inactive</option>
                        <option value="todos">All</option>
                    </select>
                    <button class="btn-primary" id="btnNewDocente">+ New Teacher</button>
                </div>
            </div>

            <div class="table-container">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Last Name</th>
                                <th>Email</th>
                                <th>Speciality</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="docentesTableBody">
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 30px;">
                                    Loading...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="docentesPagination"></div>

            <!-- Modal Crear/Editar -->
            <div id="modalEditarDocente" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitleEditDocente">Create New Teacher</h3>
                    </div>

                    <form id="formEditarDocente">
                        <div class="form-group">
                            <label for="correoEditDocente">Email *</label>
                            <input type="email" id="correoEditDocente" required>
                            <div class="form-error" id="correoEditDocente-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="nombreEditDocente">Name *</label>
                            <input type="text" id="nombreEditDocente" required>
                            <div class="form-error" id="nombreEditDocente-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="apellidoEditDocente">Last Name</label>
                            <input type="text" id="apellidoEditDocente">
                            <div class="form-error" id="apellidoEditDocente-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="especialidadEditDocente">Speciality</label>
                            <input type="text" id="especialidadEditDocente" placeholder="e.g., English, Mathematics">
                            <div class="form-error" id="especialidadEditDocente-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="statusEditDocente">Status</label>
                            <select id="statusEditDocente">
                                <option value="1">🟢 Active</option>
                                <option value="0">🔴 Inactive</option>
                            </select>
                        </div>

                        <div class="form-error" id="formErrorEditDocente"></div>

                        <div class="modal-buttons">
                            <button type="button" class="btn-modal-secondary" id="btnCancelEditDocente">Cancel</button>
                            <button type="submit" class="btn-modal-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Toast Container -->
            <div id="toastContainer"></div>
        `,
        'administradores': `
            <div class="section-header">
                <h2>Administrators (Roles)</h2>
                <div class="section-controls">
                    <button class="btn-primary" id="btnNewAdministrador">+ New Administrator</button>
                </div>
            </div>
            <p style="margin: -10px 0 15px; font-size: 13px; color: var(--text-secondary);">
                Only accounts with the "ti" role can create administrators or change their status.
                Editing name/role or deleting an account is not supported yet.
            </p>
            <button class="btn-secondary" id="btnResetPasswordChange" style="margin-bottom: 15px; font-size: 12px;" title="Testing: Reset all administrators to must change password">🔧 Reset Password Change (Testing)</button>

            <div class="table-container">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Password</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="administradoresTableBody">
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 30px;">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Crear/Editar -->
            <div id="modalEditarAdministrador" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitleEditAdministrador">Create New Administrator</h3>
                    </div>

                    <form id="formEditarAdministrador">
                        <div class="form-group">
                            <label for="correoEditAdministrador">Email *</label>
                            <input type="email" id="correoEditAdministrador" required>
                            <div class="form-error" id="correoEditAdministrador-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="nombreEditAdministrador">Name *</label>
                            <input type="text" id="nombreEditAdministrador" required>
                            <div class="form-error" id="nombreEditAdministrador-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="rolEditAdministrador">Role *</label>
                            <select id="rolEditAdministrador" required>
                                <option value="docente">Docente</option>
                                <option value="coordinador">Coordinador</option>
                                <option value="ti">TI</option>
                            </select>
                            <div class="form-error" id="rolEditAdministrador-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="passwordEditAdministrador">Temporary Password (min 8 chars) *</label>
                            <input type="text" id="passwordEditAdministrador" required>
                            <div class="form-error" id="passwordEditAdministrador-error"></div>
                        </div>

                        <div class="form-error" id="formErrorAdministrador"></div>

                        <div class="modal-buttons">
                            <button type="button" class="btn-modal-secondary" id="btnCancelEditAdministrador">Cancel</button>
                            <button type="submit" class="btn-modal-primary" id="btnSubmitAdministrador">Create</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Toast Container -->
            <div id="toastContainer"></div>
        `,
        'config': `
            <div class="section-header">
                <h2>Configuration</h2>
            </div>
            <div id="configContent" class="section-content">
                <p>Configuration section - Coming in next phases</p>
            </div>
        `,
        'audit': `
            <div class="section-header">
                <h2>Audit Log</h2>
                <div class="filters">
                    <input type="date" id="auditDateFrom" placeholder="From">
                    <input type="date" id="auditDateTo" placeholder="To">
                </div>
            </div>
            <div id="auditContent" class="section-content">
                <p>Audit Log section - Coming in next phases</p>
            </div>
        `
    };

    return contents[section] || '<p>Section not found</p>';
}

/**
 * Marcar nav como activo
 */
function setActiveNav(section) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-section="${section}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Logout
    document.getElementById('btnLogout').addEventListener('click', async () => {
        await logout();
    });

    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.querySelector('.admin-sidebar').classList.toggle('collapsed');
    });

    // Header menu toggle
    document.getElementById('headerMenuToggle').addEventListener('click', () => {
        document.querySelector('.admin-sidebar').classList.toggle('collapsed');
    });

    // Cambio de contraseña form
    const changeForm = document.getElementById('changePasswordForm');
    if (changeForm) {
        changeForm.addEventListener('submit', handleChangePassword);
    }

    console.log('[Dashboard] Event listeners setup complete');
}

/**
 * Logout
 */
async function logout() {
    try {
        console.log('[Dashboard] Logging out...');
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/';
    } catch (error) {
        console.error('[Dashboard] Logout error:', error);
        // Redirigir igual
        window.location.href = '/';
    }
}

/**
 * Inicializar scripts específicos de sección
 */
function initSectionScripts(section, rol) {
    switch(section) {
        case 'dashboard':
            loadQuickStats();
            // Cargar gráficos de estadísticas
            if (typeof loadEstadisticasCharts === 'function') {
                setTimeout(() => loadEstadisticasCharts(), 100);
            }
            break;
        case 'estudiantes':
            if (typeof initEstudiantesSection === 'function') {
                initEstudiantesSection();
            }
            break;
        case 'periodos':
            if (typeof initPeriodosSection === 'function') {
                initPeriodosSection();
            }
            break;
        case 'estadisticas':
            if (typeof initEstadisticasSection === 'function') {
                initEstadisticasSection();
            }
            break;
        case 'docentes':
            if (typeof initDocentesSection === 'function') {
                initDocentesSection();
            }
            break;
        case 'administradores':
            if (typeof initAdministradoresSection === 'function') {
                initAdministradoresSection();
            }
            break;
        // ... más casos
    }
}

/**
 * Cargar estadísticas rápidas
 */
async function loadQuickStats() {
    try {
        console.log('[Dashboard] Loading quick stats...');
        const response = await fetch('/api/admin/estadisticas', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const statsDiv = document.getElementById('quickStats');
            if (statsDiv) {
                statsDiv.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${data.total_evaluaciones || 0}</span>
                            <span class="stat-label">Evaluations</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${data.por_nivel?.['A1'] || 0}</span>
                            <span class="stat-label">A1 Level</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${data.por_nivel?.['A2.1'] || 0}</span>
                            <span class="stat-label">A2.1 Level</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${data.por_nivel?.['A2.2'] || 0}</span>
                            <span class="stat-label">A2.2 Level</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${data.por_nivel?.['B1'] || 0}</span>
                            <span class="stat-label">B1 Level</span>
                        </div>
                    </div>
                `;
            }
        } else {
            const statsDiv = document.getElementById('quickStats');
            if (statsDiv) {
                statsDiv.innerHTML = '<p>Unable to load statistics</p>';
            }
        }
    } catch (error) {
        console.error('[Dashboard] Stats error:', error);
    }
}

/**
 * Mostrar modal de cambio de contraseña obligatorio
 */
function showChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        // Limpiar formulario
        document.getElementById('currentPwd').value = '';
        document.getElementById('newPwd').value = '';
        document.getElementById('confirmPwd').value = '';
        document.getElementById('modalError').style.display = 'none';

        // Prevenir cerrar con Escape
        const preventEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                console.log('[ChangePassword] ⚠️ Cannot close modal - password change is mandatory');
            }
        };
        document.addEventListener('keydown', preventEscape);
        modal._preventEscape = preventEscape;

        // Prevenir cerrar con click en backdrop
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('[ChangePassword] ⚠️ Cannot close modal - password change is mandatory');
                e.stopPropagation();
            }
        });

        modal.style.display = 'flex';
        document.getElementById('currentPwd').focus();
        console.log('[Dashboard] ⚠️ Change password modal shown - password change is mandatory');
    }
}

/**
 * Mostrar mensaje de éxito después de cambio de contraseña
 */
function showChangePasswordSuccess() {
    const modal = document.getElementById('changePasswordModal');
    const content = modal.querySelector('.modal-content');

    // Cambiar contenido del modal
    const header = modal.querySelector('.modal-header');
    const form = modal.querySelector('form');

    header.innerHTML = '<h2>✅ Password Updated Successfully</h2><p>Your password has been changed. Reloading dashboard...</p>';
    form.innerHTML = '';

    console.log('[ChangePassword] Mostrando mensaje de éxito');
}

/**
 * Manejar cambio de contraseña
 */
async function handleChangePassword(event) {
    event.preventDefault();

    const currentPwdInput = document.getElementById('currentPwd');
    const newPwdInput = document.getElementById('newPwd');
    const confirmPwdInput = document.getElementById('confirmPwd');

    const current = currentPwdInput.value.trim();
    const newPwd = newPwdInput.value.trim();
    const confirmPwd = confirmPwdInput.value.trim();

    console.log('[ChangePassword] Validando cambio de contraseña...');

    // Validaciones
    if (!current) {
        showModalError('Current password is required');
        currentPwdInput.focus();
        return;
    }

    if (!newPwd) {
        showModalError('New password is required');
        newPwdInput.focus();
        return;
    }

    if (!confirmPwd) {
        showModalError('Please confirm your new password');
        confirmPwdInput.focus();
        return;
    }

    if (newPwd.length < 8) {
        showModalError('New password must be at least 8 characters');
        newPwdInput.focus();
        return;
    }

    if (newPwd !== confirmPwd) {
        showModalError('New passwords do not match');
        confirmPwdInput.focus();
        return;
    }

    console.log('[ChangePassword] ✅ Validaciones pasadas, enviando al backend...');

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password_actual: current,
                password_nueva: newPwd
            }),
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[ChangePassword] Error:', data);
            showModalError(data.error || 'Error changing password');
            return;
        }

        console.log('[ChangePassword] ✅ Contraseña cambiada exitosamente');
        showChangePasswordSuccess();

        // Limpiar URL
        setTimeout(() => {
            window.history.replaceState({}, document.title, '/admin-dashboard.html');
            // Recargar la página para refrescar el estado
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('[ChangePassword] Error:', error);
        showModalError('Connection error: ' + error.message);
    }
}

/**
 * Mostrar error en modal
 */
function showModalError(message) {
    const errorDiv = document.getElementById('modalError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * TESTING: Resetear must_change_password = 1 para todos los administradores
 */
async function resetAllAdministratorsMustChangePassword() {
    const confirmed = confirm('🔧 TESTING: Reset ALL administrators to must change password on next login?\n\nThis will set must_change_password = 1 for all admin accounts.');
    if (!confirmed) return;

    try {
        console.log('[Testing] Resetting all administrators to must_change_password = 1...');
        const response = await fetch('/api/admin/administradores/reset-must-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            alert('❌ Reset failed: ' + (data.error || 'Unknown error'));
            return;
        }

        console.log('[Testing] ✅ Reset successful:', data.mensaje);
        alert('✅ Reset successful!\n\nAll administrators will be required to change their password on next login.');

        // Recargar sección de administradores
        if (window.loadAdministradores) {
            await window.loadAdministradores();
        }

    } catch (error) {
        console.error('[Testing] Reset error:', error);
        alert('❌ Error: ' + error.message);
    }
}
