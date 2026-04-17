/**
 * Nexus Administrative Views Package
 * Contains the premium templates for: General, Notifications, Authentication, and Audit.
 * Requires: nexus-core.css and nexus-ui.js
 */

export const NexusViews = {
    /**
     * Renders the General Settings view (Branding & Database)
     */
    renderGeneral: (data) => {
        const config = data.general || {};
        const database = data.database || {};
        const activeTab = data.activeTab || 'general';
        const dbType = data.dbType || 'mysql';
        
        const icons = [
            'fa-briefcase', 'fa-hdd', 'fa-database', 'fa-shield-halved', 'fa-microchip', 'fa-terminal', 'fa-cloud', 'fa-globe',
            'fa-wifi', 'fa-code', 'fa-user-shield', 'fa-lock', 'fa-chart-pie', 'fa-gear', 'fa-user', 'fa-users',
            'fa-layer-group', 'fa-network-wired', 'fa-credit-card', 'fa-mouse-pointer', 'fa-desktop', 'fa-mobile-screen', 'fa-share-nodes', 'fa-bolt'
        ];

        let content = '';
        
        if (activeTab === 'database') {
            content = `
                <div class="nexus-auth-header">
                    <h2 class="font-outfit">Infraestructura de Datos</h2>
                    <div class="nexus-header-actions">
                        <button class="btn btn-action-test" onclick="NexusViews.handlers.onTestDb()">
                            <i class="fas fa-vial" style="font-size: 0.8rem"></i>
                            Probar Conexión
                        </button>
                        <button class="btn btn-primary" onclick="NexusViews.handlers.onSaveDb()" style="box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);">
                            <i class="fas fa-save" style="font-size: 0.8rem"></i>
                            Guardar Cambios
                        </button>
                    </div>
                </div>

                <div class="nexus-provider-grid">
                    <div class="nexus-provider-card ${dbType === 'mysql' ? 'active' : ''}" onclick="NexusViews.handlers.onSetDbType('mysql')">
                        <div class="provider-icon"><i class="fas fa-database"></i></div>
                        <div><div class="fw-600">MySQL / MariaDB</div></div>
                        <div class="radio-indicator"></div>
                    </div>
                    <div class="nexus-provider-card ${dbType === 'postgres' ? 'active' : ''}" onclick="NexusViews.handlers.onSetDbType('postgres')">
                        <div class="provider-icon"><i class="fas fa-server"></i></div>
                        <div><div class="fw-600">PostgreSQL</div></div>
                        <div class="radio-indicator"></div>
                    </div>
                </div>

                <div class="nexus-section-header">
                    <i class="fas fa-network-wired" style="font-size: 0.7rem"></i>
                    Parámetros de Conexión
                </div>

                <div class="nexus-form-grid" style="margin-bottom: 2rem;">
                    <div class="col-9">
                        <div class="input-group">
                            <label>Servidor / Host</label>
                            <input type="text" id="nexus-db-host" value="${database.host || 'localhost'}">
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="input-group">
                            <label>Puerto</label>
                            <input type="number" id="nexus-db-port" value="${database.port || (dbType === 'mysql' ? '3306' : '5432')}">
                        </div>
                    </div>
                </div>

                <div class="nexus-form-grid">
                    <div class="col-6">
                        <div class="input-group">
                            <label>Usuario / Login</label>
                            <input type="text" id="nexus-db-user" value="${database.user || ''}">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="input-group">
                            <label>Contraseña</label>
                            <input type="password" id="nexus-db-pass" value="${database.pass || ''}">
                        </div>
                    </div>
                </div>
            `;
        } else {
            content = `
                <div class="nexus-auth-header">
                    <h2 class="font-outfit">Personalización</h2>
                    <div class="nexus-header-actions">
                        <button class="btn btn-primary" onclick="NexusViews.handlers.onSaveGeneral()" style="box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);">
                            <i class="fas fa-save" style="font-size: 0.8rem"></i>
                            Guardar Cambios
                        </button>
                    </div>
                </div>

                <div class="nexus-form-grid">
                    <div class="col-4">
                        <div class="nexus-section-header"><i class="fas fa-tag"></i> Nombre del Portal</div>
                        <div class="input-group" style="margin-bottom: 2rem;">
                            <input type="text" id="nexus-portal-name" value="${config.portalName || ''}" placeholder="Ej: Nexus Access">
                        </div>
                        <div class="nexus-section-header"><i class="fas fa-eye"></i> Vista Previa</div>
                        <div class="preview-box">
                            <div class="preview-logo-container" style="background: ${config.logoBg || '#6366F1'}">
                                <i class="fas ${config.selectedIcon || 'fa-layer-group'}" style="color: ${config.iconColor || '#FFFFFF'}"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-8">
                        <div class="nexus-section-header"><i class="fas fa-fingerprint"></i> Iconografía IT</div>
                        <div class="icon-grid">
                            ${icons.map(icon => `
                                <div class="icon-item ${config.selectedIcon === icon ? 'active' : ''}" onclick="NexusViews.handlers.onSelectIcon('${icon}')">
                                    <i class="fas ${icon}"></i>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="nexus-tabs fade-in">
                <div class="nexus-tab ${activeTab === 'general' ? 'active' : ''}" onclick="NexusViews.handlers.onSwitchTab('general')">General</div>
                <div class="nexus-tab ${activeTab === 'database' ? 'active' : ''}" onclick="NexusViews.handlers.onSwitchTab('database')">Base de Datos</div>
            </div>
            <div class="nexus-auth-container fade-in">
                ${content}
            </div>
        `;
    },

    /**
     * Renders the Notifications (SMTP) view
     */
    renderNotifications: (data) => {
        const smtp = data.smtp || {};
        return `
            <div class="nexus-auth-container fade-in">
                <div class="nexus-auth-header">
                    <div>
                        <h2 class="font-outfit">Notificaciones y Correo</h2>
                        <p class="text-muted fs-sm">Configura el servidor SMTP para alertas del sistema.</p>
                    </div>
                    <div class="nexus-header-actions">
                        <button class="btn btn-action-test" onclick="NexusViews.handlers.onTestSmtp()">Probar SMTP</button>
                        <button class="btn btn-primary" onclick="NexusViews.handlers.onSaveSmtp()">Guardar</button>
                    </div>
                </div>
                <div class="nexus-form-grid">
                    <div class="col-8">
                        <div class="input-group"><label>Servidor SMTP</label><input type="text" id="nexus-smtp-host" value="${smtp.host || ''}"></div>
                    </div>
                    <div class="col-4">
                        <div class="input-group"><label>Puerto</label><input type="number" id="nexus-smtp-port" value="${smtp.port || '587'}"></div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renders the Authentication (LDAP) view
     */
    renderAuthentication: (data) => {
        const auth = data.auth || {};
        const enabled = data.ldapEnabled;
        return `
            <div class="nexus-auth-container fade-in">
                <div class="nexus-auth-header">
                    <h2 class="font-outfit">Autenticación Externa</h2>
                    <div class="nexus-header-actions">
                        <button class="btn btn-action-test" onclick="NexusViews.handlers.onTestLdap()">Probar LDAP</button>
                        <button class="btn btn-primary" onclick="NexusViews.handlers.onSaveAuth()">Guardar</button>
                    </div>
                </div>
                <div style="margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; background: var(--bg-input); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <span style="flex: 1; font-weight: 600;">Habilitar LDAP / Active Directory</span>
                    <label class="nexus-switch">
                        <input type="checkbox" onchange="NexusViews.handlers.onToggleLdap(this.checked)" ${enabled ? 'checked' : ''}>
                        <span class="nexus-slider"></span>
                    </label>
                </div>
            </div>
        `;
    },

    /**
     * Renders the Audit Logs view (High Density Table)
     */
    renderAudit: (data) => {
        const logs = data.logs || [];
        return `
            <div class="view-header">
                <div>
                    <h1 class="font-outfit fw-700">Auditoría del Sistema</h1>
                    <p class="text-muted">Registro histórico de acciones y seguridad.</p>
                </div>
                <button class="btn" onclick="NexusViews.handlers.onRefreshLogs()">
                    <i class="fas fa-sync-alt"></i> Actualizar
                </button>
            </div>
            <div class="table-card fade-in">
                <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Fecha / Hora</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Módulo</th>
                                <th>IP</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No hay registros de auditoría.</td></tr>' : 
                                logs.map(log => `
                                <tr>
                                    <td class="fs-sm text-muted">${log.date}</td>
                                    <td><div class="fw-600">${log.user}</div></td>
                                    <td>${log.action}</td>
                                    <td><span class="badge badge-info">${log.module}</span></td>
                                    <td class="fs-sm"><code>${log.ip}</code></td>
                                    <td><span class="status-badge" style="background: ${log.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${log.status === 'success' ? 'var(--status-success)' : 'var(--error)'}">${log.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * Placeholder handlers that the developer should override
     */
    handlers: {
        onSwitchTab: () => console.warn('Override: NexusViews.handlers.onSwitchTab'),
        onSaveGeneral: () => console.warn('Override: NexusViews.handlers.onSaveGeneral'),
        onSaveDb: () => console.warn('Override: NexusViews.handlers.onSaveDb'),
        onTestDb: () => console.warn('Override: NexusViews.handlers.onTestDb'),
        onSetDbType: () => console.warn('Override: NexusViews.handlers.onSetDbType'),
        onSelectIcon: () => console.warn('Override: NexusViews.handlers.onSelectIcon'),
        onSaveSmtp: () => console.warn('Override: NexusViews.handlers.onSaveSmtp'),
        onTestSmtp: () => console.warn('Override: NexusViews.handlers.onTestSmtp'),
        onToggleLdap: () => console.warn('Override: NexusViews.handlers.onToggleLdap'),
        onSaveAuth: () => console.warn('Override: NexusViews.handlers.onSaveAuth'),
        onTestLdap: () => console.warn('Override: NexusViews.handlers.onTestLdap'),
        onRefreshLogs: () => console.warn('Override: NexusViews.handlers.onRefreshLogs'),
    }
};
