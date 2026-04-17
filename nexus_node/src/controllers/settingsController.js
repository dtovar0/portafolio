const db = require('../config/db');
const mysql = require('mysql2/promise');
const { logEvent } = require('../utils/auditLogger');

const ensureSettingsRow = async () => {
    await db.query(
        `INSERT INTO system_settings (id, portal_name, portal_logo_bg, portal_icon_color)
         VALUES (1, 'Nexus Access', '#6366f1', '#ffffff')
         ON DUPLICATE KEY UPDATE id = id`
    );
};

const getSystemSettings = async () => {
    try {
        await ensureSettingsRow();
        const [rows] = await db.query('SELECT * FROM system_settings WHERE id = 1');
        return rows[0] || {
            portal_name: 'Nexus Access',
            portal_logo_bg: '#6366f1',
            portal_icon_color: '#ffffff'
        };
    } catch (err) {
        console.error('[Error] Fallo al leer system_settings:', err);
        return { portal_name: 'Nexus Node (Fallback)', portal_logo_bg: '#6366f1', portal_icon_color: '#ffffff' };
    }
};

const getGeneralSettings = async (req, res) => {
    const settings = await getSystemSettings();
    res.render('settings/general', {
        title: 'Configuracion General | ' + settings.portal_name,
        settings,
        activePage: 'general',
        breadcrumbs: '<span class="breadcrumb-item">Inicio</span> <span>/</span> <span class="breadcrumb-item">Sistema</span> <span>/</span> <span class="breadcrumb-item active">General</span>'
    });
};

const updateGeneralSettings = async (req, res) => {
    try {
        await ensureSettingsRow();
        await db.query(
            `UPDATE system_settings
             SET portal_name = ?, portal_logo_bg = ?, portal_icon_color = ?, portal_icon = ?, portal_logo_type = ?, portal_logo_url = ?,
                 db_type = ?, db_host = ?, db_port = ?, db_user = ?, db_password = ?, db_name = ?, db_ssl = ?
             WHERE id = 1`,
            [
                req.body.portal_name || 'Nexus Access',
                req.body.portal_logo_bg || '#6366f1',
                req.body.portal_icon_color || '#ffffff',
                req.body.portal_icon || 'fa-box',
                req.body.portal_logo_type || 'icon',
                req.body.portal_logo_url || null,
                req.body.db_type || 'mysql',
                req.body.db_host || 'localhost',
                req.body.db_port || '3306',
                req.body.db_user || null,
                req.body.db_password || null,
                req.body.db_name || 'nexus',
                req.body.db_ssl ? 1 : 0
            ]
        );

        await logEvent({
            entityType: 'Configuracion',
            entityName: 'General',
            action: 'Modificacion',
            description: 'Se actualizaron parametros generales del sistema',
            user: req.user
        });

        return res.json({ success: true, message: 'Configuracion general actualizada' });
    } catch (err) {
        console.error('[GeneralSettingsUpdateError]', err);
        return res.status(500).json({ success: false, error: 'No se pudo actualizar la configuracion general' });
    }
};

const testDbConnection = async (req, res) => {
    let conn;
    try {
        const [rows] = await db.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
        const saved = rows[0] || {};

        const dbType = (req.body.db_type || saved.db_type || 'mysql').toLowerCase();
        if (dbType !== 'mysql') {
            return res.status(400).json({
                success: false,
                error: 'La validacion de conexion solo esta disponible para MySQL/MariaDB en esta version'
            });
        }

        const host = (req.body.db_host || '').trim() || saved.db_host || 'localhost';
        const portRaw = (req.body.db_port || '').toString().trim() || (saved.db_port || '3306').toString();
        const user = (req.body.db_user || '').trim() || saved.db_user || '';
        const password = req.body.db_password !== undefined && req.body.db_password !== ''
            ? req.body.db_password
            : (saved.db_password || '');
        const database = (req.body.db_name || '').trim() || saved.db_name || 'nexus';

        conn = await mysql.createConnection({
            host,
            port: parseInt(portRaw, 10),
            user,
            password,
            database
        });
        await conn.query('SELECT 1');
        await conn.end();
        return res.json({ success: true, message: 'Conexion de base de datos exitosa' });
    } catch (err) {
        if (conn) {
            try { await conn.end(); } catch (_) {}
        }
        return res.status(400).json({ success: false, error: 'Fallo de conexion. Verifica host, puerto y credenciales' });
    }
};

const getNotificationSettings = async (req, res) => {
    const settings = await getSystemSettings();
    res.render('settings/notifications', {
        title: 'Notificaciones | ' + settings.portal_name,
        settings,
        activePage: 'notifications',
        breadcrumbs: '<span class="breadcrumb-item">Inicio</span> <span>/</span> <span class="breadcrumb-item">Sistema</span> <span>/</span> <span class="breadcrumb-item active">Notificaciones</span>'
    });
};

const updateNotificationSettings = async (req, res) => {
    try {
        await ensureSettingsRow();
        await db.query(
            `UPDATE system_settings
             SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, smtp_encryption = ?, smtp_auth = ?,
                 smtp_from_name = ?, smtp_from_email = ?, email_subject = ?, email_body = ?
             WHERE id = 1`,
            [
                req.body.smtp_host || null,
                req.body.smtp_port || '587',
                req.body.smtp_user || null,
                req.body.smtp_password || null,
                req.body.smtp_encryption || 'TLS',
                req.body.smtp_auth ? 1 : 0,
                req.body.smtp_from_name || 'Nexus Access',
                req.body.smtp_from_email || null,
                req.body.email_subject || 'Nueva Solicitud de Acceso - Portal Nexus',
                req.body.email_body || null
            ]
        );

        await logEvent({
            entityType: 'Configuracion',
            entityName: 'Notificaciones',
            action: 'Modificacion',
            description: 'Se actualizo la configuracion SMTP y plantilla de correo',
            user: req.user
        });

        return res.json({ success: true, message: 'Configuracion de notificaciones actualizada' });
    } catch (err) {
        console.error('[NotificationSettingsUpdateError]', err);
        return res.status(500).json({ success: false, error: 'No se pudo actualizar la configuracion de notificaciones' });
    }
};

const testEmailSettings = async (req, res) => {
    const recipient = (req.body.recipient || '').trim();
    if (!recipient) {
        return res.status(400).json({ success: false, error: 'Debes indicar un correo destinatario' });
    }

    return res.json({ success: true, message: `Prueba SMTP simulada enviada a ${recipient}` });
};

const getAuthSettings = async (req, res) => {
    const settings = await getSystemSettings();
    res.render('settings/auth', {
        title: 'Autenticacion | ' + settings.portal_name,
        settings,
        activePage: 'auth',
        breadcrumbs: '<span class="breadcrumb-item">Inicio</span> <span>/</span> <span class="breadcrumb-item">Sistema</span> <span>/</span> <span class="breadcrumb-item active">Autenticacion</span>'
    });
};

const updateAuthSettings = async (req, res) => {
    try {
        await ensureSettingsRow();
        await db.query(
            `UPDATE system_settings
             SET ldap_enabled = ?, ldap_server = ?, ldap_port = ?, ldap_base_dn = ?, ldap_user_dn = ?, ldap_password = ?, ldap_use_ssl = ?, ldap_user_attribute = ?
             WHERE id = 1`,
            [
                req.body.ldap_enabled ? 1 : 0,
                req.body.ldap_server || null,
                req.body.ldap_port || '389',
                req.body.ldap_base_dn || null,
                req.body.ldap_user_dn || null,
                req.body.ldap_password || null,
                req.body.ldap_use_ssl ? 1 : 0,
                req.body.ldap_user_attribute || 'uid'
            ]
        );

        await logEvent({
            entityType: 'Configuracion',
            entityName: 'Autenticacion',
            action: 'Modificacion',
            description: 'Se actualizaron parametros de autenticacion LDAP',
            user: req.user
        });

        return res.json({ success: true, message: 'Configuracion de autenticacion actualizada' });
    } catch (err) {
        console.error('[AuthSettingsUpdateError]', err);
        return res.status(500).json({ success: false, error: 'No se pudo actualizar la configuracion de autenticacion' });
    }
};

const testLdapConnection = async (req, res) => {
    if (!req.body.ldap_server || !req.body.ldap_user_dn) {
        return res.status(400).json({ success: false, error: 'Faltan parametros LDAP obligatorios' });
    }
    return res.json({ success: true, message: 'Conexion LDAP simulada exitosa' });
};

module.exports = {
    getSystemSettings,
    getGeneralSettings,
    updateGeneralSettings,
    testDbConnection,
    getNotificationSettings,
    updateNotificationSettings,
    testEmailSettings,
    getAuthSettings,
    updateAuthSettings,
    testLdapConnection
};
