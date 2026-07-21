/**
 * Módulo: Importaciones de Estudiantes
 * Vista: Historial de importaciones masivas
 * Acceso: TI, Coordinador
 */

class ImportacionesFrontend {
    constructor() {
        this.importaciones = [];
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.renderizar();
    }

    async cargarDatos() {
        try {
            const resp = await fetch('/api/admin/importaciones');
            const json = await resp.json();
            this.importaciones = json.importaciones || [];
        } catch (err) {
            console.error('Error cargando importaciones:', err);
            this.importaciones = [];
        }
    }

    renderizar() {
        const container = document.getElementById('importaciones-container');
        if (!container) return;

        if (this.importaciones.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay registros de importación</p>';
            return;
        }

        let html = `
            <div class="importaciones-header">
                <h3>Student Imports History</h3>
                <p class="text-muted">Record of bulk student imports by academic period</p>
            </div>

            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Group Name</th>
                        <th class="text-center">Period</th>
                        <th class="text-center">Quantity</th>
                        <th>Imported by</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.importaciones.forEach(imp => {
            const fecha = new Date(imp.fecha_importacion).toLocaleDateString('es-EC');
            const hora = new Date(imp.fecha_importacion).toLocaleTimeString('es-EC', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const importadoPor = imp.importado_por_nombre || '(Unknown)';
            const periodo = imp.periodo || '-';

            html += `
                <tr class="importacion-row">
                    <td><strong>${this.escapeHtml(imp.nombre_grupo)}</strong></td>
                    <td class="text-center">${periodo}</td>
                    <td class="text-center"><strong>${imp.cantidad}</strong></td>
                    <td>
                        <small>${this.escapeHtml(importadoPor)}</small>
                        ${imp.correo ? `<br><small class="text-muted">${this.escapeHtml(imp.correo)}</small>` : ''}
                    </td>
                    <td>
                        <small>${fecha}</small>
                        <br>
                        <small class="text-muted">${hora}</small>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>

            <div class="importaciones-resumen mt-4">
                <h5>Summary</h5>
                <div class="row">
        `;

        // Estadísticas agregadas
        const totalImportaciones = this.importaciones.length;
        const totalAlumnos = this.importaciones.reduce((sum, i) => sum + (i.cantidad || 0), 0);
        const promedio = totalImportaciones > 0 ? (totalAlumnos / totalImportaciones).toFixed(1) : 0;
        const ultimaFecha = this.importaciones[0]?.fecha_importacion
            ? new Date(this.importaciones[0].fecha_importacion).toLocaleDateString('es-EC')
            : '-';

        html += `
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h6 class="card-title">Total Imports</h6>
                                <h3>${totalImportaciones}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h6 class="card-title">Total Students</h6>
                                <h3>${totalAlumnos}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h6 class="card-title">Avg per Import</h6>
                                <h3>${promedio}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-white">
                            <div class="card-body">
                                <h6 class="card-title">Latest Import</h6>
                                <h5>${ultimaFecha}</h5>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.agregarEstilos();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    agregarEstilos() {
        if (document.getElementById('importaciones-estilos')) return;

        const style = document.createElement('style');
        style.id = 'importaciones-estilos';
        style.textContent = `
            .importaciones-header {
                margin-bottom: 2rem;
                border-bottom: 2px solid #007bff;
                padding-bottom: 1rem;
            }

            .importaciones-header h3 {
                color: #333;
                font-weight: 600;
            }

            .importacion-row {
                transition: background-color 0.2s;
            }

            .importacion-row:hover {
                background-color: #f0f0f0;
            }

            .importaciones-resumen {
                padding: 1.5rem;
                background: #f9f9f9;
                border-radius: 8px;
            }

            .importaciones-resumen h5 {
                margin-bottom: 1rem;
                font-weight: 600;
            }

            .card {
                text-align: center;
                border: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .card h3 {
                margin: 0;
                font-size: 2rem;
                font-weight: 700;
            }

            .card h6 {
                font-size: 0.85rem;
                margin: 0;
                opacity: 0.9;
            }

            .table small {
                display: block;
                font-size: 0.75rem;
            }
        `;

        document.head.appendChild(style);
    }
}

// Inicializar cuando el DOM esté listo
let importacionesApp;
document.addEventListener('DOMContentLoaded', () => {
    importacionesApp = new ImportacionesFrontend();
});
