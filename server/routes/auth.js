// server/routes/auth.js — Login, verify session
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password wajib diisi' });
        }

        // Find user by email or username
        const user = await User.findOne({
            where: { email: email.toLowerCase() },
            include: [{ model: Role, as: 'role' }]
        });

        if (!user) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        if (user.status === 'NONAKTIF') {
            return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan. Hubungi Administrator.' });
        }

        // Compare password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            token,
            user: {
                userId: user.id,
                email: user.email,
                fullName: user.full_name,
                avatar: user.avatar || user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
                roleId: user.role_id,
                roleName: user.role ? user.role.name : 'User',
                loginAt: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error saat login' });
    }
});

// GET /api/auth/verify — check if token is still valid
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            include: [{ model: Role, as: 'role' }]
        });
        if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

        res.json({
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
            avatar: user.avatar,
            roleId: user.role_id,
            roleName: user.role ? user.role.name : 'User',
            permissions: user.permissions || (user.role ? user.role.permissions : {})
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
