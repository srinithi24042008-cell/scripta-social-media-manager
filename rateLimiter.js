const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

// Auth routes rate limiter — stricter limits to protect login, register, and password flows
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 20 : 1000, // 20 req/15min in production (was 100 — too permissive)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      error: 'Too many authentication attempts. Please try again later.'
    });
  }
});

// Stricter limiter specifically for forgot-password (prevents OTP brute-force / account enumeration)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 100, // Only 5 forgot-password requests per IP per 15 min in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Forgot-password rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      error: 'Too many password reset attempts. Please wait 15 minutes and try again.'
    });
  }
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 10000, // limit each IP per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      error: 'Too many requests. Please try again later.'
    });
  }
});

// Cost-aware limiter for AI/media generation endpoints, which call paid
// third-party APIs (Gemini, Cloudinary) — much tighter than the
// generic API limiter to bound per-IP spend/abuse.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 30 : 1000, // 30 AI/media generations per IP per 15 min in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`AI/media rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      error: 'Too many AI/media generation requests. Please wait a few minutes and try again.'
    });
  }
});

module.exports = { authLimiter, forgotPasswordLimiter, apiLimiter, aiLimiter };
