const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const tokenUserIdRaw = decoded.id ?? decoded.user_id ?? decoded.userId ?? decoded.sub;
        const tokenUserId = Number.parseInt(tokenUserIdRaw, 10);
        const tokenEmail = (decoded.email || decoded.mail || '').toString().trim().toLowerCase();

        // Backward compatibility: old tokens may not include normalized fields.
        let user = {
            id: Number.isInteger(tokenUserId) ? tokenUserId : undefined,
            name: decoded.name,
            email: tokenEmail || decoded.email,
            role: decoded.role
        };

        if (!user.id || !user.name || !user.role || !user.email) {
            try {
                let rows = [];
                if (Number.isInteger(tokenUserId)) {
                    const [byId] = await pool.query(
                        'SELECT id, name, email, role FROM user WHERE id = ? LIMIT 1',
                        [tokenUserId]
                    );
                    rows = byId;
                }

                if (!rows.length && tokenEmail) {
                    const [byEmail] = await pool.query(
                        'SELECT id, name, email, role FROM user WHERE email = ? LIMIT 1',
                        [tokenEmail]
                    );
                    rows = byEmail;
                }

                if (rows.length) {
                    user = {
                        id: rows[0].id,
                        name: rows[0].name,
                        email: rows[0].email,
                        role: rows[0].role
                    };
                }
            } catch (_) {
                // If lookup fails, continue with decoded payload.
            }
        }

        req.user = user; // { id, email, role, name }
        res.locals.user = user; // For views
        next();
    } catch (err) {
        console.error('[AuthMiddleware] Token inválido');
        res.clearCookie('token');
        res.redirect('/login');
    }
};

const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    if (req.user.role !== 'Administrador') {
        return res.redirect('/catalogo');
    }

    return next();
};

// Inject global UI locals (pending badge, etc.) for all protected views
const globalLocals = async (req, res, next) => {
    try {
        const [[row]] = await pool.query(
            "SELECT COUNT(*) AS cnt FROM access_request WHERE status = 'Pendiente'"
        );
        res.locals.pending_requests_count = row ? row.cnt : 0;
    } catch (e) {
        res.locals.pending_requests_count = 0;
    }
    next();
};

module.exports = { protect, adminOnly, globalLocals };
