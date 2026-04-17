const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Native Node.js hashing using Bcrypt
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
};

/**
 * Flexible verification: Supports native Bcrypt and legacy Werkzeug (scrypt/pbkdf2)
 */
const verifyPassword = async (password, passwordHash) => {
    if (!passwordHash) return false;

    // 1. Check if it's native Bcrypt (starts with $2a$ or $2b$)
    if (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$')) {
        return await bcrypt.compare(password, passwordHash);
    }

    // 2. Legacy Werkzeug Support (for migration only)
    try {
        if (passwordHash.includes(':')) {
            const parts = passwordHash.split(':');
            const method = parts[0];

            if (method === 'pbkdf2') {
                const algo = parts[1];
                const [iterations, salt, expectedHash] = parts[2].split('$');
                const derivedKey = crypto.pbkdf2Sync(
                    Buffer.from(password, 'utf8'), 
                    Buffer.from(salt, 'utf8'), 
                    parseInt(iterations), 
                    expectedHash.length / 2, 
                    algo
                );
                return derivedKey.toString('hex') === expectedHash;
            }

            if (method === 'scrypt') {
                const n = parseInt(parts[1]);
                const r = parseInt(parts[2]);
                const rest = parts[3].split('$');
                const p = parseInt(rest[0]);
                const salt = rest[1];
                const expectedHash = rest[2];

                const derivedKey = crypto.scryptSync(
                    Buffer.from(password, 'utf8'),
                    Buffer.from(salt, 'utf8'),
                    expectedHash.length / 2, 
                    { N: n, r: r, p: p, maxmem: 128 * 1024 * 1024 }
                );
                return derivedKey.toString('hex') === expectedHash;
            }
        }
    } catch (err) {
        console.error('[HashError] Legacy verify failed:', err.message);
    }

    // Fallback plain text (only for development/reset)
    return password === passwordHash;
};

/**
 * Check if the hash needs to be updated to native Bcrypt
 */
const needsRehash = (passwordHash) => {
    return !passwordHash.startsWith('$2a$') && !passwordHash.startsWith('$2b$');
};

module.exports = { hashPassword, verifyPassword, needsRehash };
