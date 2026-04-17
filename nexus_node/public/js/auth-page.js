/**
 * Authentication Module - Event Delegation & Logic
 * Pattern: document.addEventListener('click', e => { ... })
 */
document.addEventListener('DOMContentLoaded', () => {
    const datos = window.__datos || {};
    
    const forms = {
        auth: document.getElementById('authSettingsForm')
    };

    /* ─── Event Delegation (Click) ─── */
    document.addEventListener('click', async e => {
        const trigger = e.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;

        // Common button pre-processing
        if (trigger.tagName === 'BUTTON' || (trigger.tagName === 'A' && action)) {
            e.preventDefault();
        }

        switch (action) {
            case 'go-home':
                window.location.href = datos.urls.home;
                break;

            case 'switch-tab':
                ui.switchTab(trigger.dataset.tab, trigger);
                break;

            case 'test-ldap':
                actions.testLDAPConnection();
                break;

            case 'save-auth':
                if (forms.auth) forms.auth.requestSubmit();
                break;
        }
    });

    /* ─── Change Observers ─── */
    document.addEventListener('change', e => {
        const trigger = e.target.closest('.js-ldap-master-toggle');
        if (trigger) {
            ui.updateLDAPState(trigger.checked);
        }
    });

    /* ─── UI Controller ─── */
    const ui = {
        switchTab(tabId, btn) {
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.add('d-none');
                c.classList.remove('active');
            });
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            
            const target = document.getElementById(tabId);
            if (target) {
                target.classList.remove('d-none');
                target.classList.add('active');
            }
            if (btn) btn.classList.add('active');
        },

        updateLDAPState(isEnabled) {
            const form = forms.auth;
            if (!form) return;

            const inputs = form.querySelectorAll('.js-ldap-input');
            const sections = form.querySelectorAll('.branding-content-section, .section-label, .form-group');
            const testBtn = document.querySelector('[data-action="test-ldap"]');

            inputs.forEach(input => {
                input.disabled = !isEnabled;
            });

            // Use classes for state instead of direct style manipulation
            sections.forEach(el => {
                if (!el.querySelector('.js-ldap-master-toggle')) {
                    if (isEnabled) {
                        el.classList.remove('is-disabled-opacity');
                    } else {
                        el.classList.add('is-disabled-opacity');
                    }
                }
            });

            if (testBtn) {
                testBtn.disabled = !isEnabled;
                if (isEnabled) {
                    testBtn.classList.remove('is-disabled-opacity');
                } else {
                    testBtn.classList.add('is-disabled-opacity');
                }
            }
        }
    };

    /* ─── Actions Controller ─── */
    const actions = {
        async saveAuth() {
            if (!forms.auth) return;
            if (typeof window.validatePremiumForm === 'function' && !window.validatePremiumForm(forms.auth)) return;

            const formData = new FormData(forms.auth);
            const saveBtn = forms.auth.querySelector('[data-action="save-auth"]');
            const originalContent = saveBtn ? saveBtn.innerHTML : '';
            
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            }

            try {
                const response = await fetch(datos.urls.update, { method: 'POST', body: formData });
                const data = await response.json();
                
                if (data.success) {
                    Toast.fire({ icon: 'success', title: data.message });
                } else {
                    Toast.fire({ icon: 'error', title: data.error || 'Error al guardar' });
                }
            } catch (err) {
                console.error("Save Error:", err);
                Toast.fire({ icon: 'error', title: 'No se pudo conectar con el servidor' });
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalContent;
                }
            }
        },

        async testLDAPConnection() {
            if (!forms.auth) return;
            
            const startTime = Date.now();
            Swal.fire({
                title: 'Validando LDAP...',
                text: 'Estableciendo comunicación con el servidor de directorio',
                allowOutsideClick: false,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                didOpen: () => { Swal.showLoading(); }
            });

            const formData = new FormData(forms.auth);
            try {
                const response = await fetch(datos.urls.test, { method: 'POST', body: formData });
                const data = await response.json();
                
                const elapsed = Date.now() - startTime;
                if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Conexión Exitosa',
                        text: data.message,
                        confirmButtonText: 'Continuar',
                        confirmButtonColor: 'var(--primary-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)'
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Fallo de Conexión',
                        text: data.error,
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)'
                    });
                }
            } catch (err) {
                console.error("LDAP Test Error:", err);
                Toast.fire({ icon: 'error', title: 'Error de validación', text: err.message });
            }
        }
    };

    /* ─── Form Submission ─── */
    if (forms.auth) {
        forms.auth.addEventListener('submit', e => {
            e.preventDefault();
            actions.saveAuth();
        });
    }

    // Initialize state
    const masterToggle = document.querySelector('.js-ldap-master-toggle');
    if (masterToggle) ui.updateLDAPState(masterToggle.checked);
});
