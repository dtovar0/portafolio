// Requires: window.__catalogUserId set inline
var iconsMap = {
    'box': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    'folder': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    'trending-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    'dollar-sign': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    'tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
    'briefcase': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    'monitor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    'truck': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
    'headphones': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>',
    'globe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    'cpu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
    'book': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    'map-pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    'camera': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
    'layers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    'settings': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    'award': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
    'mic': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
    'coffee': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
    'wifi': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    'database': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    'key': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>'
};
// Global Favorite Toggle
window.handleFavClick = function(e, id, buttonEl) {
    e.preventDefault();
    e.stopPropagation();
    
    let favs = JSON.parse(localStorage.getItem('nexus_favs') || '[]');
    const btn = buttonEl || e.currentTarget || e.target.closest('.fav-marker');
    if (!btn) return;
    
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
        btn.classList.remove('active');
        
        // Refresh if in Fav tab
        const activeTab = document.querySelector('.tab-item.active').dataset.tab;
        if (activeTab === 'fav') {
            btn.closest('.app-card').style.display = 'none';
        }
    } else {
        if (favs.length >= 9) {
            Swal.fire({
                icon: 'warning',
                title: 'Límite alcanzado',
                text: 'Solo puedes tener un máximo de 9 favoritos.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            return;
        }
        favs.push(id);
        btn.classList.add('active');
    }
    localStorage.setItem('nexus_favs', JSON.stringify(favs));
};

window.handleRequestAccess = function(platformId, platformName) {
    Swal.fire({
        title: 'Solicitar Acceso',
        text: `¿Deseas enviar una solicitud para acceder a ${platformName}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sí, solicitar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const userId = window.__catalogUserId;
            fetch('/api/request-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform_id: platformId, user_id: userId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Solicitud enviada', text: data.message, toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000 });
                } else {
                    Swal.fire({ icon: 'info', title: 'Aviso', text: data.message || data.error });
                }
            })
            .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la solicitud' }));
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;
        if (action === 'catalog-toggle-theme') return window.toggleTheme();
        if (action === 'catalog-toggle-favorite') {
            return window.handleFavClick(event, Number(trigger.dataset.platformId), trigger);
        }
        if (action === 'catalog-open-url') {
            const url = trigger.dataset.url;
            if (url) window.open(url, '_blank');
            return;
        }
        if (action === 'catalog-request-access') {
            return window.handleRequestAccess(Number(trigger.dataset.platformId), trigger.dataset.platformName || '');
        }
    });

    // Render tab icons
    document.querySelectorAll('.tab-item[data-icon]').forEach(tab => {
        const iconKey = tab.getAttribute('data-icon') || 'box';
        const iconSpan = tab.querySelector('.tab-icon');
        if (iconSpan) iconSpan.innerHTML = iconsMap[iconKey] || iconsMap['box'];
    });

    // Render platform card icons or logos
    document.querySelectorAll('.app-icon[data-platform-icon]').forEach(el => {
        const logoUrl = el.getAttribute('data-platform-logo');
        if (logoUrl && logoUrl !== '') {
            el.innerHTML = `<img src="${logoUrl}" class="catalog-platform-logo-img">`;
        } else {
            const iconKey = el.getAttribute('data-platform-icon') || 'box';
            el.innerHTML = iconsMap[iconKey] || iconsMap['box'];
            const svg = el.querySelector('svg');
            if (svg) {
                svg.classList.add('catalog-platform-icon-svg');
            }
        }
    });

    const dashboard = document.getElementById('user-dashboard');
    const gridBtns = document.querySelectorAll('.grid-btn');
    const tabs = document.querySelectorAll('.tab-item');
    const editBtn = document.getElementById('edit-mode-btn');
    const pagination = document.getElementById('dash-pagination');
    const emptyState = document.getElementById('grid-empty');
    
    let sortable = null;
    let isEditMode = false;

    // Restore saved grid preference (no animation) with migration check
    let savedGrid = localStorage.getItem('nexus_grid') || '3';
    if (savedGrid === '2') savedGrid = '3'; // Migration from 2x2 to 3x2
    
    dashboard.classList.remove('grid-cols-3', 'grid-cols-4', 'grid-cols-6');
    dashboard.classList.add(`grid-cols-${savedGrid}`);
    gridBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.grid === savedGrid);
    });

    // Enable transitions only after initial setup to avoid F5 animation
    setTimeout(() => {
        dashboard.classList.add('transition-ready');
    }, 50);

    // 1. Initialize Drag and Drop
    function initDrag() {
        sortable = new Sortable(dashboard, {
            animation: 250,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            disabled: true, // Start locked
            forceFallback: true, // Better visual feedback
            onEnd: function() {
                console.log('Layout Order Updated');
            }
        });
    }
    initDrag();

    // 2. Grid Size Toggle
    gridBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = btn.dataset.grid;
            gridBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            dashboard.classList.remove('grid-cols-3', 'grid-cols-4', 'grid-cols-6');
            dashboard.classList.add(`grid-cols-${cols}`);
            localStorage.setItem('nexus_grid', cols);
            
            checkPagination();
        });
    });

    // 3. Category Tabs Filtering
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const filter = tab.dataset.tab;
            const cards = dashboard.querySelectorAll('.app-card');
            let count = 0;
            
            const favs = JSON.parse(localStorage.getItem('nexus_favs') || '[]');

            cards.forEach(card => {
                const id = parseInt(card.dataset.id);
                let visible = false;
                
                if (filter === 'all') {
                    visible = true;
                } else if (filter === 'fav') {
                    visible = favs.includes(id);
                } else {
                    visible = (card.dataset.area === filter);
                }

                if (visible) {
                    card.style.display = 'flex';
                    count++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            emptyState.style.display = count === 0 ? 'block' : 'none';
            // We keep dashboard display property stable to maintain layout structure
            dashboard.style.display = 'grid';
            
            checkPagination();
        });
    });

    // 4. Initialization: Load Favs from Storage
    const initialFavs = JSON.parse(localStorage.getItem('nexus_favs') || '[]');
    document.querySelectorAll('.app-card').forEach(card => {
        if (initialFavs.includes(parseInt(card.dataset.id))) {
            card.querySelector('.fav-marker').classList.add('active');
        }
    });

    // 5. Edit Mode Logic
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            dashboard.classList.toggle('edit-mode', isEditMode);
            sortable.option('disabled', !isEditMode);
            
            const icon = document.getElementById('lock-icon');
            const text = document.getElementById('edit-text');
            
            if (isEditMode) {
                editBtn.classList.add('is-editing');
                text.innerText = 'Guardar';
                icon.innerHTML = '<path d="M7 11V7a5 5 0 0 1 9.9-1"></path><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>';
            } else {
                editBtn.classList.remove('is-editing');
                text.innerText = 'Modo Edición';
                icon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
                
                // Show Save Confirmation
                Swal.fire({
                    icon: 'success',
                    title: 'Diseño Personalizado Guardado',
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            }
        });
    }

    // 5. Smart Pagination Logic
    function checkPagination() {
        const activeCards = Array.from(dashboard.querySelectorAll('.app-card')).filter(c => c.style.display !== 'none');
        const currentGrid = parseInt(document.querySelector('.grid-btn.active').dataset.grid);
        const limit = currentGrid * 2; // Show up to 2 rows of the current grid

        if (activeCards.length > limit) {
            pagination.style.display = 'flex';
        } else {
            pagination.style.display = 'none';
        }
    }
    
    // Initial check
    checkPagination();

    // 6. User Dropdown Logic (Refined)
    const userTrigger = document.getElementById('user-profile-trigger');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userTrigger && userDropdown) {
        const setDropdownState = (isOpen) => {
            userDropdown.classList.toggle('show', isOpen);
            userTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        };

        userTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            setDropdownState(!userDropdown.classList.contains('show'));
        });

        document.addEventListener('click', (e) => {
            if (!userDropdown.classList.contains('show')) return;
            if (!userDropdown.contains(e.target) && !userTrigger.contains(e.target)) {
                setDropdownState(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && userDropdown.classList.contains('show')) {
                setDropdownState(false);
                userTrigger.focus();
            }
        });
    }
});
