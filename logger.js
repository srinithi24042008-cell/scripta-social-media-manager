// Structured logger utility — no external dependencies.
// Provides leveled logging with timestamps and optional context.
// Default log level is 'info' in production and 'debug' in development.

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

// Default to 'info' in production to avoid noisy debug output, 'debug' in dev
const DEFAULT_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || DEFAULT_LEVEL] ?? 1;

const COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

function formatTimestamp() {
  return new Date().toISOString();
}

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;

  const color = COLORS[level] || COLORS.reset;
  const prefix = `${color}[${level.toUpperCase()}]${COLORS.reset}`;
  const timestamp = `\x1b[90m${formatTimestamp()}\x1b[0m`;

  const metaStr = Object.keys(meta).length > 0
    ? ` ${JSON.stringify(meta)}`
    : '';

  console.log(`${timestamp} ${prefix} ${message}${metaStr}`);
}

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};

/**
 * Express middleware that logs each incoming request.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    originalEnd.apply(res, args);
  };

  next();
}

module.exports = { logger, requestLogger };
