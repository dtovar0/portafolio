/**
 * Access Requests Management Interactivity
 */

function updateActionButtons() {
    const checkedCount = document.querySelectorAll('.req-checkbox:checked').length;
    const btnApprove = document.getElementById('btnApprove');
    const btnReject = document.getElementById('btnReject');
    const btnDelete = document.getElementById('btnDeleteReq');
    
    const hasSelection = checkedCount > 0;
    if (btnApprove) btnApprove.disabled = !hasSelection;
    if (btnReject) btnReject.disabled = !hasSelection;
    if (btnDelete) btnDelete.disabled = !hasSelection;
}

function approveSelectedRequests() {
    const checked = document.querySelectorAll('.req-checkbox:checked');
    if (checked.length === 0) return;

    if (typeof Toast !== 'undefined') {
        Toast.fire({
            icon: 'success',
            title: `${checked.length} solicitudes aprobadas correctamente`
        });
    }
    removeSelectedRows(checked);
}

function rejectSelectedRequests() {
    const checked = document.querySelectorAll('.req-checkbox:checked');
    if (checked.length === 0) return;

    if (typeof Toast !== 'undefined') {
        Toast.fire({
            icon: 'warning',
            title: `${checked.length} solicitudes rechazadas`
        });
    }
    removeSelectedRows(checked);
}

function deleteSelectedRequests() {
    const checked = document.querySelectorAll('.req-checkbox:checked');
    if (checked.length === 0) return;

    if (typeof Toast !== 'undefined') {
        Toast.fire({
            icon: 'success',
            title: `${checked.length} registros eliminados`
        });
    }
    removeSelectedRows(checked);
}

function removeSelectedRows(checkedElements) {
    checkedElements.forEach(cb => {
        const row = cb.closest('tr');
        if (row) {
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            setTimeout(() => {
                row.remove();
                checkEmptyTable();
            }, 300);
        }
    });
    
    const selectAll = document.getElementById('selectAllReqs');
    if (selectAll) selectAll.checked = false;
    updateActionButtons();
}

function checkEmptyTable() {
    const tbody = document.getElementById('reqsTableBody');
    if (tbody && tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding: 4rem; text-align: center; color: var(--text-muted);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.2;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>No hay solicitudes pendientes.</p>
                </td>
            </tr>
        `;
    }
}

// Global Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Search functionality
    const searchInput = document.getElementById('requestSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => {
            const term = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('#reqsTableBody tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    // Select All functionality
    const selectAll = document.getElementById('selectAllReqs');
    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('.req-checkbox');
            checkboxes.forEach(cb => {
                if (cb.closest('tr').style.display !== 'none') {
                    cb.checked = selectAll.checked;
                }
            });
            updateActionButtons();
        });
    }

    // Individual checkbox listeners
    const tableBody = document.getElementById('reqsTableBody');
    if (tableBody) {
        tableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('req-checkbox')) {
                updateActionButtons();
            }
        });
    }
    
    // Initial state
    updateActionButtons();
});
