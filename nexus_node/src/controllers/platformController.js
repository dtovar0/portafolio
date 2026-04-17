const db = require('../config/db');
const { logEvent } = require('../utils/auditLogger');

const getPlatforms = async (req, res) => {
    try {
        const [areaRows] = await db.query(
            `SELECT a.id, a.name, a.color, a.icon, a.status, COUNT(p.id) AS platform_count
             FROM area a
             LEFT JOIN platform p ON p.area_id = a.id
             GROUP BY a.id, a.name, a.color, a.icon, a.status
             ORDER BY a.name ASC`
        );

        // Keep Flask parity: area cards in platforms view use a uniform visual style.
        const areaList = areaRows.map((area) => ({
            id: area.id,
            name: area.name,
            status: area.status,
            icon: area.icon,
            platform_count: area.platform_count
        }));

        const [platformRows] = await db.query(
            `SELECT p.*, a.name AS area_name
             FROM platform p
             JOIN area a ON p.area_id = a.id
             ORDER BY a.name ASC, p.name ASC`
        );

        const [approvedRows] = await db.query(
            `SELECT ar.platform_id, ar.user_id
             FROM access_request ar
             WHERE ar.status = 'Aprobado'`
        );

        const [users] = await db.query(
            `SELECT id, name, email, role, status
             FROM user
             ORDER BY name ASC`
        );

        const platformUsersMap = new Map();
        approvedRows.forEach((row) => {
            if (!platformUsersMap.has(row.platform_id)) {
                platformUsersMap.set(row.platform_id, []);
            }
            platformUsersMap.get(row.platform_id).push(row.user_id);
        });

        const groupedPlatforms = {};
        platformRows.forEach((platform) => {
            const areaName = platform.area_name;
            const userIds = platformUsersMap.get(platform.id) || [];
            const normalized = {
                ...platform,
                url: platform.direct_link || '',
                user_count: userIds.length,
                user_ids: userIds
            };

            if (!groupedPlatforms[areaName]) groupedPlatforms[areaName] = [];
            groupedPlatforms[areaName].push(normalized);
        });

        res.render('platforms/list', {
            title: 'Plataformas | ' + res.locals.settings.portal_name,
            grouped_platforms: groupedPlatforms,
            area_list: areaList,
            all_users: users,
            activePage: 'platforms',
            breadcrumbs: '<span class="breadcrumb-item" data-action="go-home">Inicio</span> <span>/</span> <span class="breadcrumb-item active">Plataformas</span>'
        });
    } catch (err) {
        console.error('[PlatformError]', err);
        res.status(500).send('Error interno');
    }
};

const addPlatform = async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        const description = (req.body.description || '').trim();
        const areaId = parseInt(req.body.area_id, 10);
        const requestMethod = (req.body.request_method || '').trim();
        const directLink = (req.body.direct_link || '').trim();
        const owner = (req.body.owner || '').trim();
        const resources = (req.body.resources || '').trim();
        const icon = (req.body.icon || 'box').trim();
        const status = req.body.status === 'Deshabilitado' ? 'Deshabilitado' : 'Activo';
        const logoUrl = (req.body.logo_url || '').trim();

        if (!name || !description || !Number.isInteger(areaId)) {
            return res.status(400).json({ success: false, error: 'Nombre, descripcion y area son obligatorios' });
        }

        const [area] = await db.query('SELECT id FROM area WHERE id = ? LIMIT 1', [areaId]);
        if (!area.length) {
            return res.status(400).json({ success: false, error: 'El area seleccionada no existe' });
        }

        const [existing] = await db.query('SELECT id FROM platform WHERE name = ? AND area_id = ? LIMIT 1', [name, areaId]);
        if (existing.length) {
            return res.status(409).json({ success: false, error: 'Ya existe una plataforma con ese nombre en el area seleccionada' });
        }

        await db.query(
            `INSERT INTO platform
             (name, description, area_id, request_method, direct_link, owner, resources, icon, status, logo_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                description,
                areaId,
                requestMethod || null,
                directLink || null,
                owner || null,
                resources || null,
                icon,
                status,
                logoUrl || null
            ]
        );

        await logEvent({
            entityType: 'Plataforma',
            entityName: name,
            action: 'Alta',
            description: `Se registro la plataforma ${name}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Plataforma registrada correctamente' });
    } catch (err) {
        console.error('[PlatformCreateError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al registrar plataforma' });
    }
};

const editPlatform = async (req, res) => {
    try {
        const platformId = parseInt(req.params.id, 10);
        const name = (req.body.name || '').trim();
        const description = (req.body.description || '').trim();
        const areaId = parseInt(req.body.area_id, 10);
        const requestMethod = (req.body.request_method || '').trim();
        const directLink = (req.body.direct_link || '').trim();
        const owner = (req.body.owner || '').trim();
        const resources = (req.body.resources || '').trim();
        const icon = (req.body.icon || 'box').trim();
        const status = req.body.status === 'Deshabilitado' ? 'Deshabilitado' : 'Activo';
        const logoUrl = (req.body.logo_url || '').trim();

        if (!Number.isInteger(platformId) || !name || !description || !Number.isInteger(areaId)) {
            return res.status(400).json({ success: false, error: 'Datos invalidos para actualizar plataforma' });
        }

        const [existingPlatform] = await db.query('SELECT id FROM platform WHERE id = ? LIMIT 1', [platformId]);
        if (!existingPlatform.length) {
            return res.status(404).json({ success: false, error: 'Plataforma no encontrada' });
        }

        const [area] = await db.query('SELECT id FROM area WHERE id = ? LIMIT 1', [areaId]);
        if (!area.length) {
            return res.status(400).json({ success: false, error: 'El area seleccionada no existe' });
        }

        const [duplicated] = await db.query(
            'SELECT id FROM platform WHERE name = ? AND area_id = ? AND id <> ? LIMIT 1',
            [name, areaId, platformId]
        );
        if (duplicated.length) {
            return res.status(409).json({ success: false, error: 'Ya existe una plataforma con ese nombre en el area seleccionada' });
        }

        await db.query(
            `UPDATE platform
             SET name = ?, description = ?, area_id = ?, request_method = ?, direct_link = ?, owner = ?, resources = ?, icon = ?, status = ?, logo_url = ?
             WHERE id = ?`,
            [
                name,
                description,
                areaId,
                requestMethod || null,
                directLink || null,
                owner || null,
                resources || null,
                icon,
                status,
                logoUrl || null,
                platformId
            ]
        );

        await logEvent({
            entityType: 'Plataforma',
            entityName: name,
            action: 'Modificacion',
            description: `Se actualizo la plataforma ${name}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Plataforma actualizada correctamente' });
    } catch (err) {
        console.error('[PlatformUpdateError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al actualizar plataforma' });
    }
};

const deletePlatform = async (req, res) => {
    try {
        const platformId = parseInt(req.params.id, 10);
        if (!Number.isInteger(platformId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const [platformRows] = await db.query('SELECT name FROM platform WHERE id = ? LIMIT 1', [platformId]);
        const platformName = platformRows.length ? platformRows[0].name : `ID ${platformId}`;

        const [result] = await db.query('DELETE FROM platform WHERE id = ?', [platformId]);
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, error: 'Plataforma no encontrada' });
        }

        await logEvent({
            entityType: 'Plataforma',
            entityName: platformName,
            action: 'Baja',
            description: `Se elimino la plataforma ${platformName}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Plataforma eliminada correctamente' });
    } catch (err) {
        console.error('[PlatformDeleteError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al eliminar plataforma' });
    }
};

module.exports = { getPlatforms, addPlatform, editPlatform, deletePlatform };
