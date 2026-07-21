/**
 * Módulo: Estadísticas de Períodos
 * Vista: Tabla histórica de evaluaciones por período
 * Datos: Total evaluaciones, niveles A1/A2.1/A2.2/B1
 */

class EstadisticasPeriodicasFrontend {
    constructor() {
        this.stats = [];
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.renderizar();
    }

    async cargarDatos() {
        try {
            const resp = await fetch('/api/admin/estadisticas-periodos');
            const json = await resp.json();
            this.stats = json.estadisticas_periodos || [];
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
            this.stats = [];
        }
    }

    renderizar() {
        const container = document.getElementById('estadisticas-periodos-container');
        if (!container) return;

        if (this.stats.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay estadísticas registradas</p>';
            return;
        }

        let html = `
            <div class="estadisticas-header">
                <h3>Estadísticas de Evaluaciones por Período</h3>
                <p class="text-muted">Histórico permanente de evaluaciones rendidas</p>
            </div>

            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Período</th>
                        <th class="text-center">Total</th>
                        <th class="text-center">A1</th>
                        <th class="text-center">A2.1</th>
                        <th class="text-center">A2.2</th>
                        <th class="text-center">B1</th>
                        <th>Fecha Cierre</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.stats.forEach(stat => {
            const total = stat.total_evaluaciones || 0;
            const estado = stat.fecha_cierre ? '✓ Cerrado' : '● Activo';
            const estadoClass = stat.fecha_cierre ? 'badge bg-secondary' : 'badge bg-success';
            const fechaCierre = stat.fecha_cierre ? new Date(stat.fecha_cierre).toLocaleDateString('es-EC') : '-';

            // Calcular porcentajes
            const pctA1 = total > 0 ? ((stat.nivel_a1 / total) * 100).toFixed(0) : '0';
            const pctA21 = total > 0 ? ((stat.nivel_a2_1 / total) * 100).toFixed(0) : '0';
            const pctA22 = total > 0 ? ((stat.nivel_a2_2 / total) * 100).toFixed(0) : '0';
            const pctB1 = total > 0 ? ((stat.nivel_b1 / total) * 100).toFixed(0) : '0';

            html += `
                <tr class="estadistica-row" onclick="estadisticasApp.mostrarDetalle('${stat.periodo}')">
                    <td><strong>${stat.periodo}</strong></td>
                    <td class="text-center"><strong>${total}</strong></td>
                    <td class="text-center">
                        ${stat.nivel_a1}
                        <small class="text-muted">(${pctA1}%)</small>
                    </td>
                    <td class="text-center">
                        ${stat.nivel_a2_1}
                        <small class="text-muted">(${pctA21}%)</small>
                    </td>
                    <td class="text-center">
                        ${stat.nivel_a2_2}
                        <small class="text-muted">(${pctA22}%)</small>
                    </td>
                    <td class="text-center">
                        ${stat.nivel_b1}
                        <small class="text-muted">(${pctB1}%)</small>
                    </td>
                    <td>${fechaCierre}</td>
                    <td><span class="${estadoClass}">${estado}</span></td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>

            <div class="estadisticas-resumen mt-4">
                <h5>Resumen General</h5>
                <div class="row">
        `;

        // Resumen global
        const totalGlobal = this.stats.reduce((sum, s) => sum + (s.total_evaluaciones || 0), 0);
        const totalA1 = this.stats.reduce((sum, s) => sum + (s.nivel_a1 || 0), 0);
        const totalA21 = this.stats.reduce((sum, s) => sum + (s.nivel_a2_1 || 0), 0);
        const totalA22 = this.stats.reduce((sum, s) => sum + (s.nivel_a2_2 || 0), 0);
        const totalB1 = this.stats.reduce((sum, s) => sum + (s.nivel_b1 || 0), 0);

        html += `
                    <div class="col-md-2">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h6 class="card-title">Total Global</h6>
                                <h3>${totalGlobal}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h6 class="card-title">A1</h6>
                                <h3>${totalA1}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="card bg-warning text-white">
                            <div class="card-body">
                                <h6 class="card-title">A2.1</h6>
                                <h3>${totalA21}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h6 class="card-title">A2.2</h6>
                                <h3>${totalA22}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="card bg-danger text-white">
                            <div class="card-body">
                                <h6 class="card-title">B1</h6>
                                <h3>${totalB1}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Agregar estilos
        this.agregarEstilos();
    }

    mostrarDetalle(periodo) {
        const stat = this.stats.find(s => s.periodo === periodo);
        if (!stat) return;

        const mensaje = `
Estadísticas del Período: ${stat.periodo}

Total Evaluaciones: ${stat.total_evaluaciones}
  • A1: ${stat.nivel_a1}
  • A2.1: ${stat.nivel_a2_1}
  • A2.2: ${stat.nivel_a2_2}
  • B1: ${stat.nivel_b1}

${stat.fecha_cierre ? `Fecha de Cierre: ${new Date(stat.fecha_cierre).toLocaleDateString('es-EC')}` : 'Período Activo'}
        `;

        alert(mensaje);
    }

    agregarEstilos() {
        if (document.getElementById('estadisticas-estilos')) return;

        const style = document.createElement('style');
        style.id = 'estadisticas-estilos';
        style.textContent = `
            .estadisticas-header {
                margin-bottom: 2rem;
                border-bottom: 2px solid #007bff;
                padding-bottom: 1rem;
            }

            .estadisticas-header h3 {
                color: #333;
                font-weight: 600;
            }

            .estadistica-row {
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .estadistica-row:hover {
                background-color: #f0f0f0;
            }

            .estadisticas-resumen {
                padding: 1.5rem;
                background: #f9f9f9;
                border-radius: 8px;
            }

            .estadisticas-resumen h5 {
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
let estadisticasApp;
document.addEventListener('DOMContentLoaded', () => {
    estadisticasApp = new EstadisticasPeriodicasFrontend();
});
