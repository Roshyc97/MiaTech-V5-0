'use strict';

(function() {
    let chart1 = null;
    let chart2 = null;
    let chartData = null;

    async function initEstadisticasSection() {
        console.log('[Estadísticas] Initializing charts...');
        try {
            await loadEstadisticasCharts();
        } catch (error) {
            console.error('[Estadísticas] Init error:', error);
        }
    }

    async function loadEstadisticasCharts() {
        try {
            // Cargar datos del endpoint de estadísticas
            const response = await fetch('/api/admin/estadisticas', {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('[Estadísticas] Error loading stats');
                return;
            }

            chartData = await response.json();
            console.log('[Estadísticas] Data loaded:', chartData);

            // Dibujar gráficos con los datos
            drawCefrChart(chartData);

        } catch (error) {
            console.error('[Estadísticas] Error loading charts:', error);
        }
    }

    function drawCefrChart(data) {
        const canvas = document.getElementById('resultadosChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Preparar datos de niveles CEFR
        const niveles = ['A1', 'A2.1', 'A2.2', 'B1'];
        const valores = niveles.map(n => data.por_nivel?.[n] || 0);

        const levelColors = {
            'A1': '#ef4444',
            'A2.1': '#f97316',
            'A2.2': '#f59e0b',
            'B1': '#10b981'
        };

        const colors = niveles.map(l => levelColors[l]);

        if (chart2) chart2.destroy();

        chart2 = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: niveles,
                datasets: [{
                    label: 'Students',
                    data: valores,
                    backgroundColor: colors,
                    borderColor: 'var(--bg-secondary)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-primary)',
                            font: { size: 12 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + ' estudiantes';
                            }
                        }
                    }
                }
            }
        });
    }

    window.initEstadisticasSection = initEstadisticasSection;
    window.loadEstadisticasCharts = loadEstadisticasCharts;
})();
