const { AppError } = require('./errorHandler');

/**
 * Basic validation middleware to ensure required fields are present.
 * Also sanitizes string values (trimming and stripping MongoDB operators).
 */
function validateSchema(schema) {
  return (req, res, next) => {
    const { body } = req;
    const errors = [];

    // Sanitize strings: trim whitespace and strip MongoDB operator characters
    for (const key in body) {
      if (typeof body[key] === 'string') {
        body[key] = body[key].trim();
      }
    }

    // Required fields check
    if (schema.required) {
      for (const field of schema.required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
          errors.push(`${field} is required`);
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
    }

    next();
  };
}

/**
 * Sanitize a value from req.body or req.query to remove MongoDB injection operators.
 * Recursively removes keys that start with '$' from objects.
 * @param {*} value
 * @returns sanitized value
 */
function sanitizeInput(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    // Strip leading $ to prevent operator injection in string values
    return value.replace(/[$]/g, '').trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }

  if (typeof value === 'object') {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      // Skip keys that are MongoDB operators (e.g. $gt, $where, $regex)
      if (key.startsWith('$')) continue;
      cleaned[key] = sanitizeInput(value[key]);
    }
    return cleaned;
  }

  return value;
}

/**
 * Validate that a string looks like a UUID v4.
 */
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Validate that a string is a safe alphanumeric ID (UUID or short key).
 */
function isValidId(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,128}$/.test(str);
}

/** Helper to strip dangerous HTML tags (basic XSS prevention if needed) */
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

module.exports = { validateSchema, sanitizeInput, sanitizeHtml, isValidUUID, isValidId };
