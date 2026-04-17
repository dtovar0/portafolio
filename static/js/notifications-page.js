/**
 * Notifications Module - Event Delegation & Logic
 * Pattern: document.addEventListener('click', e => { ... })
 */
document.addEventListener('DOMContentLoaded', () => {
    const datos = window.__datos || {};

    const forms = {
        notifications: document.getElementById('notificationSettingsForm'),
        testEmail: document.getElementById('testEmailForm')
    };

    /* ─── Event Delegation (Click) ─── */
    document.addEventListener('click', async e => {
        const trigger = e.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;

        // Prevent default actions for buttons
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

            case 'send-test-prompt':
                if (window.openModal) window.openModal('testEmailModal');
                break;

            case 'close-modal':
                const modalId = trigger.dataset.target;
                if (window.closeModal) window.closeModal(modalId);
                break;

            case 'submit-test-email':
                actions.sendTestEmail();
                break;

            case 'save-notifications':
                if (forms.notifications) forms.notifications.requestSubmit();
                break;
        }
    });

    /* ─── Change Observers ─── */
    document.addEventListener('change', e => {
        const trigger = e.target.closest('#smtpAuthToggle');
        if (trigger) {
            ui.updateSmtpAuthUI(trigger.checked);
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

        updateSmtpAuthUI(isEnabled) {
            const inputs = document.querySelectorAll('input[name="smtp_user"], input[name="smtp_password"]');
            const container = document.getElementById('credentialsGrid');
            
            inputs.forEach(input => {
                input.disabled = !isEnabled;
                if (!isEnabled) {
                    input.removeAttribute('required');
                } else if (input.name === 'smtp_user') {
                    input.setAttribute('required', '');
                }
            });

            if (container) {
                if (isEnabled) {
                    container.classList.remove('is-disabled-opacity');
                } else {
                    container.classList.add('is-disabled-opacity');
                }
            }
        }
    };

    /* ─── Actions Controller ─── */
    const actions = {
        async saveNotifications() {
            if (!forms.notifications) return;
            if (typeof window.validatePremiumForm === 'function' && !window.validatePremiumForm(forms.notifications)) return;

            const formData = new FormData(forms.notifications);
            const saveBtn = document.querySelector('[data-action="save-notifications"]');
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

        async sendTestEmail() {
            if (!forms.testEmail) return;
            if (typeof window.validatePremiumForm === 'function' && !window.validatePremiumForm(forms.testEmail)) return;

            const recipient = document.getElementById('testEmailRecipient').value.trim();
            const submitBtn = document.querySelector('[data-action="submit-test-email"]');
            
            Swal.fire({ 
                title: 'Enviando...', 
                text: 'Estableciendo comunicación con el servidor SMTP', 
                allowOutsideClick: false, 
                didOpen: () => Swal.showLoading() 
            });

            try {
                const res = await fetch(datos.urls.test, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipient })
                });
                const data = await res.json();
                
                if (data.success) {
                    if (window.closeModal) window.closeModal('testEmailModal');
                    Swal.close();
                    Toast.fire({
                        icon: 'success',
                        title: 'Correo Enviado',
                        text: data.message
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de Envío',
                        text: data.error,
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)'
                    });
                }
            } catch (err) {
                console.error("Test Email Error:", err);
                Toast.fire({ icon: 'error', title: 'Error de conexión' });
            }
        }
    };

    /* ─── Form Submission ─── */
    if (forms.notifications) {
        forms.notifications.addEventListener('submit', e => {
            e.preventDefault();
            actions.saveNotifications();
        });
    }

    // Initial State
    const smtpToggle = document.getElementById('smtpAuthToggle');
    if (smtpToggle) ui.updateSmtpAuthUI(smtpToggle.checked);
});
