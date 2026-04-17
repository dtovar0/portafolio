/**
 * Users Management Interactivity - Table & Selection
 */

// Global state
var currentPage = 1;
var rowsPerPage = 10;
var currentFilteredUsers = [];

var iconsMap = {
    'server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',
    'cloud': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
    'cpu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
    'database': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    'lock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    'box': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.11-1.79V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"></path><polyline points="2.32 6.16 12 11 21.68 6.16"></polyline><line x1="12" y1="22.76" x2="12" y2="11"></line></svg>'
};

function createPremiumEmptyState(title, text, iconClass = 'fa-search') {
    return `
        <div class="premium-empty-state">
            <div class="empty-state-visual">
                <div class="empty-state-blob"></div>
                <div class="empty-state-icon-wrapper">
                    <i class="fas ${iconClass}"></i>
                </div>
            </div>
            <h3 class="empty-state-title">${title}</h3>
            <p class="empty-state-text">${text}</p>
        </div>
    `;
}


function getAreaColor(name) {
    if (!name) return 'linear-gradient(135deg, #6366f1, #818cf8)';
    const colors = [
        'linear-gradient(135deg, #6366f1, #818cf8)',
        'linear-gradient(135deg, #10b981, #34d399)',
        'linear-gradient(135deg, #f59e0b, #fbbf24)',
        'linear-gradient(135deg, #ef4444, #f87171)',
        'linear-gradient(135deg, #3b82f6, #60a5fa)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// ─── Modal Functions ───

async function toggleUserModal() {
    const form = document.getElementById('addUserForm');
    if (form) form.reset();
    
    const s1 = document.getElementById('addUserStep1Content');
    const s2 = document.getElementById('addUserStep2Content');
    if (s1) s1.classList.add('active');
    if (s2) s2.classList.remove('active');

    // UI Buttons
    ['btnAddUserNext', 'btnAddUserSubmit', 'btnAddUserBack', 'btnAddUserCancel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === 'btnAddUserNext' ? 'flex' : (id === 'btnAddUserCancel' ? 'block' : 'none'));
    });

    // Indicators
    const i1 = document.getElementById('addUserItem1');
    const i2 = document.getElementById('addUserItem2');
    const progress = document.getElementById('addUserStepProgress');
    if (i1) i1.className = 'step-item active';
    if (i2) i2.className = 'step-item';
    if (progress) progress.style.width = '0%';

    await refreshPicklistAreas('addUser');

    // Reset to Step 1
    changeUserStep(1);

    if (window.openModal) window.openModal('addUserModal');
    else document.getElementById('addUserModal').classList.add('show');
}

async function refreshPicklistAreas(prefix, selectedNames = []) {
    try {
        const res = await fetch('/admin/areas-api');
        const areas = await res.json();
        
        const available = areas.filter(a => !selectedNames.includes(a.name));
        const assigned = areas.filter(a => selectedNames.includes(a.name));

        populateUserPicklist(`${prefix}AvailableList`, available);
        populateUserPicklist(`${prefix}SelectedList`, assigned);
        
        updateUserAreasHiddenInput();
    } catch (e) { console.error("Areas API error:", e); }
}

function populateUserPicklist(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'picklist-card-premium';
        card.setAttribute('data-action', 'users-toggle-area');
        card.setAttribute('data-area-name', item.name);
        card.setAttribute('data-list-id', containerId);
        
        card.innerHTML = `
            <div class="card-icon" style="background: ${item.color || getAreaColor(item.name)}">
                ${iconsMap[item.icon] || iconsMap['box']}
            </div>
            <div class="card-info">
                <span class="card-name">${item.name}</span>
                <span class="card-meta">${item.description || 'Área de trabajo'}</span>
            </div>
            <div class="card-action-icon">
                <i class="fas ${containerId.includes('Available') ? 'fa-plus' : 'fa-times'}"></i>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleUserArea(area, currentListId) {
    const isAvailable = currentListId.includes('Available');
    const targetListId = isAvailable ? currentListId.replace('Available', 'Selected') : currentListId.replace('Selected', 'Available');
    
    const sourceList = document.getElementById(currentListId);
    const targetList = document.getElementById(targetListId);
    
    // Find and remove from source
    const items = Array.from(sourceList.children);
    const itemToMove = items.find(el => el.querySelector('.card-name').textContent === area.name);
    if (itemToMove) itemToMove.remove();
    
    // Add to target
    const currentTargetItems = Array.from(targetList.querySelectorAll('.card-name')).map(el => el.textContent);
    if (!currentTargetItems.includes(area.name)) {
        const areaData = (window.__areaData || []).find(a => a.name === area.name) || area;
        const newCard = document.createElement('div');
        newCard.className = 'picklist-card-premium' + (isAvailable ? ' selected' : '');
        newCard.setAttribute('data-action', 'users-toggle-area');
        newCard.setAttribute('data-area-name', areaData.name);
        newCard.setAttribute('data-list-id', targetListId);
        newCard.innerHTML = `
            <div class="card-icon" style="background: ${areaData.color || getAreaColor(areaData.name)}">
                ${iconsMap[areaData.icon] || iconsMap['box']}
            </div>
            <div class="card-info">
                <span class="card-name">${areaData.name}</span>
                <span class="card-meta">${areaData.description || 'Área de trabajo'}</span>
            </div>
            <div class="card-action-icon">
                <i class="fas ${isAvailable ? 'fa-times' : 'fa-plus'}"></i>
            </div>
        `;
        targetList.appendChild(newCard);
    }
    updateUserAreasHiddenInput();
}

function updateUserAreasHiddenInput() {
    const selected = Array.from(document.querySelectorAll('#addUserSelectedList .card-name')).map(el => el.textContent);
    const input = document.getElementById('selectedUserAreasInput');
    if (input) input.value = JSON.stringify(selected);
}

function filterUserPicklist(input, listId) {
    const term = input.value.toLowerCase();
    const items = document.querySelectorAll(`#${listId} .picklist-card-premium`);
    items.forEach(item => {
        const name = item.querySelector('.card-name').textContent.toLowerCase();
        item.style.display = name.includes(term) ? 'flex' : 'none';
    });
}
window.filterUserPicklist = filterUserPicklist;

function updateActionButtons() {
    const checked = document.querySelectorAll('.user-checkbox:checked');
    const count = checked.length;
    const btnEdit = document.getElementById('btnEditUser');
    const btnDelete = document.getElementById('btnDeleteUser');
    const btnAccess = document.getElementById('btnAccessUser');

    if (btnEdit) btnEdit.disabled = (count !== 1);
    if (btnAccess) btnAccess.disabled = (count !== 1);
    if (btnDelete) btnDelete.disabled = (count === 0);
}

// ─── Search & Render ───

function handleUserSearch() {
    const term = document.getElementById('userSearch').value.toLowerCase();
    if (typeof allUsersData === 'undefined') return;
    
    currentFilteredUsers = allUsersData.filter(u => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        return name.includes(term) || email.includes(term) || role.includes(term);
    });
    
    currentPage = 1;
    renderUsersTable();
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const pageData = currentFilteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (pageData.length === 0) {
        const isSearch = document.getElementById('userSearch')?.value.trim() !== "";
        const icon = isSearch ? 'fa-search' : 'fa-users-slash';
        const title = isSearch ? 'Sin resultados' : 'Sin Usuarios';
        const text = isSearch ? 'No pudimos encontrar usuarios que coincidan con su búsqueda.' : 'No hay usuarios registrados en el sistema.';

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    ${createPremiumEmptyState(title, text, icon)}
                </td>
            </tr>
        `;
        renderPagination();
        return;
    }

    pageData.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="col-cb">
                <input type="checkbox" class="user-checkbox" value="${user.id}">
            </td>
            <td><span class="fw-600">${user.name}</span></td>
            <td class="text-muted">${user.email}</td>
            <td>
                <span class="badge ${user.status === 'Activo' ? 'badge-success' : 'badge-danger'}">
                    <span class="status-dot"></span> ${user.status}
                </span>
            </td>
            <td class="text-center">${user.platforms_count > 0 ? `<span class="badge-count">${user.platforms_count}</span>` : ''}</td>
            <td>
                <div class="area-icon-list">
                    ${(user.areas || []).map(a => `
                        <div class="area-icon-wrapper" style="background: ${a.color || getAreaColor(a.name || a)}" data-tooltip="${a.name || a}">
                            ${iconsMap[a.icon] || iconsMap['box']}
                        </div>
                    `).join('')}
                </div>
            </td>
            <td>
                ${(() => {
                    const r = (user.role || '').toLowerCase();
                    if (r.includes('admin')) return `<span class="badge badge-info"><i class="fas fa-shield-alt" style="margin-right: 4px;"></i> ${user.role}</span>`;
                    if (r.includes('auditor')) return `<span class="badge badge-warning"><i class="fas fa-eye" style="margin-right: 4px;"></i> ${user.role}</span>`;
                    if (r.includes('usuario')) return `<span class="badge badge-success"><i class="fas fa-user" style="margin-right: 4px;"></i> ${user.role}</span>`;
                    return `<span class="badge" style="background: var(--bg-hover); color: var(--text-muted); border: 1px solid var(--border-color);"><i class="fas fa-id-badge" style="margin-right: 4px;"></i> ${user.role || 'Invitado'}</span>`;
                })()}
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination();

    // Reset selection state after render
    const selectAll = document.getElementById('selectAllUsers');
    if (selectAll) selectAll.checked = false;
    updateActionButtons();
}

function renderPagination() {
    const container = document.getElementById('usersPagination');
    if (!container) return;
    const totalPages = Math.ceil(currentFilteredUsers.length / rowsPerPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="pagination-info">Mostrando ${Math.min(currentFilteredUsers.length, (currentPage-1)*rowsPerPage+1)}-${Math.min(currentFilteredUsers.length, currentPage*rowsPerPage)} de ${currentFilteredUsers.length}</div>
        <div class="pagination-controls">
            <button class="page-btn-modern" data-action="users-change-page" data-offset="-1" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <span class="page-indicator">${currentPage} / ${totalPages}</span>
            <button class="page-btn-modern" data-action="users-change-page" data-offset="1" ${currentPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
        </div>
    `;
}

function changeUserPage(offset) {
    currentPage += offset;
    renderUsersTable();
}

// ─── Export Functions to Window ───
window.toggleUserModal = toggleUserModal;
window.updateActionButtons = updateActionButtons;
window.handleUserSearch = handleUserSearch;
window.changeUserPage = changeUserPage;
window.closeAddUserModal = () => window.closeModal('addUserModal');
window.closeEditUserModal = () => window.closeModal('editUserModal');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (typeof allUsersData !== 'undefined') {
        currentFilteredUsers = [...allUsersData];
        renderUsersTable();
    }
    
    const searchInput = document.getElementById('userSearch');
    if (searchInput) searchInput.addEventListener('input', handleUserSearch);

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.getAttribute('data-action');

        if (action === 'users-open-access') return openSelectedUserAccess();
        if (action === 'users-edit-selected') return editSelectedUser();
        if (action === 'users-delete-selected') return deleteSelectedUsers();
        if (action === 'users-close-edit-modal') return window.closeModal('editUserModal');
        if (action === 'users-close-add-modal') return window.closeModal('addUserModal');
        if (action === 'users-step-next') return changeUserStep(2);
        if (action === 'users-step-back') return changeUserStep(1);
        if (action === 'users-submit-new') return saveNewUser(event);
        if (action === 'users-move-picklist') return movePicklist(trigger.dataset.source, trigger.dataset.target);
        if (action === 'users-close-access-modal') return window.closeModal('userAccessModal');
        if (action === 'users-move-access-picklist') return moveAccessPicklist(trigger.dataset.source, trigger.dataset.target);
        if (action === 'users-save-access') return saveUserPlatformAccess();
        if (action === 'users-open-type-modal') return window.openModal('userTypeModal');
        if (action === 'users-close-type-modal') return window.closeModal('userTypeModal');
        if (action === 'users-open-local-flow') {
            window.closeModal('userTypeModal');
            window.openModal('addUserModal');
            return;
        }
        if (action === 'users-open-ldap-flow') {
            window.closeModal('userTypeModal');
            window.openModal('ldapUserModal');
            return;
        }
        if (action === 'users-close-ldap-modal') return window.closeModal('ldapUserModal');
        if (action === 'users-back-ldap-to-type') {
            window.closeModal('ldapUserModal');
            window.openModal('userTypeModal');
        }
        if (action === 'users-submit-edit') {
            event.preventDefault();
            return saveUserChanges(event);
        }
        if (action === 'users-change-page') return changeUserPage(parseInt(trigger.dataset.offset));
        if (action === 'users-toggle-area') {
            const areaName = trigger.dataset.areaName;
            const area = (window.__areaData || []).find(a => a.name === areaName) || { name: areaName };
            return toggleUserArea(area, trigger.dataset.listId);
        }
        if (action === 'users-import-ldap') {
            return window.importLDAPUser(trigger.dataset.username);
        }
        if (action === 'users-select-all') {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(cb => cb.checked = trigger.checked);
            updateActionButtons();
        }
    });

    document.addEventListener('change', (event) => {
        if (event.target.classList.contains('user-checkbox')) {
            updateActionButtons();
        }
        const toggle = event.target.closest('.js-status-toggle');
        if (!toggle) return;

        const onLabel = toggle.dataset.onLabel || 'Activo';
        const offLabel = toggle.dataset.offLabel || 'Inactivo';
        let target = null;

        if (toggle.dataset.targetId) {
            target = document.getElementById(toggle.dataset.targetId);
        } else if (toggle.dataset.targetSelector) {
            const wrapper = toggle.closest('.input-toggle-wrapper');
            if (wrapper) target = wrapper.querySelector(toggle.dataset.targetSelector);
        }

        if (target) target.textContent = toggle.checked ? onLabel : offLabel;
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const trigger = event.target.closest('[data-action="users-open-local-flow"], [data-action="users-open-ldap-flow"]');
        if (!trigger) return;
        event.preventDefault();
        trigger.click();
    });
});

function movePicklist(sourceId, targetId) {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);
    if (!source || !target) return;
    Array.from(source.selectedOptions).forEach(opt => {
        opt.selected = false;
        target.appendChild(opt);
    });
    // Sort
    const options = Array.from(target.options).sort((a,b) => a.text.localeCompare(b.text));
    target.innerHTML = '';
    options.forEach(o => target.appendChild(o));
}

// ─── Edit / Delete / Access ───

async function editSelectedUser() {
    const checked = document.querySelector('.user-checkbox:checked');
    if (!checked) return;
    const user = allUsersData.find(u => u.id == checked.value);
    if (!user) return;

    document.getElementById('editUserNameHidden').value = user.id;
    document.getElementById('editUserNameDisplay').innerText = user.name;
    document.getElementById('editUserRole').value = user.role;
    
    const stEl = document.getElementById('editUserStatusToggle');
    if (stEl) {
        stEl.checked = (user.status === 'Activo');
        document.getElementById('editUserStatusText').textContent = stEl.checked ? 'Activo' : 'Deshabilitado';
    }

    await refreshPicklistAreas('editUser', user.areas ? user.areas.map(a => a.name || a) : []);
    window.openModal('editUserModal');
}
window.editSelectedUser = editSelectedUser;

function changeUserStep(step) {
    const s1 = document.getElementById('addUserStep1');
    const s2 = document.getElementById('addUserStep2');
    const p1 = document.getElementById('addUserStep1_pill');
    const p2 = document.getElementById('addUserStep2_pill');
    const progress = document.getElementById('addUserStepProgress');
    const btnBack = document.getElementById('btnAddUserBack');
    const btnNext = document.getElementById('btnAddUserNext');
    const btnSubmit = document.getElementById('btnAddUserSubmit');
    const btnCancel = document.getElementById('btnAddUserCancel');

    if (step === 2) {
        // Validation for step 1
        if (window.validatePremiumForm && !window.validatePremiumForm(s1)) return;

        // Email Format Validation
        const emailInput = document.getElementById('addUserEmail');
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailInput.value)) {
            emailInput.classList.add('input-error');
            emailInput.classList.add('empty-required');
            if (typeof Toast !== 'undefined') {
                Toast.fire({ icon: 'error', title: 'Email inválido', text: 'Por favor ingrese un formato de correo electrónico correcto.' });
            }
            return;
        }
        
        s1.classList.remove('active');
        s2.classList.add('active');
        p1.classList.add('completed');
        p2.classList.add('active');
        progress.style.width = '100%';
        btnBack.style.display = 'block';
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'block';
        btnCancel.style.display = 'none';
    } else {
        s1.classList.add('active');
        s2.classList.remove('active');
        p1.classList.remove('completed');
        p1.classList.add('active');
        p2.classList.remove('active');
        progress.style.width = '0%';
        btnBack.style.display = 'none';
        btnNext.style.display = 'flex';
        btnSubmit.style.display = 'none';
        btnCancel.style.display = 'block';
    }
}
window.changeUserStep = changeUserStep;

function nextAddUserStep() {
    changeUserStep(2);
}
window.nextAddUserStep = nextAddUserStep;

function prevAddUserStep() {
    changeUserStep(1);
}
window.prevAddUserStep = prevAddUserStep;

async function saveNewUser(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('addUserForm');
    if (window.validatePremiumForm && !window.validatePremiumForm(form)) return;

    const rawFd = new FormData(form);
    const fd = new URLSearchParams();
    for (const [key, value] of rawFd) {
        fd.append(key, value);
    }
    const selectedAreas = document.getElementById('selectedUserAreasInput').value || '[]';
    fd.set('areas', selectedAreas);
    fd.set('status', document.getElementById('addUserStatusToggle').checked ? 'Activo' : 'Deshabilitado');

    const res = await fetch('/admin/add-user', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
        if (window.closeModal) window.closeModal('addUserModal');
        Toast.fire({ 
            icon: 'success', 
            title: 'Usuario creado',
            customClass: {
                popup: 'toast-save'
            }
        });
        setTimeout(() => location.reload(), 800);
    } else {
        Swal.fire('Error', data.error, 'error');
    }
}
window.saveNewUser = saveNewUser;

async function saveUserChanges(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('editUserNameHidden').value;
    const userId = parseInt(id, 10);
    const form = document.getElementById('editUserForm');
    
    if (window.validatePremiumForm && !window.validatePremiumForm(form)) return;

    // Collect areas from picklist
    const selectedOptions = document.getElementById('editUserSelected').options;
    const areas = Array.from(selectedOptions).map(opt => opt.value);
    const user = (allUsersData || []).find(u => u.id == userId);

    const fd = new URLSearchParams();
    if (user) {
        fd.append('name', user.name || '');
        fd.append('email', user.email || '');
    }
    fd.append('role', document.getElementById('editUserRole').value);
    fd.append('status', document.getElementById('editUserStatusToggle').checked ? 'Activo' : 'Inactivo');
    fd.append('areas', JSON.stringify(areas));

    try {
        const res = await fetch(`/admin/edit-user/${id}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            if (window.closeModal) window.closeModal('editUserModal');
            Toast.fire({ icon: 'success', title: 'Usuario actualizado' });
            setTimeout(() => location.reload(), 800);
        } else {
            Swal.fire('Error', data.error || 'No se pudo actualizar', 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Fallo en la comunicación con el servidor', 'error');
    }
}
window.saveUserChanges = saveUserChanges;

// ─── Delete & Access ───

async function deleteSelectedUsers() {
    const checked = document.querySelectorAll('.user-checkbox:checked');
    if (checked.length === 0) return;

    Swal.fire({
        title: `¿Eliminar ${checked.length} usuarios?`,
        text: "Esta acción revocará sus accesos al portal.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const ids = Array.from(checked).map(cb => cb.value);
            for (let id of ids) {
                await fetch(`/admin/delete-user/${id}`, { method: 'POST' });
            }
            Toast.fire({ 
                icon: 'success', 
                title: `Operación finalizada`,
                customClass: {
                    popup: 'toast-delete'
                }
            });
            setTimeout(() => location.reload(), 500);
        }
    });
}
window.deleteSelectedUsers = deleteSelectedUsers;

function openSelectedUserAccess() {
    const checked = document.querySelector('.user-checkbox:checked');
    if (checked) adminUserAccess(checked.value);
}
window.openSelectedUserAccess = openSelectedUserAccess;

var currentAccessUserId = null;
async function adminUserAccess(userId) {
    currentAccessUserId = userId;
    const availableSelect = document.getElementById('accessAvailable');
    const selectedSelect = document.getElementById('accessSelected');
    if (!availableSelect || !selectedSelect) return;

    availableSelect.innerHTML = '<option disabled>Cargando...</option>';
    selectedSelect.innerHTML = '';
    
    if (window.openModal) window.openModal('userAccessModal');

    try {
        const res = await fetch(`/admin/user-access/${userId}`);
        const data = await res.json();
        if (data.success) {
            const nameEl = document.getElementById('accessUserName');
            if (nameEl) nameEl.textContent = `Usuario: ${data.user}`;
            
            availableSelect.innerHTML = '';
            if (data.platforms.length === 0) {
                availableSelect.innerHTML = '<option disabled>No hay plataformas disponibles</option>';
            } else {
                data.platforms.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `[${p.area_name}] ${p.name}`;
                    if (p.has_access) selectedSelect.appendChild(opt);
                    else availableSelect.appendChild(opt);
                });
            }
        }
    } catch (err) { console.error(err); }
}
window.adminUserAccess = adminUserAccess;

async function saveUserPlatformAccess() {
    if (!currentAccessUserId) return;
    const selectedOptions = document.getElementById('accessSelected').options;
    const platformIds = Array.from(selectedOptions).map(opt => parseInt(opt.value));

    try {
        const res = await fetch(`/admin/update-user-access/${currentAccessUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform_ids: platformIds })
        });
        const data = await res.json();
        if (data.success) {
            Toast.fire({ 
                icon: 'success', 
                title: data.message,
                customClass: {
                    popup: 'toast-save'
                }
            });
            if (window.closeModal) window.closeModal('userAccessModal');
            setTimeout(() => location.reload(), 1000);
        }
    } catch (err) { console.error(err); }
}
window.saveUserPlatformAccess = saveUserPlatformAccess;

function moveAccessPicklist(fromId, toId) {
    movePicklist(fromId, toId);
}
window.moveAccessPicklist = moveAccessPicklist;

/* ─── LDAP Integration ─── */
async function searchLDAPUser() {
    const query = document.getElementById('ldapQuery').value.trim();
    if (!query) return;

    // Show loading
    const resultsList = document.getElementById('ldapResultsList');
    const container = document.getElementById('ldapResultsContainer');
    container.classList.remove('d-none');
    resultsList.innerHTML = '<div class="text-center p-2"><i class="fas fa-circle-notch fa-spin"></i> Buscando en el directorio...</div>';

    try {
        const res = await fetch(`/admin/ldap-search-api?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        resultsList.innerHTML = '';
        if (data.success && data.users.length > 0) {
            data.users.forEach(user => {
                const item = document.createElement('div');
                item.className = 'stat-card modern p-1 mb-05 d-flex justify-between items-center';
                item.style.cursor = 'default';
                item.innerHTML = `
                    <div class="d-flex items-center gap-1">
                        <div class="avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">${(user.displayName || user.cn || 'U').charAt(0)}</div>
                        <div>
                            <div class="fw-700 fs-xs">${user.displayName || user.cn}</div>
                            <div class="fs-xs text-muted">${user.mail || user.userPrincipalName || 'Sin correo'}</div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-primary" style="height: 32px; width: auto; padding: 0 1rem;" data-action="users-import-ldap" data-username="${user.sAMAccountName || user.uid}">
                        Importar
                    </button>
                `;
                resultsList.appendChild(item);
            });
        } else {
            resultsList.innerHTML = '<div class="text-center p-2 text-muted fs-xs">No se encontraron coincidencias.</div>';
        }
    } catch (e) {
        resultsList.innerHTML = '<div class="text-center p-2 text-danger fs-xs">Error al conectar con el servidor LDAP.</div>';
    }
}
window.searchLDAPUser = searchLDAPUser;

async function importLDAPUser(username) {
    Swal.fire({
        title: 'Importar Usuario',
        text: `¿Desea importar a ${username} como nuevo usuario?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, importar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('/admin/import-ldap-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username })
                });
                const data = await res.json();
                if (data.success) {
                    Toast.fire({ 
                        icon: 'success', 
                        title: 'Usuario importado correctamente',
                        customClass: {
                            popup: 'toast-save'
                        }
                    });
                    setTimeout(() => location.reload(), 800);
                } else {
                    Swal.fire('Error', data.error, 'error');
                }
            } catch (e) {
                console.error(e);
            }
        }
    });
}
window.importLDAPUser = importLDAPUser;
