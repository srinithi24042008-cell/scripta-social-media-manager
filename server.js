require('dotenv').config();

// ── Startup Environment Validation ───────────────────────────────────────────
// Must run before any other module that reads process.env.
// Fail fast with a clear error if TRULY critical variables are missing.
// GEMINI_API_KEY is optional — if not set, AI features are disabled gracefully.

const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI'];

const OPTIONAL_ENV = [
  'GEMINI_API_KEY',
  'META_APP_ID', 'META_APP_SECRET',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS',
  'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET',
  'LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_REDIRECT_URI',
  'FRONTEND_URL',
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║          FATAL: Missing required environment variables    ║');
    console.error('╠══════════════════════════════════════════════════════════╣');
    missing.forEach(key => {
      console.error(`║  ✗ ${key.padEnd(54)}║`);
    });
    console.error('╠══════════════════════════════════════════════════════════╣');
    console.error('║  Copy .env.example → .env and fill in all required keys  ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  const missingOptional = OPTIONAL_ENV.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn('[startup] Optional env vars not set (some features may be disabled):',
      missingOptional.join(', '));
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              Scripta Backend — Startup Check             ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  REQUIRED_ENV.forEach(key => {
    console.log(`║  ✓ ${key.padEnd(54)}║`);
  });
  if (process.env.GEMINI_API_KEY) {
    console.log(`║  ✓ ${'GEMINI_API_KEY (AI features enabled)'.padEnd(54)}║`);
  } else {
    console.log(`║  ⚠ ${'GEMINI_API_KEY not set — AI features disabled'.padEnd(54)}║`);
  }
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

validateEnv();

// ── Connect to MongoDB (wait before listening) ───────────────────────────────
const { dbPromise, mongoose } = require('./db');

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');

const { logger, requestLogger } = require('./utils/logger');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const brandRoutes = require('./routes/brand');
const accountsRoutes = require('./routes/accounts');
const postsRoutes = require('./routes/posts');
const mediaRoutes = require('./routes/media');
const notificationsRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const organizationRoutes = require('./routes/organizations');

const analyticsRoutes = require('./routes/analytics');
const instagramRoutes = require('./routes/instagram');
const facebookRoutes = require('./routes/facebook');
const youtubeRoutes = require('./routes/youtube');
const linkedinRoutes = require('./routes/linkedin');
const { startScheduler } = require('./scheduler');
const { initSocketIO } = require('./services/websocketService');

const app = express();

app.set('trust proxy', 1);

// Enable Gzip/Brotli response compression
// threshold: skip compression for responses smaller than 1KB (not worth the CPU cost)
app.use(compression({ threshold: 1024 }));

// Security HTTP headers (Helmet)
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:", "https://res.cloudinary.com"],
        connectSrc: [
          "'self'", 
          "ws:", 
          "wss:", 
          "https://fonts.googleapis.com", 
          "https://fonts.gstatic.com", 
          "https://generativelanguage.googleapis.com",
          "https://api.cloudinary.com"
        ],
        frameSrc: ["'self'", "https://accounts.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    // Apply HSTS strictly in production mode only
    hsts: isProduction ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    frameguard: { action: 'sameorigin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
  })
);

// Additional security header middleware
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' })); // Allow images from backend to frontend

// ── CORS Configuration ───────────────────────────────────────────────────────
// Only allow requests from explicitly configured frontend origins.
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser calls (e.g. mobile apps, curl, server-to-server) without origin header
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked request from disallowed origin: ${origin}`);
    callback(new Error(`CORS: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
}));

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Static uploads serving with moderate cache (1 day, non-immutable for active media)
// ETag + Last-Modified allow efficient conditional revalidation (304 Not Modified)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
}));

// ── Health Check ─────────────────────────────────────────────────────────────
// Returns 200 when database is connected, 503 during DB outage.
app.get('/api/health', (req, res) => {
  const healthy = mongoose.connection.readyState === 1;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'error',
    healthy,
  });
});

// Apply rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/brand', apiLimiter, brandRoutes);
app.use('/api/accounts', apiLimiter, accountsRoutes);
app.use('/api/posts', apiLimiter, postsRoutes);
app.use('/api/media', apiLimiter, mediaRoutes);
app.use('/api/notifications', apiLimiter, notificationsRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/organizations', apiLimiter, organizationRoutes);

app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/social/instagram', apiLimiter, instagramRoutes);
app.use('/api/facebook', apiLimiter, facebookRoutes);
app.use('/api/analytics/youtube', apiLimiter, youtubeRoutes);
app.use('/api/linkedin', apiLimiter, linkedinRoutes);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

// ── Global Exception Handlers ─────────────────────────────────────────────────
// Prevent silent crashes from unhandled promise rejections or uncaught exceptions.
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION — shutting down', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// ── Start Server After DB Connection ─────────────────────────────────────────
dbPromise.then(() => {
  const httpServer = http.createServer(app);

  // Attach Socket.IO with JWT authentication
  initSocketIO(httpServer);

  const server = httpServer.listen(PORT, () => {
    logger.info(`Scripta backend running on http://localhost:${PORT}`);
    logger.info(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);

    // Meta OAuth Configuration Validation
    const metaAppId = process.env.META_APP_ID;
    if (!metaAppId) {
      logger.warn('[Meta Auth] META_APP_ID not set — Meta/Instagram OAuth will be unavailable');
    } else if (!/^\d{12,20}$/.test(metaAppId)) {
      logger.warn(`[Meta Auth] META_APP_ID "${metaAppId}" appears invalid (expected 12-20 digits)`);
    } else {
      const maskedId = metaAppId.slice(0, 4) + '*'.repeat(metaAppId.length - 8) + metaAppId.slice(-4);
      logger.info(`[Meta Auth] META_APP_ID configured: ${maskedId}`);
    }

    startScheduler();
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Close HTTP server first, then close Mongoose connection cleanly.
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed.');
      } catch (err) {
        logger.warn('Error closing MongoDB connection:', { error: err.message });
      }
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}).catch(err => {
  logger.error('Failed to connect to DB, server not started:', { error: err.message });
  process.exit(1);
});