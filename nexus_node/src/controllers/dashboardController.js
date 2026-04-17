const db = require('../config/db');

const getDashboard = async (req, res) => {
    try {
        // Stats
        const [[areaRow]]     = await db.query('SELECT COUNT(*) as count FROM area');
        const [[platformRow]] = await db.query('SELECT COUNT(*) as count FROM platform');
        const [[userRow]]     = await db.query('SELECT COUNT(*) as count FROM user');
        const [[visitRow]]    = await db.query('SELECT COALESCE(SUM(visits),0) as total FROM platform');
        const [[pendingRow]]  = await db.query("SELECT COUNT(*) as count FROM access_request WHERE status = 'Pendiente'");

        // Activity log (last 8 audit entries)
        const [logList] = await db.query(
            'SELECT u.name as user_name, a.action, a.entity_name, a.created_at FROM auditoria a LEFT JOIN user u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 8'
        );

        // Chart: Users per platform (approved requests count, top 5)
        const [upRows] = await db.query(`
            SELECT p.name AS pname, ar.name AS aname, COUNT(rq.id) AS cnt
            FROM platform p
            JOIN area ar ON p.area_id = ar.id
            LEFT JOIN access_request rq ON rq.platform_id = p.id AND rq.status = 'Aprobado'
            GROUP BY p.id, p.name, ar.name
            HAVING cnt > 0
            ORDER BY cnt DESC LIMIT 5
        `);
        const usersPlatformLabels = upRows.map(r => [r.pname, `[${r.aname}]`]);
        const usersPlatformValues = upRows.map(r => r.cnt);

        // Chart: Users per area (user_areas count, top 5)
        const [uaRows] = await db.query(`
            SELECT a.name, a.color, COUNT(ua.user_id) AS cnt
            FROM area a
            LEFT JOIN user_areas ua ON ua.area_id = a.id
            GROUP BY a.id ORDER BY cnt DESC LIMIT 5
        `);
        const usersAreaLabels = uaRows.map(r => r.name);
        const usersAreaValues = uaRows.map(r => r.cnt);
        const usersAreaColors = uaRows.map(r => r.color || '#6366f1');

        // Chart: Pending requests per platform, top 8
        const [ppRows] = await db.query(`
            SELECT p.name AS pname, ar.name AS aname, COUNT(rq.id) AS cnt
            FROM platform p
            JOIN area ar ON p.area_id = ar.id
            JOIN access_request rq ON rq.platform_id = p.id AND rq.status = 'Pendiente'
            GROUP BY p.id, p.name, ar.name
            HAVING cnt > 0
            ORDER BY cnt DESC LIMIT 8
        `);
        const pendingPlatformLabels = ppRows.map(r => [r.pname, `[${r.aname}]`]);
        const pendingPlatformValues = ppRows.map(r => r.cnt);

        // Chart: Most visited platforms, top 5
        const [mvRows] = await db.query(
            'SELECT name, visits FROM platform ORDER BY visits DESC LIMIT 5'
        );
        const mostVisitedLabels = mvRows.map(r => r.name);
        const mostVisitedValues = mvRows.map(r => r.visits || 0);

        res.render('index', {
            title: 'Dashboard | ' + res.locals.settings.portal_name,
            activePage: 'dashboard',
            stats: {
                areas: areaRow.count,
                platforms: platformRow.count,
                users: userRow.count,
                visits: visitRow.total,
                pending: pendingRow.count
            },
            log_list: logList,
            accentColor: res.locals.settings.portal_logo_bg || '#6366f1',
            usersPlatformLabels, usersPlatformValues,
            usersAreaLabels, usersAreaValues, usersAreaColors,
            pendingPlatformLabels, pendingPlatformValues,
            mostVisitedLabels, mostVisitedValues,
            breadcrumbs: '<span class="breadcrumb-item">Inicio</span> <span>/</span> <span class="breadcrumb-item active">Dashboard</span>'
        });
    } catch (err) {
        console.error('[DashboardError]', err);
        res.status(500).send('Error');
    }
};

module.exports = { getDashboard };
