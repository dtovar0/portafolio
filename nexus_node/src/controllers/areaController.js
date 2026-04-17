const db = require('../config/db');
const { logEvent } = require('../utils/auditLogger');

const getAreas = async (req, res) => {
    try {
        const [areas] = await db.query('SELECT id, name, description, status, icon, color FROM area ORDER BY name ASC');
        const [allUsers] = await db.query('SELECT id, name, email, role, status FROM user ORDER BY name ASC');
        const [platformCounts] = await db.query('SELECT area_id, COUNT(*) AS total FROM platform GROUP BY area_id');
        const [userCounts] = await db.query('SELECT area_id, COUNT(*) AS total FROM user_areas GROUP BY area_id');
        const [areaUsers] = await db.query('SELECT area_id, user_id FROM user_areas');

        const platformsByArea = new Map(platformCounts.map((r) => [r.area_id, r.total]));
        const usersByArea = new Map(userCounts.map((r) => [r.area_id, r.total]));
        const areaUserIds = areaUsers.reduce((acc, row) => {
            if (!acc[row.area_id]) acc[row.area_id] = [];
            acc[row.area_id].push(row.user_id);
            return acc;
        }, {});

        const areasJson = areas.map((a) => ({
            ...a,
            users_count: usersByArea.get(a.id) || 0,
            platforms_count: platformsByArea.get(a.id) || 0,
            user_ids: areaUserIds[a.id] || []
        }));

        res.render('areas/list', {
            title: 'Gestión de Áreas | ' + res.locals.settings.portal_name,
            areas,
            areas_json: areasJson,
            all_users_json: allUsers,
            activePage: 'areas',
            breadcrumbs: '<span class="breadcrumb-item">Inicio</span> <span>/</span> <span class="breadcrumb-item">Catálogo</span> <span>/</span> <span class="breadcrumb-item active">Áreas</span>'
        });
    } catch (err) {
        console.error('[AreaError]', err);
        res.status(500).send('Error interno');
    }
};

const getAreasApi = async (_req, res) => {
    try {
        const [areas] = await db.query('SELECT id, name, description, icon, color, status FROM area ORDER BY name ASC');
        return res.json(areas);
    } catch (err) {
        console.error('[AreaApiError]', err);
        return res.status(500).json([]);
    }
};

const addArea = async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        const description = (req.body.description || '').trim();
        const status = req.body.status === 'Deshabilitado' ? 'Deshabilitado' : 'Activo';
        const icon = (req.body.icon || 'box').trim();
        const color = (req.body.color || 'linear-gradient(135deg, #6366f1, #818cf8)').trim();

        if (!name) {
            return res.status(400).json({ success: false, error: 'El nombre del area es obligatorio' });
        }

        const [existing] = await db.query('SELECT id FROM area WHERE name = ? LIMIT 1', [name]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'Ya existe un area con ese nombre' });
        }

        const [insertResult] = await db.query(
            'INSERT INTO area (name, description, status, icon, color) VALUES (?, ?, ?, ?, ?)',
            [name, description || null, status, icon, color]
        );

        // Optional user assignment from 3-step modal
        let userIds = [];
        try {
            userIds = JSON.parse(req.body.users || '[]');
        } catch (_) {
            userIds = [];
        }
        if (Array.isArray(userIds) && userIds.length) {
            const values = userIds
                .map((id) => parseInt(id, 10))
                .filter((id) => Number.isInteger(id))
                .map((userId) => [userId, insertResult.insertId]);
            if (values.length) {
                await db.query('INSERT INTO user_areas (user_id, area_id) VALUES ?', [values]);
            }
        }

        await logEvent({
            entityType: 'Area',
            entityName: name,
            action: 'Alta',
            description: `Se creo el area ${name}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Area creada correctamente' });
    } catch (err) {
        console.error('[AreaCreateError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al crear area' });
    }
};

const editArea = async (req, res) => {
    try {
        const areaId = parseInt(req.params.id, 10);
        if (!Number.isInteger(areaId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const name = (req.body.name || '').trim();
        const description = (req.body.description || '').trim();
        const status = req.body.status === 'Deshabilitado' ? 'Deshabilitado' : 'Activo';
        const icon = (req.body.icon || 'box').trim();
        const color = (req.body.color || 'linear-gradient(135deg, #6366f1, #818cf8)').trim();

        if (!name) {
            return res.status(400).json({ success: false, error: 'El nombre del area es obligatorio' });
        }

        const [existing] = await db.query('SELECT id FROM area WHERE id = ? LIMIT 1', [areaId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Area no encontrada' });
        }

        const [duplicated] = await db.query('SELECT id FROM area WHERE name = ? AND id <> ? LIMIT 1', [name, areaId]);
        if (duplicated.length > 0) {
            return res.status(409).json({ success: false, error: 'Ya existe un area con ese nombre' });
        }

        await db.query(
            'UPDATE area SET name = ?, description = ?, status = ?, icon = ?, color = ? WHERE id = ?',
            [name, description || null, status, icon, color, areaId]
        );

        // Sync user assignment from 3-step modal
        let userIds = [];
        try {
            userIds = JSON.parse(req.body.users || '[]');
        } catch (_) {
            userIds = [];
        }
        await db.query('DELETE FROM user_areas WHERE area_id = ?', [areaId]);
        if (Array.isArray(userIds) && userIds.length) {
            const values = userIds
                .map((id) => parseInt(id, 10))
                .filter((id) => Number.isInteger(id))
                .map((userId) => [userId, areaId]);
            if (values.length) {
                await db.query('INSERT INTO user_areas (user_id, area_id) VALUES ?', [values]);
            }
        }

        await logEvent({
            entityType: 'Area',
            entityName: name,
            action: 'Modificacion',
            description: `Se actualizo el area ${name}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Area actualizada correctamente' });
    } catch (err) {
        console.error('[AreaUpdateError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al actualizar area' });
    }
};

const deleteArea = async (req, res) => {
    try {
        const areaId = parseInt(req.params.id, 10);
        if (!Number.isInteger(areaId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const [inUse] = await db.query('SELECT id FROM platform WHERE area_id = ? LIMIT 1', [areaId]);
        if (inUse.length > 0) {
            return res.status(409).json({ success: false, error: 'No se puede eliminar: el area tiene plataformas asociadas' });
        }

        const [areaRows] = await db.query('SELECT name FROM area WHERE id = ? LIMIT 1', [areaId]);
        const areaName = areaRows.length ? areaRows[0].name : `ID ${areaId}`;

        const [result] = await db.query('DELETE FROM area WHERE id = ?', [areaId]);
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, error: 'Area no encontrada' });
        }

        await logEvent({
            entityType: 'Area',
            entityName: areaName,
            action: 'Baja',
            description: `Se elimino el area ${areaName}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Area eliminada correctamente' });
    } catch (err) {
        console.error('[AreaDeleteError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al eliminar area' });
    }
};

module.exports = { getAreas, getAreasApi, addArea, editArea, deleteArea };
