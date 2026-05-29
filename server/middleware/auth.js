// server/middleware/auth.js — JWT Authentication Middleware
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Crash saat startup jika JWT_SECRET tidak di-set atau masih default
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'change_this_to_a_random_64_character_string') {
    console.error('❌ FATAL: JWT_SECRET tidak di-set atau masih menggunakan nilai default.');
    console.error('   Set JWT_SECRET di file .env dengan string acak minimal 64 karakter.');
    process.exit(1);
}

/**
 * Generate JWT token for a user
 */
function generateToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email, roleId: user.role_id },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
}

/**
 * Middleware: verify JWT from Authorization header
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, email, roleId }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token tidak valid atau sudah expired.' });
    }
}

/**
 * Middleware: check if user has permission for a module
 */
function requirePermission(moduleName, permType = 'view') {
    return async (req, res, next) => {
        try {
            const { User, Role } = require('../models');
            const user = await User.findByPk(req.user.userId);
            if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

            const role = await Role.findByPk(user.role_id);
            const isAdmin = user.id === 'user_admin' || (role && role.id === 'role_admin');
            if (isAdmin) return next(); // Admin bypasses all checks

            const perms = user.permissions || (role ? role.permissions : {}) || {};
            const modulePerm = perms[moduleName];
            if (!modulePerm || !modulePerm[permType]) {
                return res.status(403).json({ error: `Akses ditolak: tidak punya izin ${permType} untuk modul ${moduleName}` });
            }
            next();
        } catch (err) {
            return res.status(500).json({ error: 'Gagal memeriksa permission' });
        }
    };
}

module.exports = { generateToken, authenticateToken, requirePermission };
