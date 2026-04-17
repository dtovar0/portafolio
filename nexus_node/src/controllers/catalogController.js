const db = require('../config/db');
const { logEvent } = require('../utils/auditLogger');

const getCatalog = async (req, res) => {
    try {
        let userId = Number.parseInt(req.user && req.user.id, 10);
        const role = ((req.user && req.user.role) || '').toString().toLowerCase();
        const isAdminRole = role.includes('admin');

        if (!Number.isInteger(userId)) {
            const email = ((req.user && req.user.email) || '').toString().trim().toLowerCase();
            if (email) {
                const [rows] = await db.query('SELECT id FROM user WHERE email = ? LIMIT 1', [email]);
                if (rows.length) {
                    userId = rows[0].id;
                }
            }
        }

        if (!Number.isInteger(userId)) {
            return res.redirect('/login');
        }

        const [assignedAreaRows] = await db.query('SELECT area_id FROM user_areas WHERE user_id = ?', [userId]);
        let areaIds = assignedAreaRows.map((row) => row.area_id);

        // Admin fallback: if no explicit area assignment exists, expose active catalog.
        if (!areaIds.length && isAdminRole) {
            const [allAreaRows] = await db.query("SELECT id FROM area WHERE status = 'Activo'");
            areaIds = allAreaRows.map((row) => row.id);
        }

        if (!areaIds.length) {
            return res.render('catalog/list', {
                title: 'Catalogo | ' + res.locals.settings.portal_name,
                areas: [],
                platforms: [],
                user_platform_ids: [],
                area_icons: {},
                activePage: 'catalog',
                breadcrumbs: '<span class="breadcrumb-item">Inicio</span> <span>/</span> <span class="breadcrumb-item active">Catalogo</span>'
            });
        }

        let [areas] = await db.query(
            `SELECT id, name, icon, color
             FROM area
             WHERE id IN (?) AND status = 'Activo'
             ORDER BY name ASC`,
            [areaIds]
        );

        // Safety net: assigned IDs can exist but point to inactive/missing areas.
        if (!areas.length && isAdminRole) {
            const [allAreas] = await db.query(
                `SELECT id, name, icon, color
                 FROM area
                 WHERE status = 'Activo'
                 ORDER BY name ASC`
            );
            areas = allAreas;
            areaIds = areas.map((a) => a.id);
        }

        let [platforms] = await db.query(
            `SELECT p.id, p.name, p.description, p.area_id, p.direct_link, p.owner, p.resources, p.logo_url, p.icon, p.request_method, p.status, a.name AS area_name
             FROM platform p
             JOIN area a ON a.id = p.area_id
             WHERE p.area_id IN (?) AND p.status = 'Activo'
             ORDER BY a.name ASC, p.name ASC`,
            [areaIds]
        );

        if (!platforms.length && isAdminRole) {
            const [allPlatforms] = await db.query(
                `SELECT p.id, p.name, p.description, p.area_id, p.direct_link, p.owner, p.resources, p.logo_url, p.icon, p.request_method, p.status, a.name AS area_name
                 FROM platform p
                 JOIN area a ON a.id = p.area_id
                 WHERE p.status = 'Activo' AND a.status = 'Activo'
                 ORDER BY a.name ASC, p.name ASC`
            );
            platforms = allPlatforms;
        }

        const [approved] = await db.query(
            `SELECT platform_id
             FROM access_request
             WHERE user_id = ? AND status = 'Aprobado'`,
            [userId]
        );
        const userPlatformIds = approved.map((row) => row.platform_id);

        const areaById = new Map(areas.map((a) => [a.id, a]));
        const areaIcons = {};
        areas.forEach((a) => {
            areaIcons[a.name] = a.icon || 'box';
        });

        const platformsWithArea = platforms.map((p) => ({
            ...p,
            area: areaById.get(p.area_id) || { id: p.area_id, name: p.area_name, icon: 'box', color: null }
        }));

        return res.render('catalog/list', {
            title: 'Catalogo | ' + res.locals.settings.portal_name,
            areas,
            platforms: platformsWithArea,
            user_platform_ids: userPlatformIds,
            area_icons: areaIcons,
            activePage: 'catalog',
            breadcrumbs: '<span class="breadcrumb-item">Inicio</span> <span>/</span> <span class="breadcrumb-item active">Catalogo</span>'
        });
    } catch (err) {
        console.error('[CatalogError]', err);
        return res.status(500).send('Error interno');
    }
};

const submitRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const platformId = parseInt(req.body.platform_id, 10);

        if (!Number.isInteger(platformId)) {
            return res.status(400).json({ success: false, error: 'Plataforma invalida' });
        }

        const [alreadyApproved] = await db.query(
            'SELECT id FROM access_request WHERE user_id = ? AND platform_id = ? AND status = ? LIMIT 1',
            [userId, platformId, 'Aprobado']
        );
        if (alreadyApproved.length) {
            return res.status(409).json({ success: false, error: 'Ya cuentas con acceso aprobado a esta plataforma' });
        }

        const [existingPending] = await db.query(
            'SELECT id FROM access_request WHERE user_id = ? AND platform_id = ? AND status = ? LIMIT 1',
            [userId, platformId, 'Pendiente']
        );
        if (existingPending.length) {
            return res.status(409).json({ success: false, error: 'Ya existe una solicitud pendiente para esta plataforma' });
        }

        await db.query(
            'INSERT INTO access_request (platform_id, user_id, status, request_type) VALUES (?, ?, ?, ?)',
            [platformId, userId, 'Pendiente', 'Usuario']
        );

        const [platformRows] = await db.query('SELECT name FROM platform WHERE id = ? LIMIT 1', [platformId]);
        const platformName = platformRows.length ? platformRows[0].name : `ID ${platformId}`;

        await logEvent({
            entityType: 'Acceso',
            entityName: platformName,
            action: 'Solicitud',
            description: `Se genero una solicitud de acceso para ${platformName}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Solicitud enviada correctamente' });
    } catch (err) {
        console.error('[CatalogRequestError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al registrar la solicitud' });
    }
};

const registerVisit = async (req, res) => {
    try {
        const platformId = parseInt(req.params.id, 10);
        if (!Number.isInteger(platformId)) {
            return res.status(400).send('Plataforma invalida');
        }

        const [rows] = await db.query('SELECT id, direct_link FROM platform WHERE id = ? LIMIT 1', [platformId]);
        if (!rows.length) {
            return res.status(404).send('Plataforma no encontrada');
        }

        await db.query('UPDATE platform SET visits = visits + 1 WHERE id = ?', [platformId]);

        const link = rows[0].direct_link || '/catalogo';
        return res.redirect(link);
    } catch (err) {
        console.error('[CatalogVisitError]', err);
        return res.status(500).send('Error interno');
    }
};

module.exports = { getCatalog, submitRequest, registerVisit };
