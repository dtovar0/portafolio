const db = require('../config/db');

const globalSearch = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({ results: [] });
        }

        const like = `%${q}%`;
        const results = [];

        const [areas] = await db.query(
            'SELECT id, name, description FROM area WHERE name LIKE ? OR description LIKE ? ORDER BY name ASC LIMIT 8',
            [like, like]
        );

        const [platforms] = await db.query(
            `SELECT p.id, p.name, p.description, a.name AS area_name
             FROM platform p
             JOIN area a ON a.id = p.area_id
             WHERE p.name LIKE ? OR p.description LIKE ?
             ORDER BY p.name ASC
             LIMIT 12`,
            [like, like]
        );

        let users = [];
        try {
            const [userRows] = await db.query(
                'SELECT id, name, email FROM user WHERE name LIKE ? OR email LIKE ? ORDER BY name ASC LIMIT 8',
                [like, like]
            );
            users = userRows;
        } catch (_) {
            users = [];
        }

        areas.forEach((area) => {
            results.push({
                cat: 'Areas',
                icon: 'fa-layer-group',
                name: area.name,
                sub: area.description || '',
                link: '/areas'
            });
        });

        platforms.forEach((platform) => {
            results.push({
                cat: 'Plataformas',
                icon: 'fa-cube',
                name: platform.name,
                sub: platform.area_name || '',
                link: '/platforms'
            });
        });

        users.forEach((user) => {
            results.push({
                cat: 'Usuarios',
                icon: 'fa-user',
                name: user.name,
                sub: user.email || '',
                link: '/users'
            });
        });

        return res.json({ results });
    } catch (err) {
        console.error('[GlobalSearchError]', err);
        return res.status(500).json({ results: [] });
    }
};

module.exports = { globalSearch };
