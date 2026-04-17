const db = require('../config/db');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { verifyPassword } = require('../utils/hashHelper');
const { logEvent } = require('../utils/auditLogger');

const login = async (req, res) => {
    let { email, password } = req.body;
    email = email ? email.trim() : '';

    console.log(`[LoginAttempt] Email: ${email}`);

    if (!email || !password) {
        return res.render('login', { 
            layout: false, 
            error: 'Email y contraseña requeridos' 
        });
    }

    try {
        const [users] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
        const user = users[0];

        fs.appendFileSync(path.join(__dirname, '../../auth_debug.log'), `[LoginAttempt] User found: ${!!user}\n`);

        if (!user) {
            return res.render('login', { layout: false, error: 'Credenciales inválidas' });
        }

        fs.appendFileSync(path.join(__dirname, '../../auth_debug.log'), `[LoginAttempt] Hashing verify start for: ${user.email}\n`);

        const isMatch = await verifyPassword(password, user.password_hash);

        if (!isMatch) {
            fs.appendFileSync(path.join(__dirname, '../../auth_debug.log'), `[LoginAttempt] Password mismatch for: ${user.email}\n`);
            return res.render('login', { 
                layout: false, 
                error: 'Credenciales inválidas' 
            });
        }

        // --- Transparent Migration: Re-hash if old format ---
        const { needsRehash, hashPassword } = require('../utils/hashHelper');
        if (needsRehash(user.password_hash)) {
            const newHash = await hashPassword(password);
            await db.query('UPDATE user SET password_hash = ? WHERE id = ?', [newHash, user.id]);
            fs.appendFileSync(path.join(__dirname, '../../auth_debug.log'), `[Security] Migrated ${user.email} to native Bcrypt hash.\n`);
        }

        // Generate JWT with name included
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Set Cookie (Independent from Flask, but same name if desired)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        await logEvent({
            entityType: 'Sesion',
            entityName: user.email,
            action: 'Login',
            description: `Inicio de sesion exitoso de ${user.email}`,
            user: { id: user.id, name: user.name, email: user.email }
        });

        res.redirect('/');
    } catch (err) {
        console.error('[LoginError]', err);
        res.render('login', { layout: false, error: 'Error interno del servidor' });
    }
};

const logout = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                await logEvent({
                    entityType: 'Sesion',
                    entityName: decoded.email || 'N/A',
                    action: 'Logout',
                    description: `Cierre de sesion de ${decoded.email || 'usuario'}`,
                    user: { id: decoded.id, name: decoded.name, email: decoded.email }
                });
            } catch (_) {
                // Ignore invalid token during logout.
            }
        }
    } catch (err) {
        console.error('[LogoutAuditError]', err.message);
    }

    res.clearCookie('token');
    res.redirect('/login');
};

module.exports = { login, logout };
