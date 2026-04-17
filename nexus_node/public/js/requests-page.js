// Requires: window.__requestsData, window.__urls set inline

var groupedData = window.__requestsData.grouped;
var currentFilteredData = [];
var currentCategory = '';
var currentPage = 1;
var rowsPerPage = 10;

var statusChartInstance = null;
var trendChartInstance = null;

window.Toast = window.Toast || Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)'
});

// Initialize Analytics and Persistence
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('requestSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => handleSearch(event.target.value || ''));
    }

    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAll.checked);
            updateSelection();
        });
    }

    document.addEventListener('change', (event) => {
        if (event.target.matches('.row-checkbox')) {
            updateSelection();
        }
    });

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;
        if (action === 'requests-show-grid') return showGrid();
        if (action === 'requests-drilldown') return drillDown(trigger.dataset.category);
        if (action === 'requests-bulk-approve') return bulkAction('Aprobar');
        if (action === 'requests-bulk-reject') return bulkAction('Denegar');
        if (action === 'requests-process-single') return processSingle(trigger.dataset.requestId, trigger.dataset.requestOp);
        if (action === 'requests-page') return changePage(Number(trigger.dataset.offset || '0'));
    });

    const savedCategory = sessionStorage.getItem('active_request_category');
    if (savedCategory && groupedData[savedCategory]) {
        drillDown(savedCategory);
        sessionStorage.removeItem('active_request_category');
    }
    initCharts();
});

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

function initCharts() {
    if (statusChartInstance) statusChartInstance.destroy();
    if (trendChartInstance) trendChartInstance.destroy();

    const counts = window.__requestsData.counts;
    const totalRequests = counts.pendientes + counts.aprobadas + counts.denegadas;

    // 1. Status Distribution Chart
    const canvasStatus = document.getElementById('statusChart');
    if (canvasStatus) {
        if (totalRequests === 0) {
            canvasStatus.parentElement.innerHTML = createPremiumChartEmpty("Sin Registros", "Las solicitudes procesadas aparecerán en esta distribución.", "fa-chart-pie");
        } else {
            const statusCtx = canvasStatus.getContext('2d');
            statusChartInstance = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Pendientes', 'Aprobadas', 'Denegadas'],
                    datasets: [{
                        data: [counts.pendientes, counts.aprobadas, counts.denegadas],
                        backgroundColor: [
                            getComputedStyle(document.documentElement).getPropertyValue('--status-pending').trim() || '#d97706',
                            getComputedStyle(document.documentElement).getPropertyValue('--status-approved').trim() || '#10b981',
                            getComputedStyle(document.documentElement).getPropertyValue('--status-rejected').trim() || '#ef4444'
                        ],
                        borderWidth: 0,
                        hoverOffset: 0
                    }]
                },
                options: {
                    animation: { duration: 1000 },
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 14,
                                font: { family: 'Inter', size: 12, weight: '600' }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    }

    // 2. Platform Ranking (Top 5)
    const platformCounts = {};
    const historyData = groupedData.Historial || [];
    historyData.forEach(r => {
        platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;
    });

    const sortedPlatforms = Object.entries(platformCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const canvasTrend = document.getElementById('platformChart');
    if (canvasTrend) {
        if (sortedPlatforms.length === 0) {
            canvasTrend.parentElement.innerHTML = createPremiumChartEmpty("Global Ranking", "Aquí verás un ranking de las plataformas con más solicitudes.", "fa-trophy");
        } else {
            const platformCtx = canvasTrend.getContext('2d');
            trendChartInstance = new Chart(platformCtx, {
                type: 'bar',
                data: {
                    labels: sortedPlatforms.map(p => p[0]),
                    datasets: [{
                        label: 'Solicitudes',
                        data: sortedPlatforms.map(p => p[1]),
                        backgroundColor: '#6366f1',
                        borderRadius: 8,
                        barThickness: 32
                    }]
                },
                options: {
                    animation: { duration: 1000 },
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { display: false },
                            border: { display: false },
                            ticks: {
                                stepSize: 1,
                                precision: 0,
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
                                font: { size: 10 }
                            }
                        },
                        x: { 
                            grid: { display: false }, 
                            ticks: { 
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
                                font: { size: 10 } 
                            } 
                        }
                    }
                }
            });
        }
    }
}

function drillDown(category) {
    currentCategory = category;
    currentFilteredData = [...groupedData[category]]; 
    currentPage = 1; // Reset to page 1
    
    document.getElementById('gridView').style.display = 'none';
    document.getElementById('drillDownView').style.display = 'flex';
    document.getElementById('drillDownView').classList.remove('d-none');
    document.getElementById('requestSearch').value = ''; 

    const btns = document.getElementById('actionButtonsContainer');
    btns.style.display = (category === 'Pendientes') ? 'flex' : 'none';
    
    // Hide/Show Select All checkbox column
    const selectAllCol = document.getElementById('selectAllHeader');
    selectAllCol.style.display = (category === 'Pendientes') ? 'table-cell' : 'none';

    const actionCol = document.getElementById('actionHeader');
    actionCol.style.display = (category === 'Pendientes') ? 'table-cell' : 'none';

    const breadcrumbs = document.querySelector('.breadcrumbs');
    if (breadcrumbs) {
        breadcrumbs.innerHTML = `
            <a class="breadcrumb-item" href="${window.__urls.index}">Inicio</a>
            <span>/</span>
            <button type="button" class="breadcrumb-item breadcrumb-button" data-action="requests-show-grid">Solicitudes</button>
            <span>/</span>
            <span class="breadcrumb-item active">${category}</span>
        `;
    }
    renderTable();
}

function handleSearch(query) {
    const q = query.toLowerCase();
    currentFilteredData = groupedData[currentCategory].filter(r => 
        r.user.toLowerCase().includes(q) || r.platform.toLowerCase().includes(q)
    );
    currentPage = 1; // Back to first page on search
    renderTable();
}

function showGrid() {
    document.getElementById('drillDownView').style.display = 'none';
    document.getElementById('gridView').style.display = 'block';
    currentCategory = '';
    
    // Clear search on return
    document.getElementById('requestSearch').value = '';
    currentFilteredData = [];
    
    const breadcrumbs = document.querySelector('.breadcrumbs');
    if (breadcrumbs) {
        breadcrumbs.innerHTML = `
            <a class="breadcrumb-item" href="${window.__urls.index}">Inicio</a>
            <span>/</span>
            <button type="button" class="breadcrumb-item active breadcrumb-button" data-action="requests-show-grid">Solicitudes</button>
        `;
    }
}

// Shortcut: ESC to go back
document.addEventListener('keydown', (e) => {
    const drillDownView = document.getElementById('drillDownView');
    if (e.key === 'Escape' && drillDownView && drillDownView.style.display !== 'none' && drillDownView.style.display !== '') {
        showGrid();
    }
});

function renderTable() {
    const tbody = document.getElementById('requestTableBody');
    tbody.innerHTML = '';

    if (currentFilteredData.length === 0) {
        const isSearch = document.getElementById('requestSearch')?.value.trim() !== "";
        const icon = isSearch ? 'fa-search' : (currentCategory === 'Pendientes' ? 'fa-hourglass-half' : 'fa-check-double');
        const title = isSearch ? 'Sin resultados' : 'Categoría Vacía';
        const text = isSearch ? 'No pudimos encontrar solicitudes que coincidan con su búsqueda.' : `No hay registros de tipo "${currentCategory}" en la base de datos.`;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="request-empty-cell">
                    <div class="premium-empty-state">
                        <div class="empty-state-visual">
                            <div class="empty-state-icon-wrapper">
                                <i class="fas ${icon}"></i>
                            </div>
                        </div>
                        <h2 class="empty-state-title">${title}</h2>
                        <p class="empty-state-text">${text}</p>
                    </div>
                </td>
            </tr>
        `;
        const paginationLabel = document.getElementById('paginationLabel');
        if (paginationLabel) paginationLabel.style.display = 'none';
        
        // Even if empty, reset selection state
        const selectAll = document.getElementById('selectAll');
        if (selectAll) selectAll.checked = false;
        updateSelection();
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = currentFilteredData.slice(start, end);

    pageData.forEach(r => {
        const tr = document.createElement('tr');
        
        let checkboxCell = '';
        if (currentCategory === 'Pendientes') {
            checkboxCell = `<td class="col-cb"><input type="checkbox" class="row-checkbox request-row-checkbox" value="${r.id}"></td>`;
        }

        tr.innerHTML = `
            ${checkboxCell}
            <td>
                <div>
                    <span class="request-user-primary">${r.user}</span>
                    <div class="request-user-secondary">Solicitante</div>
                </div>
            </td>
            <td>
                <span class="request-type-pill ${r.type === 'Admin' ? 'is-admin' : ''}">
                    ${r.type}
                </span>
            </td>
            <td>
                <div>
                    <span class="request-platform-primary">${r.platform}</span>
                    <div class="request-platform-secondary">Servicio</div>
                </div>
            </td>
            <td class="request-date-cell">${r.date}</td>
            <td class="request-date-cell">${r.processed_date}</td>
            <td>
                <span class="badge ${r.status === 'Pendiente' ? 'badge-warning' : (r.status === 'Aprobada' ? 'badge-success' : 'badge-danger')}">
                    <span class="status-dot"></span> ${r.status}
                </span>
            </td>
            ${currentCategory === 'Pendientes' ? `
            <td class="col-actions request-action-cell">
                <div class="action-group action-group-end">
                    <button class="btn-action-small approve" type="button" data-action="requests-process-single" data-request-id="${r.id}" data-request-op="approve" title="Aprobar"><i class="fas fa-check"></i></button>
                    <button class="btn-action-small reject" type="button" data-action="requests-process-single" data-request-id="${r.id}" data-request-op="reject" title="Denegar"><i class="fas fa-times"></i></button>
                </div>
            </td>
            ` : ''}
        `;
        tbody.appendChild(tr);
    });

    const totalPages = Math.ceil(currentFilteredData.length / rowsPerPage);
    const paginationLabel = document.getElementById('paginationLabel');
    paginationLabel.style.display = 'flex';
    paginationLabel.className = 'fs-sm text-muted request-pagination-layout';
    
    paginationLabel.innerHTML = `
        <div class="request-pagination-summary">
            Mostrando <strong>${pageData.length}</strong> de <strong>${currentFilteredData.length}</strong> registros
        </div>
        <div class="request-pagination-controls">
            <button type="button" data-action="requests-page" data-offset="-1" ${currentPage === 1 ? 'disabled' : ''} class="page-btn-modern">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Anterior
            </button>
            <div class="request-pagination-pill">
                Página <strong class="current">${currentPage}</strong> de <strong>${totalPages || 1}</strong>
            </div>
            <button type="button" data-action="requests-page" data-offset="1" ${currentPage >= totalPages ? 'disabled' : ''} class="page-btn-modern">
                Siguiente
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        </div>
    `;

    // Ensure buttons reflect the state of the new rows (usually none selected)
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.checked = false;
    updateSelection();
}

function changePage(offset) {
    currentPage += offset;
    renderTable();
}

function updateSelection() {
    const checked = document.querySelectorAll('.row-checkbox:checked').length;
    document.getElementById('bulkApprove').disabled = checked === 0;
    document.getElementById('bulkReject').disabled = checked === 0;
}

function processSingle(id, action) {
    // Save current category to restore it after reload
    if (currentCategory) {
        sessionStorage.setItem('active_request_category', currentCategory);
    }
    
    const url = action === 'approve' ? `/admin/request/approve/${id}` : `/admin/request/reject/${id}`;
    fetch(url).then(res => res.json()).then(data => {
        if (data.success) {
            if (typeof Toast !== 'undefined') {
                Toast.fire({ 
                    icon: 'success', 
                    title: data.message,
                    customClass: {
                        popup: action === 'approve' ? 'toast-approve' : 'toast-reject'
                    }
                });
            }
            setTimeout(() => location.reload(), 1500);
        }
    });
}

async function bulkAction(actionType) {
    const ids = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
    const action = actionType.toLowerCase() === 'aprobar' ? 'approve' : 'reject';
    
    // Save current category to restore it after reload
    if (currentCategory) {
        sessionStorage.setItem('active_request_category', currentCategory);
    }
    
    const result = await Swal.fire({
        title: `¿Estar seguro de ${actionType.toLowerCase()}?`,
        text: `Se procesarán ${ids.length} solicitudes en la base de datos.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6366f1',
        confirmButtonText: 'Sí, procesar',
        animation: false
    });

    if (result.isConfirmed) {
        const promises = ids.map(id => fetch(`/admin/request/${action}/${id}`).then(res => res.json()));
        try {
            await Promise.all(promises);
            Swal.fire({title: 'Procesado', text: `${ids.length} solicitudes actualizadas correctamente.`, icon: 'success', animation: false});
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            Swal.fire({title: 'Error', text: 'Ocurrió un error al procesar las solicitudes.', icon: 'error'});
        }
    }
}
