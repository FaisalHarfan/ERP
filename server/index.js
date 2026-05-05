// server/index.js — UnityERP Backend API Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const sequelize = require('./config/database');
const seedDefaults = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Parsing Middleware ─────────────
app.use(helmet({ contentSecurityPolicy: false })); // disable CSP for CDN scripts
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/production', require('./routes/production'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/data', require('./routes/crud'));

// ─── Health Check ──────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── Serve Frontend Static Files ───────────────
const frontendPath = path.join(__dirname, '..', 'html-app');
app.use(express.static(frontendPath));

// SPA fallback: serve login.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

// ─── Start Server ──────────────────────────────
async function start() {
    try {
        // Test DB connection
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Sync tables (create if not exist, update if changed)
        await sequelize.sync({ alter: true });
        console.log('✅ Database tables synced');

        // Seed default data
        await seedDefaults();

        // Start listening
        app.listen(PORT, () => {
            console.log(`\n🚀 UnityERP API Server running at http://localhost:${PORT}`);
            console.log(`📁 Frontend served from: ${frontendPath}`);
            console.log(`🔗 API endpoints: http://localhost:${PORT}/api/`);
            console.log(`💚 Health check:  http://localhost:${PORT}/api/health\n`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        console.error('\n📋 Checklist:');
        console.error('  1. Apakah PostgreSQL sudah terinstall dan berjalan?');
        console.error('  2. Apakah database "unityerp" sudah dibuat?');
        console.error('     → Jalankan: CREATE DATABASE unityerp;');
        console.error('  3. Apakah kredensial di file .env sudah benar?');
        console.error('     → DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
        process.exit(1);
    }
}

start();
