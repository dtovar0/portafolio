/**
 * Global Interactivity - Script Principal
 */

// Global Toast configuration
var Toast = window.Toast || Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});
window.Toast = Toast;

/* ─── Global Security: Fetch Interceptor ─── */
(function() {
    const originalFetch = window.fetch;
    window.fetch = function() {
        let [resource, config] = arguments;
        if (config && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            if (csrfMeta) {
                config.headers = config.headers || {};
                const token = csrfMeta.getAttribute('content');
                
                // Add token to headers
                config.headers['X-CSRFToken'] = token;
                
                // For JSON requests, ensure Content-Type is set if not present
                if (!(config.body instanceof FormData) && !config.headers['Content-Type']) {
                    config.headers['Content-Type'] = 'application/json';
                }
            }
        }
        return originalFetch(resource, config);
    };
})();

/* ─── Event Delegation ─── */
document.addEventListener('DOMContentLoaded', () => {
    const contexto = window.__contexto || {};

    // Restore Sidebar State
    initSidebar();

    document.addEventListener('click', e => {
        const trigger = e.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;

        if (action === 'toggle-sidebar') {
            toggleSidebar();
        }

        if (action === 'toggle-dropdown') {
            toggleDropdown(trigger.dataset.target);
        }

        if (action === 'go-home') {
            const homeUrl = contexto.urls.home || (window.__datos && window.__datos.urls && window.__datos.urls.home);
            if (homeUrl) window.location.href = homeUrl;
        }

        if (action === 'navigate') {
            const url = trigger.dataset.url;
            if (url) window.location.href = url;
        }

        if (action === 'toggle-theme' || action === 'login-toggle-theme' || action === 'catalog-toggle-theme') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (typeof window.toggleTheme === 'function') {
                window.toggleTheme();
            }
            return;
        }

        if (action === 'close-modal') {
            closeModal(trigger.dataset.target);
        }
    });

    // Global Form Submit Interceptor
    document.addEventListener('submit', e => {
        if (e.target.hasAttribute('data-premium-validate')) {
            const isModalCrud = ['addUserForm', 'addAreaForm', 'editAreaForm'].includes(e.target.id);
            if (isModalCrud) e.preventDefault();
        }
    });

    const globalSearch = document.querySelector('.js-global-search');
    if (globalSearch) {
        globalSearch.addEventListener('input', e => {
            if (window.handleGlobalSearch) window.handleGlobalSearch(e.target.value);
        });
    }

    // Initial icon setup for theme
    updateThemeIcons();
});

// Auto-bind to all forms if they have 'data-premium-validate'
document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.hasAttribute('data-premium-validate')) {
        if (!window.validatePremiumForm(form)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

/* ─── Premium Form Validation ─── */
function validatePremiumForm(formElement) {
    if (!formElement) return true;
    
    let isValid = true;
    const requiredInputs = formElement.querySelectorAll('[required]');
    
    clearPremiumErrors(formElement);

    let firstErrorGroup = null;
    for (const input of requiredInputs) {
        if (input.disabled) continue; // Skip disabled inputs
        if (!input.value || (input.type === 'checkbox' && !input.checked)) {
            isValid = false;
            const inputGroup = input.closest('.input-group, .input-group-premium');
            const target = inputGroup || input;
            
            target.classList.add('input-error');
            target.classList.add('empty-required');
            if (!firstErrorGroup) firstErrorGroup = target;
        }
    }

    if (!isValid && firstErrorGroup) {
        firstErrorGroup.style.animation = 'none';
        firstErrorGroup.offsetHeight;
        firstErrorGroup.style.animation = '';
        
        const inputToFocus = firstErrorGroup.querySelector('input, textarea, select') || 
                             (firstErrorGroup.tagName === 'INPUT' ? firstErrorGroup : null);
        if (inputToFocus) inputToFocus.focus();
    }

    return isValid;
}

function clearPremiumErrors(container) {
    if (!container) return;
    const errorElements = container.querySelectorAll('.input-error, .empty-required');
    errorElements.forEach(el => {
        el.classList.remove('input-error');
        el.classList.remove('empty-required');
        el.style.animation = '';
    });
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.classList.remove('input-error');
    });
}

window.validatePremiumForm = validatePremiumForm;
window.clearPremiumErrors = clearPremiumErrors;

/* ─── Modal Management ─── */
const modalLastFocusedElement = new Map();

function getFocusableElements(container) {
    if (!container) return [];
    const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ];
    return Array.from(container.querySelectorAll(selectors.join(',')))
        .filter(el => el.offsetParent !== null);
}

function trapModalFocus(e) {
    if (e.key !== 'Tab') return;
    const openModals = Array.from(document.querySelectorAll('.modal-overlay.show'));
    const activeModal = openModals[openModals.length - 1];
    if (!activeModal) return;

    const focusable = getFocusableElements(activeModal);
    if (!focusable.length) {
        e.preventDefault();
        activeModal.focus();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modalLastFocusedElement.set(id, document.activeElement);
        window.clearPremiumErrors(modal);
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('tabindex', '-1');
        document.body.style.overflow = 'hidden';

        const focusable = getFocusableElements(modal);
        const nextFocus = focusable.length ? focusable[0] : modal;
        requestAnimationFrame(() => nextFocus.focus());
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');

        if (!document.querySelector('.modal-overlay.show')) {
            document.body.style.overflow = '';
        }

        const lastFocused = modalLastFocusedElement.get(id);
        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus();
        }
        modalLastFocusedElement.delete(id);
        window.clearPremiumErrors(modal);
    }
}

window.openModal = openModal;
window.closeModal = closeModal;

/* ─── Confirm Dialog ─── */
window.showConfirm = function(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;

    document.getElementById('confirmTitle').innerText = title || '¿Estás seguro?';
    document.getElementById('confirmMessage').innerText = message || 'Esta acción no se puede deshacer.';

    const btn = document.getElementById('confirmBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', () => {
        if (typeof onConfirm === 'function') onConfirm();
        closeModal('confirmModal');
    });

    openModal('confirmModal');
};

/* ─── Global UI Components ─── */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    const state = sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded';
    localStorage.setItem('sidebarState', state);
}
window.toggleSidebar = toggleSidebar;

function initSidebar() {
    const state = localStorage.getItem('sidebarState');
    const sidebar = document.getElementById('sidebar');
    if (sidebar && state === 'collapsed') {
        sidebar.classList.add('collapsed');
    } else if (sidebar && state === 'expanded') {
        sidebar.classList.remove('collapsed');
    }
}
window.initSidebar = initSidebar;

function toggleDropdown(id) {
    const drop = document.getElementById(id || 'userDropdown');
    if (drop) drop.classList.toggle('show');
}
window.toggleDropdown = toggleDropdown;

function updateThemeIcons() {
    const theme = document.documentElement.getAttribute('data-theme');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const adminThemeIcon = document.querySelector('#themeToggle i');
    
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }

    if (adminThemeIcon) {
        adminThemeIcon.classList.remove('fa-moon', 'fa-sun');
        adminThemeIcon.classList.add(theme === 'dark' ? 'fa-sun' : 'fa-moon');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcons();
    
    const isLoginPage = document.body.classList.contains('login-page') || window.location.pathname.includes('/login');
    if (!isLoginPage && typeof Toast !== 'undefined' && Toast.fire) {
        Toast.fire({
            icon: 'success',
            title: `Modo ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`,
            timer: 1500,
            customClass: { popup: 'toast-theme-toggle' }
        });
    }
}
window.toggleTheme = toggleTheme;

/* ─── Global Keyboard Listeners ─── */
document.addEventListener('keydown', (e) => {
    trapModalFocus(e);

    if (e.key === 'Escape') {
        const overlays = document.querySelectorAll('.modal-overlay.show');
        if (overlays.length > 0) {
            overlays.forEach(overlay => closeModal(overlay.id));
            return;
        }

        const dropdowns = document.querySelectorAll('.user-dropdown.show');
        if (dropdowns.length > 0) {
            dropdowns.forEach(dropdown => dropdown.classList.remove('show'));
            return;
        }

        const drillDown = document.getElementById('drillDownView');
        if (drillDown && drillDown.style.display !== 'none') {
            if (typeof showGrid === 'function') showGrid();
            else if (typeof showCatalog === 'function') showCatalog();
        }

        // Clear search inputs
        const searchInputs = [
            document.getElementById('globalSearchInput'),
            document.getElementById('areaSearch'),
            document.getElementById('userSearch'),
            document.getElementById('platformSearch')
        ];
        
        searchInputs.forEach(input => {
            if (input && document.activeElement === input) {
                input.value = '';
                input.dispatchEvent(new Event('input'));
                input.dispatchEvent(new Event('keyup'));
                if (window.handleGlobalSearch && input.id === 'globalSearchInput') {
                    window.handleGlobalSearch('');
                }
            }
        });

        const globalResults = document.getElementById('globalSearchResults');
        if (globalResults) globalResults.classList.remove('show');
    }
});

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});

// Close dropdown on outside click
window.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="toggle-dropdown"]')) {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});
