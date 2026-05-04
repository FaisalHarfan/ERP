// server/routes/settings.js — API untuk Modul Pengaturan (User & Role)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Role, SystemLog } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Helper untuk format response (camelCase ke frontend)
function formatUser(user) {
    return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        roleId: user.role_id,
        status: user.status,
        avatar: user.avatar,
        permissions: user.permissions,
        createdAt: user.created_at,
        updatedAt: user.updated_at
    };
}

// Helper: ID generator
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// ─── USERS ────────────────────────────────────────────────────────

// Ambil semua user
router.get('/users', authenticateToken, requirePermission('pengaturan', 'view'), async (req, res) => {
    try {
        const users = await User.findAll({ order: [['created_at', 'DESC']] });
        res.json(users.map(formatUser));
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengambil data user' });
    }
});

// Buat user baru (dengan hashing password)
router.post('/users', authenticateToken, requirePermission('pengaturan', 'edit'), async (req, res) => {
    try {
        const { fullName, email, password, roleId, permissions } = req.body;
        
        if (!email || !password || !fullName || !roleId) {
            return res.status(400).json({ error: 'Data wajib tidak lengkap' });
        }

        // Cek email duplicate
        const exist = await User.findOne({ where: { email: email.toLowerCase() } });
        if (exist) return res.status(400).json({ error: 'Email sudah terdaftar' });

        const hash = await bcrypt.hash(password, 10);
        const id = 'user_' + generateId();
        
        const avatar = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

        const newUser = await User.create({
            id,
            full_name: fullName,
            email: email.toLowerCase(),
            username: email.split('@')[0],
            password_hash: hash,
            role_id: roleId,
            status: 'AKTIF',
            avatar,
            permissions: permissions || null
        });

        // Catat di System Log
        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'CREATE_USER',
            details: `Membuat user baru: ${email}`
        });

        res.status(201).json(formatUser(newUser));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal membuat user' });
    }
});

// Update user (bisa reset password)
router.put('/users/:id', authenticateToken, requirePermission('pengaturan', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, password, roleId, status, permissions } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

        // Jangan izinkan mengubah role_admin secara sembarangan
        if (user.id === 'user_admin' && req.user.userId !== 'user_admin') {
            return res.status(403).json({ error: 'Hanya Admin Utama yang bisa mengubah akun ini' });
        }

        const updates = {};
        if (fullName) {
            updates.full_name = fullName;
            updates.avatar = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        }
        if (email) updates.email = email.toLowerCase();
        if (roleId) updates.role_id = roleId;
        if (status) updates.status = status;
        if (permissions !== undefined) updates.permissions = permissions;
        
        // Update password kalau diisi
        if (password) {
            updates.password_hash = await bcrypt.hash(password, 10);
        }

        await user.update(updates);

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'UPDATE_USER',
            details: `Mengupdate user: ${user.email}`
        });

        res.json(formatUser(user));
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengupdate user' });
    }
});

// Hapus user
router.delete('/users/:id', authenticateToken, requirePermission('pengaturan', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        if (id === 'user_admin' || id === req.user.userId) {
            return res.status(400).json({ error: 'Tidak dapat menghapus admin utama atau diri sendiri' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

        await user.destroy();

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'DELETE_USER',
            details: `Menghapus user: ${user.email}`
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Gagal menghapus user' });
    }
});

// ─── ROLES ────────────────────────────────────────────────────────

router.get('/roles', authenticateToken, requirePermission('pengaturan', 'view'), async (req, res) => {
    try {
        const roles = await Role.findAll({ order: [['created_at', 'ASC']] });
        res.json(roles.map(r => ({
            id: r.id,
            name: r.name,
            isSystem: r.is_system,
            permissions: r.permissions
        })));
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengambil data role' });
    }
});

router.post('/roles', authenticateToken, requirePermission('pengaturan', 'edit'), async (req, res) => {
    try {
        const { name, permissions } = req.body;
        if (!name) return res.status(400).json({ error: 'Nama role wajib diisi' });

        const newRole = await Role.create({
            id: 'role_' + generateId(),
            name,
            is_system: false,
            permissions: permissions || {}
        });

        res.status(201).json({
            id: newRole.id,
            name: newRole.name,
            isSystem: newRole.is_system,
            permissions: newRole.permissions
        });
    } catch (err) {
        res.status(500).json({ error: 'Gagal membuat role' });
    }
});

router.put('/roles/:id', authenticateToken, requirePermission('pengaturan', 'edit'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: 'Role tidak ditemukan' });

        if (role.is_system) {
            // Hanya izinkan update permissions, bukan nama, untuk system role
            if (req.body.permissions) {
                await role.update({ permissions: req.body.permissions });
                return res.json({ id: role.id, name: role.name, isSystem: role.is_system, permissions: role.permissions });
            }
            return res.status(400).json({ error: 'Role sistem tidak dapat diubah namanya' });
        }

        await role.update({
            name: req.body.name || role.name,
            permissions: req.body.permissions || role.permissions
        });

        res.json({ id: role.id, name: role.name, isSystem: role.is_system, permissions: role.permissions });
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengupdate role' });
    }
});

router.delete('/roles/:id', authenticateToken, requirePermission('pengaturan', 'edit'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: 'Role tidak ditemukan' });
        
        if (role.is_system) return res.status(400).json({ error: 'Role sistem tidak dapat dihapus' });

        // Cek apakah ada user yang pakai role ini
        const usersCount = await User.count({ where: { role_id: role.id } });
        if (usersCount > 0) return res.status(400).json({ error: `Tidak dapat dihapus, role ini masih digunakan oleh ${usersCount} user` });

        await role.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Gagal menghapus role' });
    }
});

module.exports = router;
