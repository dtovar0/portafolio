/**
 * Nexus UI Logic - Portfolio DNA
 * - Self-binding Global Form Validation with Shake Animation
 * - Modular Modal Management
 * - Global SweetAlert Toast Configuration with Icons
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

/* ─── Premium Form Validation ─── */
function validateNexusForm(form) {
    if (!form) return true;
    let isValid = true;
    const requiredInputs = form.querySelectorAll('[required]');
    
    // Clear previous errors
    form.querySelectorAll('.input-error, .empty-required').forEach(el => {
        el.classList.remove('input-error');
        el.classList.remove('empty-required');
        el.style.animation = 'none';
    });

    let firstError = null;
    for (const input of requiredInputs) {
        if (!input.value.trim() || (input.type === 'checkbox' && !input.checked)) {
            isValid = false;
            // Target the input group if present (consistent with nexus layout)
            const target = input.closest('.input-group') || input;
            target.classList.add('input-error');
            target.classList.add('empty-required');
            if (!firstError) firstError = target;
        }
    }

    if (!isValid && firstError) {
        // Force reflow for animation restart
        firstError.offsetHeight;
        firstError.style.animation = '';
        
        const focusInput = firstError.querySelector('input, textarea, select') || firstError;
        if (focusInput.focus) focusInput.focus();
        
        if (window.Toast) {
            Toast.fire({
                icon: 'warning',
                title: 'Complete los campos obligatorios'
            });
        }
    }
    return isValid;
}

// Auto-bind to forms with data-nexus-validate attribute
document.addEventListener('submit', (e) => {
    if (e.target.hasAttribute('data-nexus-validate')) {
        if (!validateNexusForm(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

/* ─── Modal Management ─── */
function openNexusModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeNexusModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Close modal on escape or overlay click
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => closeNexusModal(m.id));
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeNexusModal(e.target.id);
    }
});

// Export functions to global scope
window.validateNexusForm = validateNexusForm;
window.openNexusModal = openNexusModal;
window.closeNexusModal = closeNexusModal;
