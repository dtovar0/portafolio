const db = require('../config/db');
const { logEvent } = require('../utils/auditLogger');

const getRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT ar.id, ar.status, ar.request_type, ar.created_at, ar.processed_at,
                    u.name AS user_name, u.email AS user_email,
                    p.name AS platform_name,
                    a.name AS area_name
             FROM access_request ar
             JOIN user u ON u.id = ar.user_id
             JOIN platform p ON p.id = ar.platform_id
             LEFT JOIN area a ON a.id = p.area_id
             ORDER BY ar.created_at DESC`
        );

        const grouped = {
            Pendientes: [],
            Aprobadas: [],
            Denegadas: [],
            Historial: []
        };

        for (const r of requests) {
            const item = {
                id: r.id,
                platform: r.platform_name || 'N/A',
                user: r.user_name || 'Anon',
                status: r.status,
                type: r.request_type || 'Usuario',
                date: r.created_at ? new Date(r.created_at).toLocaleString('es-MX') : '---',
                processed_date: r.processed_at ? new Date(r.processed_at).toLocaleString('es-MX') : '---'
            };

            if (r.status === 'Pendiente') grouped.Pendientes.push(item);
            if (r.status === 'Aprobado') grouped.Aprobadas.push(item);
            if (r.status === 'Rechazado') grouped.Denegadas.push(item);
            grouped.Historial.push(item);
        }

        const counts = {
            Pendientes: grouped.Pendientes.length,
            Aprobadas: grouped.Aprobadas.length,
            Denegadas: grouped.Denegadas.length,
            Historial: grouped.Historial.length
        };

        res.render('requests/list', {
            title: 'Solicitudes | ' + res.locals.settings.portal_name,
            grouped_requests: grouped,
            counts,
            activePage: 'requests',
            breadcrumbs: '<span class="breadcrumb-item" data-action="go-home">Inicio</span> <span>/</span> <button type="button" class="breadcrumb-item active breadcrumb-button" data-action="requests-show-grid">Solicitudes</button>'
        });
    } catch (err) {
        console.error('[RequestListError]', err);
        res.status(500).send('Error interno');
    }
};

const approveRequest = async (req, res) => {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (!Number.isInteger(requestId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const [result] = await db.query(
            'UPDATE access_request SET status = ?, processed_at = NOW() WHERE id = ?',
            ['Aprobado', requestId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const [rows] = await db.query(
            `SELECT u.name AS user_name, p.name AS platform_name
             FROM access_request ar
             JOIN user u ON u.id = ar.user_id
             JOIN platform p ON p.id = ar.platform_id
             WHERE ar.id = ? LIMIT 1`,
            [requestId]
        );

        const userName = rows.length ? rows[0].user_name : 'N/A';
        const platformName = rows.length ? rows[0].platform_name : 'N/A';

        await logEvent({
            entityType: 'Acceso',
            entityName: platformName,
            action: 'Aprobado',
            description: `Se aprobo la solicitud de ${userName} para ${platformName}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Solicitud aprobada' });
    } catch (err) {
        console.error('[RequestApproveError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al aprobar solicitud' });
    }
};

const rejectRequest = async (req, res) => {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (!Number.isInteger(requestId)) {
            return res.status(400).json({ success: false, error: 'ID invalido' });
        }

        const [result] = await db.query(
            'UPDATE access_request SET status = ?, processed_at = NOW() WHERE id = ?',
            ['Rechazado', requestId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const [rows] = await db.query(
            `SELECT u.name AS user_name, p.name AS platform_name
             FROM access_request ar
             JOIN user u ON u.id = ar.user_id
             JOIN platform p ON p.id = ar.platform_id
             WHERE ar.id = ? LIMIT 1`,
            [requestId]
        );

        const userName = rows.length ? rows[0].user_name : 'N/A';
        const platformName = rows.length ? rows[0].platform_name : 'N/A';

        await logEvent({
            entityType: 'Acceso',
            entityName: platformName,
            action: 'Rechazado',
            description: `Se rechazo la solicitud de ${userName} para ${platformName}`,
            user: req.user
        });

        return res.json({ success: true, message: 'Solicitud rechazada' });
    } catch (err) {
        console.error('[RequestRejectError]', err);
        return res.status(500).json({ success: false, error: 'Error interno al rechazar solicitud' });
    }
};

module.exports = { getRequests, approveRequest, rejectRequest };
