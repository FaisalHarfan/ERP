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

// Trust proxy — wajib karena pakai Nginx sebagai reverse proxy
app.set('trust proxy', 1);

// ─── Security Headers (Helmet) ─────────────────
app.use(helmet({
    contentSecurityPolicy: isProd ? {
        directives: {
            defaultSrc:    ["'self'"],
            scriptSrc:     ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],   // izinkan onclick="..." di HTML
            styleSrc:      ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc:       ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc:        ["'self'", "data:", "blob:"],
            connectSrc:    ["'self'", "https://cdn.jsdelivr.net"],
        }
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy:   false,
    crossOriginResourcePolicy: false
}));

// ─── CORS ──────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' tidak diizinkan`));
    },
    credentials: true
}));

// ─── Rate Limiting ─────────────────────────────
// Login: max 10 percobaan gagal per 15 menit per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
    skipSuccessfulRequests: true
});

// ─── Logging & Parsing ─────────────────────────
app.use(isProd ? morgan('combined') : morgan('short'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── No-Cache for API ──────────────────────────
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// ─── API Routes ────────────────────────────────
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/production', require('./routes/production'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/data', require('./routes/crud'));

// ─── Health Check ──────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Global Error Handler ──────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: isProd ? 'Terjadi kesalahan pada server.' : err.message
    });
});

// ─── Serve Frontend Static Files ───────────────
const frontendPath = path.join(__dirname, '..', 'html-app');
app.use(express.static(frontendPath));

app.get('/', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

// ─── Start Server ──────────────────────────────
async function start() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Manual migration to ensure columns exist (Sequelize sync alter can fail sometimes)
        await sequelize.query('ALTER TABLE receipts ADD COLUMN IF NOT EXISTS received_from VARCHAR(255);').catch(e => console.warn('Migration warning receipts:', e.message));
        await sequelize.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_to VARCHAR(255);').catch(e => console.warn('Migration warning expenses:', e.message));

        await sequelize.sync({ alter: !isProd });
        console.log(`✅ Database tables synced (alter: ${!isProd})`);

        // Auto-sync stock transactions dates for Delivery Orders to match their actual DO document date
        try {
            await sequelize.query(`
                UPDATE stock_transactions st
                SET date = COALESCE(
                    (do.data->>'deliveryDate')::timestamptz,
                    (do.data->>'doDate')::timestamptz,
                    (do.data->>'date')::timestamptz,
                    do.created_at
                )
                FROM delivery_orders do
                WHERE (st.reference_id = do.id OR st.reference_id = do.data->>'id')
                  AND (st.reference = 'SALES_OUT' OR st.reference = 'DELIVERY_ORDER')
                  AND (do.data->>'deliveryDate' IS NOT NULL OR do.data->>'doDate' IS NOT NULL OR do.data->>'date' IS NOT NULL);
            `);
        } catch (syncErr) {
            console.warn('DO stock transactions date sync notice:', syncErr.message);
        }

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
