// server/index.js — UnityERP Backend API Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const sequelize = require('./config/database');
const seedDefaults = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ─── Security Headers (Helmet) ─────────────────
// CSP: Untuk sementara dinonaktifkan karena blocking inline scripts
// TODO: Refactor frontend untuk CSP-compliant (pindahkan inline scripts ke file terpisah)
app.use(helmet({
    contentSecurityPolicy: false, // Nonaktifkan CSP untuk sementara
    crossOriginEmbedderPolicy: false // izinkan load resource eksternal
}));

// ─── CORS ──────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Izinkan request tanpa origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' tidak diizinkan`));
    },
    credentials: true
}));

// ─── Rate Limiting ─────────────────────────────
// Login: max 20 percobaan per 15 menit per IP (dinaikkan)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
    skipSuccessfulRequests: true // hanya hitung yang gagal
});

// API umum: rate limit longgar untuk mencegah 429 error
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2000, // 2000 request per menit (sangat longgar)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak request. Coba lagi sebentar.' },
    skip: (req) => !isProd // Skip di development
});

// ─── Logging & Parsing ─────────────────────────
app.use(isProd ? morgan('combined') : morgan('short'));
app.use(express.json({ limit: '1mb' }));        // turun dari 10mb
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── No-Cache for API ──────────────────────────
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// ─── API Routes ────────────────────────────────
app.use('/api/auth/login', loginLimiter);       // rate limit khusus login
app.use('/api', apiLimiter);                    // rate limit umum semua API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/production', require('./routes/production'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/data', require('./routes/crud'));

// ─── Health Check (hanya di non-production atau dengan token) ──
app.get('/api/health', (req, res) => {
    // Di production, sembunyikan detail env
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Global Error Handler ──────────────────────
app.use((err, req, res, next) => {
    // Jangan bocorkan stack trace ke client di production
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: isProd ? 'Terjadi kesalahan pada server.' : err.message
    });
});

// ─── Serve Frontend Static Files ───────────────
const frontendPath = path.join(__dirname, '..', 'html-app');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

// ─── Start Server ──────────────────────────────
async function start() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Production: jangan alter tabel otomatis — gunakan migrasi manual
        // Development: alter: true untuk kemudahan development
        await sequelize.sync({ alter: !isProd });
        console.log(`✅ Database tables synced (alter: ${!isProd})`);

        await seedDefaults();

        app.listen(PORT, () => {
            console.log(`\n🚀 UnityERP API Server running at http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
            console.log(`📁 Frontend served from: ${frontendPath}`);
            console.log(`🔗 API endpoints: http://localhost:${PORT}/api/`);
            console.log(`💚 Health check:  http://localhost:${PORT}/api/health\n`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        console.error('\n📋 Checklist:');
        console.error('  1. Apakah PostgreSQL sudah terinstall dan berjalan?');
        console.error('  2. Apakah database sudah dibuat?');
        console.error('  3. Apakah kredensial di file .env sudah benar?');
        process.exit(1);
    }
}

start();
