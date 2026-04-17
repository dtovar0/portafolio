const db = require('../config/db');

const logEvent = async ({ entityType, entityName, action, description, user }) => {
    try {
        await db.query(
            `INSERT INTO auditoria
             (entity_type, entity_name, action, user_id, user_name, user_email, description, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                entityType || 'Sistema',
                entityName || 'N/A',
                action || 'Modificacion',
                user && user.id ? user.id : null,
                user && user.name ? user.name : 'Sistema',
                user && user.email ? user.email : '',
                description || ''
            ]
        );
    } catch (err) {
        console.error('[AuditLogError]', err.message);
    }
};

module.exports = { logEvent };
