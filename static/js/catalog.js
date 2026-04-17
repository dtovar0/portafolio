/**
 * Catalog Module - Apps Dashboard & Personalization
 */
document.addEventListener('DOMContentLoaded', () => {
    const datos = window.__datos || {};
    const dashboard = document.getElementById('user-dashboard');
    const emptyState = document.getElementById('grid-empty');
    
    let sortable = null;
    let isEditMode = false;

    /* ─── UI Controller ─── */
    const ui = {
        iconsMap: {
            'box': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
            'folder': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
            'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
            'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
            'tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>'
        },

        init() {
            this.renderIcons();
            this.restoreGridState();
            this.restoreFavorites();
            this.initDragAndDrop();
            this.checkPagination();
        },

        renderIcons() {
            document.querySelectorAll('.tab-item[data-icon]').forEach(tab => {
                const iconKey = tab.dataset.icon || 'box';
                const iconSpan = tab.querySelector('.tab-icon');
                if (iconSpan) iconSpan.innerHTML = this.iconsMap[iconKey] || this.iconsMap['box'];
            });

            document.querySelectorAll('.app-icon[data-platform-icon]').forEach(el => {
                const logoUrl = el.dataset.platformLogo;
                if (logoUrl) {
                    el.innerHTML = `<img src="${logoUrl}" class="catalog-platform-logo-img">`;
                } else {
                    const iconKey = el.dataset.platformIcon || 'box';
                    el.innerHTML = this.iconsMap[iconKey] || this.iconsMap['box'];
                    const svg = el.querySelector('svg');
                    if (svg) svg.classList.add('catalog-platform-icon-svg');
                }
            });
        },

        restoreGridState() {
            let savedGrid = localStorage.getItem('nexus_grid') || '3';
            if (savedGrid === '2') savedGrid = '3';
            
            dashboard.classList.remove('grid-cols-3', 'grid-cols-4', 'grid-cols-6');
            dashboard.classList.add(`grid-cols-${savedGrid}`);
            
            document.querySelectorAll('[data-action="switch-grid"]').forEach(b => {
                b.classList.toggle('active', b.dataset.grid === savedGrid);
            });

            setTimeout(() => dashboard.classList.add('transition-ready'), 50);
        },

        restoreFavorites() {
            const favs = JSON.parse(localStorage.getItem('nexus_favs') || '[]');
            document.querySelectorAll('.app-card').forEach(card => {
                if (favs.includes(parseInt(card.dataset.id))) {
                    card.querySelector('.fav-marker').classList.add('active');
                }
            });
        },

        initDragAndDrop() {
            if (!dashboard) return;
            sortable = new Sortable(dashboard, {
                animation: 250,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                disabled: true,
                forceFallback: true
            });
        },

        switchCategoryTab(tabBtn) {
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            tabBtn.classList.add('active');
            
            const filter = tabBtn.dataset.tab;
            const cards = dashboard.querySelectorAll('.app-card');
            const favs = JSON.parse(localStorage.getItem('nexus_favs') || '[]');
            let count = 0;

            cards.forEach(card => {
                const id = parseInt(card.dataset.id);
                let visible = (filter === 'all') || 
                              (filter === 'fav' && favs.includes(id)) || 
                              (card.dataset.area === filter);

                card.style.display = visible ? 'flex' : 'none';
                if (visible) count++;
            });
            
            if (emptyState) emptyState.style.display = count === 0 ? 'block' : 'none';
            this.checkPagination();
        },

        switchGrid(gridBtn) {
            const cols = gridBtn.dataset.grid;
            document.querySelectorAll('[data-action="switch-grid"]').forEach(b => b.classList.remove('active'));
            gridBtn.classList.add('active');
            
            dashboard.classList.remove('grid-cols-3', 'grid-cols-4', 'grid-cols-6');
            dashboard.classList.add(`grid-cols-${cols}`);
            localStorage.setItem('nexus_grid', cols);
            
            this.checkPagination();
        },

        toggleEditMode(btn) {
            isEditMode = !isEditMode;
            dashboard.classList.toggle('edit-mode', isEditMode);
            if (sortable) sortable.option('disabled', !isEditMode);
            
            const icon = btn.querySelector('#lock-icon');
            const text = btn.querySelector('#edit-text');
            
            if (isEditMode) {
                btn.classList.add('is-editing');
                if (text) text.innerText = 'Guardar';
                if (icon) icon.innerHTML = '<path d="M7 11V7a5 5 0 0 1 9.9-1"></path><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>';
            } else {
                btn.classList.remove('is-editing');
                if (text) text.innerText = 'Modo Edición';
                if (icon) icon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
                
                Toast.fire({ icon: 'success', title: 'Diseño Personalizado Guardado' });
            }
        },

        checkPagination() {
            const pagination = document.getElementById('dash-pagination');
            if (!pagination) return;

            const activeCards = Array.from(dashboard.querySelectorAll('.app-card')).filter(c => c.style.display !== 'none');
            const activeGridBtn = document.querySelector('.grid-btn.active');
            const currentGrid = activeGridBtn ? parseInt(activeGridBtn.dataset.grid) : 3;
            const limit = currentGrid * 2;

            pagination.style.display = activeCards.length > limit ? 'flex' : 'none';
        }
    };

    /* ─── Actions Controller ─── */
    const actions = {
        toggleFavorite(e, id, btn) {
            e.preventDefault(); e.stopPropagation();
            let favs = JSON.parse(localStorage.getItem('nexus_favs') || '[]');
            
            if (favs.includes(id)) {
                favs = favs.filter(f => f !== id);
                btn.classList.remove('active');
                
                const activeTab = document.querySelector('.tab-item.active');
                if (activeTab && activeTab.dataset.tab === 'fav') {
                    btn.closest('.app-card').style.display = 'none';
                    ui.checkPagination();
                }
            } else {
                if (favs.length >= 9) {
                    Toast.fire({ icon: 'warning', title: 'Límite de 9 favoritos alcanzado' });
                    return;
                }
                favs.push(id);
                btn.classList.add('active');
            }
            localStorage.setItem('nexus_favs', JSON.stringify(favs));
        },

        async requestAccess(id, name) {
            const result = await Swal.fire({
                title: 'Solicitar Acceso',
                text: `¿Deseas enviar una solicitud para acceder a ${name}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: 'var(--primary-color)',
                cancelButtonColor: 'var(--text-muted)',
                confirmButtonText: 'Sí, solicitar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                try {
                    const res = await fetch(datos.urls.requestAccess, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ platform_id: id, user_id: datos.userId })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        Toast.fire({ icon: 'success', title: 'Solicitud enviada' });
                    } else {
                        Swal.fire({ icon: 'info', title: 'Aviso', text: data.message || data.error });
                    }
                } catch (err) {
                    Toast.fire({ icon: 'error', title: 'Error de conexión' });
                }
            }
        }
    };

    /* ─── Global Click Listener ─── */
    document.addEventListener('click', event => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;

        // Global/Parent handled actions (Handled in script.js):
        // toggle-theme, navigate, toggle-dropdown, etc.

        switch (action) {
            case 'switch-category-tab':
                ui.switchCategoryTab(trigger);
                break;
            case 'switch-grid':
                ui.switchGrid(trigger);
                break;
            case 'toggle-edit-mode':
                ui.toggleEditMode(trigger);
                break;
            case 'catalog-toggle-favorite':
                actions.toggleFavorite(event, parseInt(trigger.dataset.platformId), trigger);
                break;
            case 'catalog-open-url':
                const url = trigger.dataset.url;
                if (url && url !== '#') window.open(url, '_blank');
                break;
            case 'catalog-request-access':
                actions.requestAccess(parseInt(trigger.dataset.platformId), trigger.dataset.platformName || '');
                break;
        }
    });

    // Initialize
    ui.init();
});
