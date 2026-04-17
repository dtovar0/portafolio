const db = require('../config/db');
const { hashPassword } = require('../utils/hashHelper');
const { logEvent } = require('../utils/auditLogger');

const getUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
                    COUNT(ar.id) AS platforms_count
             FROM user u
             LEFT JOIN access_request ar
               ON ar.user_id = u.id AND ar.status = 'Aprobado'
             GROUP BY u.id
             ORDER BY u.name ASC`
        );

        const [areas] = await db.query('SELECT id, name, description, icon, color, status FROM area ORDER BY name ASC');
        const [userAreas] = await db.query(
            `SELECT ua.user_id, a.id, a.name, a.icon, a.color
             FROM user_areas ua
             JOIN area a ON a.id = ua.area_id`
        );

        const userAreaMap = userAreas.reduce((acc, row) => {
            if (!acc[row.user_id]) acc[row.user_id] = [];
            acc[row.user_id].push({
                id: row.id,
                name: row.name,
                icon: row.icon,
                color: row.color
            });
            return acc;
        }, {});

        const usersJson = users.map((u) => ({
            ...u,
            areas: userAreaMap[u.id] || []
        }));

        res.render('users/list', {
            title: 'Usuarios | ' + res.locals.settings.portal_name,
            users,
            areas,
            users_json: usersJson,
            all_areas: areas,
            all_areas_json: areas,
            activePage: 'users',
            breadcrumbs: '<span class="breadcrumb-item" data-action="go-home">Inicio</span> <span>/</span> <span class="breadcrumb-item">Catálogo</span> <span>/</span> <span class="breadcrumb-item active">Usuarios</span>'
        });
    } catch (err) {
        console.error('[UserListError]', err);
        res.status(500).send('Error interno');
    }
};

const addUser = async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const role = (req.body.role || 'Usuario').trim();
        const status = req.body.status === 'Activo' ? 'Activo' : 'Inactivo';
        const password = (req.body.password || '').trim();
        const areasRaw = req.body.areas || '[]';

        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Nombre y correo son obligatorios' });
        }

        const [existing] = await db.query('SELECT id FROM user WHERE email = ? LIMIT 1', [email]);
        if (existing.length) {
            return res.status(409).json({ success: false, error: 'Este correo ya esta registrado' });
        }

        const passwordHash = password ? await hashPassword(password) : null;

        const [result] = await db.query(
            'INSERT INTO user (name, email, role, status, password_hash) VALUES (?, ?, ?, ?, ?)',
            [name, email, role, status, passwordHash]
        );

        let areaIds = [];
        try {
            areaIds = Array.isArray(areasRaw) ? areasRaw : JSON.parse(areasRaw);
        } catch (_) {
            areaIds = [];
        }

        if (Array.isArray(areaIds) && areaIds.length) {
            const areaByName = new Map();
            const [allAreas] = await db.query('SELECT id, name FROM area');
            allAreas.forEach((a) => areaByName.set(a.name, a.id));

            const values = areaIds
                .map((value) => {
                    const parsed = parseInt(value, 10);
                    if (Number.isInteger(parsed)) return parsed;
                    if (typeof value === 'string' && areaByName.has(value)) return areaByName.get(value);
                    return null;
                })
                .filter((id) => Number.isInteger(id))
                .map((id) => [result.insertId, id]);

            if (values.length) {
                await db.query('INSERT INTO user_areas (user_id, area_id) VALUES ?', [values]);
            }
        }

        await logEvent({
            entityType: 'Usuario',
            entityName: name,
            action: 'Alta',
            description: `Se creo el usuario ${name} (${email})`,
            user: req.user
        });

        return res.json({ success: true, message: 'Usuario creado correctamente' });
    } catch (err) {
        console.error('[UserCreateError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al crear usuario' });
    }
};

const editUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const incomingName = (req.body.name || '').trim();
        const incomingEmail = (req.body.email || '').trim().toLowerCase();
        const role = (req.body.role || 'Usuario').trim();
        const status = req.body.status === 'Activo' ? 'Activo' : 'Inactivo';
        const password = (req.body.password || '').trim();
        const areasRaw = req.body.areas || '[]';

        const [existing] = await db.query('SELECT id, name, email FROM user WHERE id = ? LIMIT 1', [userId]);
        if (!existing.length) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        const currentUser = existing[0];
        const name = incomingName || currentUser.name;
        const email = incomingEmail || (currentUser.email || '').toLowerCase();

        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Nombre y correo son obligatorios' });
        }

        if (email !== (currentUser.email || '').toLowerCase()) {
            const [duplicate] = await db.query('SELECT id FROM user WHERE email = ? AND id <> ? LIMIT 1', [email, userId]);
            if (duplicate.length) {
                return res.status(409).json({ success: false, error: 'Este correo ya esta en uso por otro usuario' });
            }
        }

        if (password) {
            const passwordHash = await hashPassword(password);
            await db.query(
                'UPDATE user SET name = ?, email = ?, role = ?, status = ?, password_hash = ? WHERE id = ?',
                [name, email, role, status, passwordHash, userId]
            );
        } else {
            await db.query(
                'UPDATE user SET name = ?, email = ?, role = ?, status = ? WHERE id = ?',
                [name, email, role, status, userId]
            );
        }

        let areaIds = [];
        try {
            areaIds = Array.isArray(areasRaw) ? areasRaw : JSON.parse(areasRaw);
        } catch (_) {
            areaIds = [];
        }

        await db.query('DELETE FROM user_areas WHERE user_id = ?', [userId]);

        if (Array.isArray(areaIds) && areaIds.length) {
            const areaByName = new Map();
            const [allAreas] = await db.query('SELECT id, name FROM area');
            allAreas.forEach((a) => areaByName.set(a.name, a.id));

            const values = areaIds
                .map((value) => {
                    const parsed = parseInt(value, 10);
                    if (Number.isInteger(parsed)) return parsed;
                    if (typeof value === 'string' && areaByName.has(value)) return areaByName.get(value);
                    return null;
                })
                .filter((id) => Number.isInteger(id))
                .map((id) => [userId, id]);

            if (values.length) {
                await db.query('INSERT INTO user_areas (user_id, area_id) VALUES ?', [values]);
            }
        }

        await logEvent({
            entityType: 'Usuario',
            entityName: name,
            action: 'Modificacion',
            description: `Se actualizo el usuario ${name} (${email})`,
            user: req.user
        });

        return res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (err) {
        console.error('[UserUpdateError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al actualizar usuario' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const [userRows] = await db.query('SELECT name, email FROM user WHERE id = ? LIMIT 1', [userId]);
        const userName = userRows.length ? userRows[0].name : `ID ${userId}`;
        const userEmail = userRows.length ? userRows[0].email : '';

        await db.query('DELETE FROM access_request WHERE user_id = ?', [userId]);
        await db.query('DELETE FROM user_areas WHERE user_id = ?', [userId]);

        const [result] = await db.query('DELETE FROM user WHERE id = ?', [userId]);
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        await logEvent({
            entityType: 'Usuario',
            entityName: userName,
            action: 'Baja',
            description: `Se elimino el usuario ${userName} (${userEmail})`,
            user: req.user
        });

        return res.json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (err) {
        console.error('[UserDeleteError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al eliminar usuario' });
    }
};

const getUserAreas = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const [rows] = await db.query('SELECT area_id FROM user_areas WHERE user_id = ?', [userId]);
        const areaIds = rows.map((row) => row.area_id);
        return res.json({ success: true, areaIds });
    } catch (err) {
        console.error('[UserAreasError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al obtener areas del usuario' });
    }
};

const getUserAccess = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id || req.params.id, 10);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const [userRows] = await db.query('SELECT id, name FROM user WHERE id = ? LIMIT 1', [userId]);
        if (!userRows.length) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        const [userAreas] = await db.query(
            `SELECT a.id, a.name
             FROM user_areas ua
             JOIN area a ON a.id = ua.area_id
             WHERE ua.user_id = ?`,
            [userId]
        );
        const areaIds = userAreas.map((a) => a.id);

        let platforms = [];
        if (areaIds.length) {
            const [rows] = await db.query(
                `SELECT p.id, p.name, p.area_id, a.name AS area_name
                 FROM platform p
                 JOIN area a ON a.id = p.area_id
                 WHERE p.area_id IN (?)
                 ORDER BY a.name ASC, p.name ASC`,
                [areaIds]
            );
            platforms = rows;
        }

        const [approved] = await db.query(
            'SELECT platform_id FROM access_request WHERE user_id = ? AND status = ? ',
            [userId, 'Aprobado']
        );
        const approvedSet = new Set(approved.map((r) => r.platform_id));

        return res.json({
            success: true,
            user: userRows[0].name,
            areas_count: userAreas.length,
            areas: userAreas,
            platforms: platforms.map((p) => ({
                id: p.id,
                name: p.name,
                area_name: p.area_name,
                area_id: p.area_id,
                has_access: approvedSet.has(p.id)
            }))
        });
    } catch (err) {
        console.error('[UserAccessGetError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al consultar accesos' });
    }
};

const updateUserAccess = async (req, res) => {
    try {
        const userId = parseInt(req.params.user_id || req.params.id, 10);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const rawIds = Array.isArray(req.body.platform_ids) ? req.body.platform_ids : [];
        const platformIds = rawIds
            .map((id) => parseInt(id, 10))
            .filter((id) => Number.isInteger(id));

        const [existingApproved] = await db.query(
            'SELECT id, platform_id FROM access_request WHERE user_id = ? AND status = ? ',
            [userId, 'Aprobado']
        );

        const approvedMap = new Map(existingApproved.map((r) => [r.platform_id, r.id]));

        for (const pid of platformIds) {
            if (!approvedMap.has(pid)) {
                await db.query(
                    'INSERT INTO access_request (platform_id, user_id, status, request_type, processed_at) VALUES (?, ?, ?, ?, NOW())',
                    [pid, userId, 'Aprobado', 'Admin']
                );
            }
        }

        for (const row of existingApproved) {
            if (!platformIds.includes(row.platform_id)) {
                await db.query(
                    'UPDATE access_request SET status = ?, processed_at = NOW() WHERE id = ?',
                    ['Revocado', row.id]
                );
            }
        }

        return res.json({ success: true, message: 'Accesos actualizados correctamente.' });
    } catch (err) {
        console.error('[UserAccessUpdateError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al actualizar accesos' });
    }
};

const ldapSearchApi = async (req, res) => {
    try {
        const q = (req.query.q || '').trim().toLowerCase();
        if (!q) {
            return res.json({ success: true, users: [] });
        }

        const [users] = await db.query(
            `SELECT name, email
             FROM user
             WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ?
             ORDER BY name ASC
             LIMIT 10`,
            [`%${q}%`, `%${q}%`]
        );

        return res.json({
            success: true,
            users: users.map((u) => ({
                displayName: u.name,
                cn: u.name,
                mail: u.email,
                userPrincipalName: u.email,
                sAMAccountName: u.email ? u.email.split('@')[0] : u.name
            }))
        });
    } catch (err) {
        console.error('[LdapSearchError]', err);
        return res.status(500).json({ success: false, users: [], error: 'Error al buscar en LDAP' });
    }
};

const importLdapUser = async (_req, res) => {
    return res.status(400).json({ success: false, error: 'Importación LDAP no disponible en esta versión' });
};

module.exports = {
    getUsers,
    addUser,
    editUser,
    deleteUser,
    getUserAreas,
    getUserAccess,
    updateUserAccess,
    ldapSearchApi,
    importLdapUser
};
