const db = require('../config/db');

const PER_PAGE = 9;

const getAudit = async (req, res) => {
    try {
        // Access requests (as audit events)
        const [accessRows] = await db.query(`
            SELECT ar.created_at, u.name AS user_name, u.email AS user_email,
                   'Acceso' AS entity_type, p.name AS entity_name,
                   ar.status AS action,
                   COALESCE(p.icon, 'fa-key') AS icon, 1 AS is_access,
                   CONCAT('Solicitud de acceso a ', COALESCE(p.name, 'N/A')) AS description
            FROM access_request ar
            LEFT JOIN user u ON ar.user_id = u.id
            LEFT JOIN platform p ON ar.platform_id = p.id
        `);

        // System audit logs
        const [sysRows] = await db.query(`
            SELECT a.created_at, COALESCE(u.name, 'Sistema') AS user_name,
                   COALESCE(u.email, 'auto@nexus.com') AS user_email,
                   a.entity_type, a.entity_name, a.action,
                   CASE a.entity_type
                     WHEN 'Usuario' THEN 'fa-user-cog'
                     WHEN 'Área' THEN 'fa-sitemap'
                     WHEN 'Plataforma' THEN 'fa-cube'
                     ELSE 'fa-cog'
                   END AS icon,
                   0 AS is_access,
                   a.description
            FROM auditoria a
            LEFT JOIN user u ON a.user_id = u.id
        `);

        // Merge and sort by created_at desc
        const unified = [...accessRows, ...sysRows].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const total = unified.length;
        const total_pages = Math.ceil(total / PER_PAGE) || 1;
        const start = (page - 1) * PER_PAGE;
        const logs = unified.slice(start, start + PER_PAGE);

        res.render('audit/list', {
            title: 'Auditoría | ' + res.locals.settings.portal_name,
            activePage: 'audit',
            logs,
            current_page: page,
            total_pages,
            total_logs: total,
            breadcrumbs: '<span class="breadcrumb-item" data-action="go-home">Inicio</span> <span>/</span> <span class="breadcrumb-item">Sistema</span> <span>/</span> <span class="breadcrumb-item active">Auditoría</span>'
        });
    } catch (err) {
        console.error('[AuditListError]', err);
        res.status(500).send('Error interno');
    }
};

module.exports = { getAudit };
