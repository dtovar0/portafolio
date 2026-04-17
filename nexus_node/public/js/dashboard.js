// Requires window.__chartData to be set inline before this script loads

function updateClock() {
    const clockElement = document.getElementById('realtime-clock');
    if (clockElement) {
        const now = new Date();
        const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        clockElement.textContent = time;
    }
}
setInterval(updateClock, 1000);
updateClock();

function createPremiumChartEmpty(title, text, iconClass = 'fa-chart-pie') {
    return `
        <div class="premium-empty-state-chart">
            <div class="chart-empty-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <p class="chart-empty-title">${title}</p>
            <p class="chart-empty-text">${text}</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function () {
    const data = window.__chartData;

    // Helper to check if array is empty or all values are zero
    const isEmpty = (arr) => !arr || arr.length === 0 || arr.every(v => v === 0);

    // Chart: Users per Platform
    const canvasPlatform = document.getElementById('usersPlatformChart');
    if (canvasPlatform) {
        if (isEmpty(data.usersPlatformValues)) {
            canvasPlatform.parentElement.innerHTML = createPremiumChartEmpty("Ranking Vacío", "No hay datos de uso para generar un ranking de plataformas.", "fa-trophy");
        } else {
            const ctxPlatform = canvasPlatform.getContext('2d');
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
            new Chart(ctxPlatform, {
                type: 'bar',
                data: {
                    labels: data.usersPlatformLabels,
                    datasets: [{
                        label: 'Usuarios',
                        data: data.usersPlatformValues,
                        backgroundColor: data.accentColor,
                        borderRadius: 6,
                        barThickness: 32
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { size: 9 } } },
                        y: { beginAtZero: true, grid: { display: false }, ticks: { color: textColor, stepSize: 1, font: { size: 9 } } }
                    }
                }
            });
        }
    }

    // Chart: Users per Area (Bar)
    const canvasArea = document.getElementById('usersAreaBarChart');
    if (canvasArea) {
        if (isEmpty(data.usersAreaValues)) {
            canvasArea.parentElement.innerHTML = createPremiumChartEmpty("Distribución TI", "Registra áreas para visualizar la distribución de servicios.", "fa-chart-pie");
        } else {
            const ctxAreaBar = canvasArea.getContext('2d');
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
            // Helper to handle potential gradients (take first color)
            const areaColors = (data.usersAreaColors || []).map(c => {
                if (c && c.includes('gradient')) {
                    const match = c.match(/#[0-9a-fA-F]{3,6}/);
                    return match ? match[0] : '#10b981';
                }
                return c || '#10b981';
            });

            new Chart(ctxAreaBar, {
                type: 'bar',
                data: {
                    labels: data.usersAreaLabels,
                    datasets: [{
                        label: 'Usuarios',
                        data: data.usersAreaValues,
                        backgroundColor: areaColors,
                        borderRadius: 6,
                        barThickness: 32
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { size: 9 } } },
                        y: { beginAtZero: true, grid: { display: false }, ticks: { color: textColor, stepSize: 1, font: { size: 9 } } }
                    }
                }
            });
        }
    }

    // Chart: Pending Requests per Platform (Bar)
    const canvasPending = document.getElementById('pendingRequestsChart');
    if (canvasPending) {
        if (isEmpty(data.pendingPlatformValues)) {
            canvasPending.parentElement.innerHTML = createPremiumChartEmpty("Todo al día", "No hay solicitudes de acceso pendientes.", "fa-clipboard-check");
        } else {
            const ctxPending = canvasPending.getContext('2d');
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
            new Chart(ctxPending, {
                type: 'bar',
                data: {
                    labels: data.pendingPlatformLabels,
                    datasets: [{
                        label: 'Solicitudes',
                        data: data.pendingPlatformValues,
                        backgroundColor: '#f59e0b',
                        borderRadius: 6,
                        barThickness: 32
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { size: 9 } } },
                        y: { beginAtZero: true, grid: { display: false }, ticks: { color: textColor, stepSize: 1, font: { size: 9 } } }
                    }
                }
            });
        }
    }

    // Chart: Most Visited Platforms
    const canvasVisited = document.getElementById('mostVisitedChart');
    if (canvasVisited) {
        if (isEmpty(data.mostVisitedValues)) {
            canvasVisited.parentElement.innerHTML = createPremiumChartEmpty("Sin Tráfico", "Las visitas aparecerán aquí conforme se use el portal.", "fa-chart-line");
        } else {
            const ctxVisited = canvasVisited.getContext('2d');
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
            new Chart(ctxVisited, {
                type: 'bar',
                data: {
                    labels: data.mostVisitedLabels,
                    datasets: [{
                        label: 'Visitas',
                        data: data.mostVisitedValues,
                        backgroundColor: '#3b82f6',
                        borderRadius: 6,
                        barThickness: 32
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { size: 9 } } },
                        y: { beginAtZero: true, grid: { display: false }, ticks: { color: textColor, stepSize: 1, font: { size: 9 } } }
                    }
                }
            });
        }
    }
});
