/**
 * General Settings Module - Event Delegation & Logic
 * Pattern: document.addEventListener('click', e => { ... })
 */
document.addEventListener('DOMContentLoaded', () => {
    const datos = window.__datos || {};
    let initialLogoUrl = datos.initialLogoUrl || null;
    let uploadedLogoUrl = null;

    const forms = {
        general: document.getElementById('generalSettingsForm')
    };

    /* ─── Event Delegation (Click) ─── */
    document.addEventListener('click', async e => {
        const trigger = e.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;
        const param = trigger.dataset.param;

        // Common button pre-processing
        if (trigger.tagName === 'BUTTON' || (trigger.tagName === 'A' && action)) {
            if (!trigger.hasAttribute('data-allow-default')) {
                e.preventDefault();
            }
        }

        switch (action) {
            case 'go-home':
                window.location.href = datos.urls.home;
                break;

            case 'switch-tab':
                const tabId = trigger.dataset.tab;
                ui.switchTab(tabId, trigger);
                break;

            case 'trigger-upload':
                document.getElementById('logoFileInput').click();
                break;

            case 'select-icon':
                ui.selectPortalIcon(trigger.dataset.icon, trigger);
                break;

            case 'test-db':
                actions.testDBConnection();
                break;
            
            case 'save-settings':
                if (forms.general) forms.general.requestSubmit();
                break;
        }
    });

    /* ─── Change/Input Observers (js-* classes) ─── */
    
    // Branding Type Toggle
    document.addEventListener('change', e => {
        const trigger = e.target.closest('.js-branding-type');
        if (trigger) {
            ui.toggleBrandingMode(trigger.value);
        }

        // DB Type Toggle
        const dbTrigger = e.target.closest('.js-db-type');
        if (dbTrigger) {
            ui.syncDbCard(dbTrigger);
        }

        // Logo File Upload
        const logoInput = e.target.closest('.js-logo-file');
        if (logoInput) {
            ui.previewLogo(logoInput);
        }
    });

    document.addEventListener('input', e => {
        // Color Pickers
        const colorInput = e.target.closest('.js-color-input');
        if (colorInput) {
            ui.updateBrandColor(colorInput.dataset.type, colorInput.value);
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

        toggleBrandingMode(mode) {
            const imgSection = document.getElementById('imageUploadSection');
            const iconSection = document.getElementById('iconPickerSection');
            const iconColor = document.getElementById('iconColorField');

            if (mode === 'image') {
                imgSection.classList.remove('is-hidden');
                iconSection.classList.add('is-hidden');
                iconColor.classList.add('is-hidden');
            } else {
                imgSection.classList.add('is-hidden');
                iconSection.classList.remove('is-hidden');
                iconColor.classList.remove('is-hidden');
            }
            this.updatePreview();
        },

        syncDbCard(radio) {
            document.querySelectorAll('.db-ref-card').forEach(c => c.classList.remove('db-ref-card--active'));
            radio.closest('.db-ref-card').classList.add('db-ref-card--active');

            // Update default port based on database type
            const portInput = document.querySelector('input[name="db_port"]');
            if (portInput) {
                portInput.value = (radio.value === 'mysql') ? '3306' : '5432';
            }
        },

        selectPortalIcon(iconName, element) {
            document.querySelectorAll('.premium-icon-item').forEach(i => i.classList.remove('selected'));
            element.classList.add('selected');
            const input = document.getElementById('selectedIconInput');
            if (input) input.value = iconName;
            this.updatePreview();
        },

        updateBrandColor(type, value) {
            if (type === 'bg') {
                document.getElementById('logoBgDisplay').style.background = value;
                document.getElementById('logoBgHex').textContent = value;
                document.documentElement.style.setProperty('--portal-logo-bg', value);
            } else {
                document.getElementById('iconColorDisplay').style.background = value;
                document.getElementById('iconColorHex').textContent = value;
                document.documentElement.style.setProperty('--portal-icon-color', value);
            }
            this.updatePreview();
        },

        updatePreview() {
            const modeInput = document.querySelector('input[name="portal_logo_type"]:checked');
            if (!modeInput) return;
            
            const mode = modeInput.value;
            const preview = document.getElementById('logoPreview');
            const logoBg = document.getElementById('logoBgInput').value;
            const iconColor = document.getElementById('iconColorInput').value;
            
            if (!preview) return;
            
            // Set CSS variables for cleaner style management
            preview.style.setProperty('--logo-bg', logoBg);

            if (mode === 'icon') {
                const iconClass = document.getElementById('selectedIconInput').value;
                preview.innerHTML = `
                    <div id="iconPreviewContainer" class="preview-icon-inner" style="color: ${iconColor};">
                        <i class="fas ${iconClass || 'fa-gear'}"></i>
                    </div>
                `;
            } else {
                const url = uploadedLogoUrl || initialLogoUrl;
                if (url) {
                    preview.innerHTML = `<img src="${url}" class="preview-img-content">`;
                } else {
                    preview.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
                }
            }
        },

        previewLogo(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = e => {
                    uploadedLogoUrl = e.target.result;
                    this.updatePreview();
                };
                reader.readAsDataURL(input.files[0]);
            }
        }
    };

    /* ─── Actions Controller ─── */
    const actions = {
        async saveSettings() {
            if (!forms.general) return;
            
            // Validate if premium validator exists
            if (typeof window.validatePremiumForm === 'function' && !window.validatePremiumForm(forms.general)) return;
            
            const formData = new FormData(forms.general);
            
            // Show loading state on button
            const saveBtn = forms.general.querySelector('button[type="submit"]');
            const originalContent = saveBtn ? saveBtn.innerHTML : '';
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            }

            try {
                const response = await fetch(datos.urls.updateGeneral, { method: 'POST', body: formData });
                const data = await response.json();
                
                if (data.success) {
                    Toast.fire({ 
                        icon: 'success', 
                        title: data.message,
                        customClass: { popup: 'toast-save' }
                    });
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

        async testDBConnection() {
            if (!forms.general) return;
            
            const testingData = new FormData();
            const rawData = new FormData(forms.general);
            ['db_type', 'db_host', 'db_port', 'db_user', 'db_password', 'db_name'].forEach(f => {
                if (rawData.has(f)) testingData.append(f, rawData.get(f));
            });

            const startTime = Date.now();
            Swal.fire({ 
                title: 'Validando Conexión...', 
                text: 'Estableciendo comunicación con el servidor',
                allowOutsideClick: false,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                didOpen: () => { Swal.showLoading(); } 
            });

            try {
                const response = await fetch(datos.urls.testDb, { method: 'POST', body: testingData });
                const data = await response.json();
                
                // Artificial delay to prevent modal flicker
                const elapsed = Date.now() - startTime;
                if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));

                if (data.success) {
                    Swal.close();
                    Toast.fire({
                        icon: 'success',
                        title: '¡Conexión Exitosa!',
                        text: data.message
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de Conexión',
                        text: data.error,
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)'
                    });
                }
            } catch (err) {
                console.error("DB Test Error:", err);
                Toast.fire({ icon: 'error', title: 'Error de validación', text: err.message });
            }
        }
    };

    /* ─── Form Submission Handling ─── */
    if (forms.general) {
        forms.general.addEventListener('submit', e => {
            e.preventDefault();
            actions.saveSettings();
        });
    }

    // Initialize Preview
    ui.updatePreview();
});
