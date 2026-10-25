// Generic retry utility with exponential backoff.
// Used for transient API failures (rate limits, network errors, etc.)

const { logger } = require('./logger');

/**
 * Retry an async function with exponential backoff.
 *
 * @param {Function} fn - Async function to retry.
 * @param {Object} options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3).
 * @param {number} options.baseDelay - Base delay in ms (default: 1000).
 * @param {number} options.maxDelay - Max delay in ms (default: 30000).
 * @param {Function} options.shouldRetry - Fn(error) => boolean. Return false to stop retrying.
 * @param {string} options.context - Description for logging.
 * @returns {Promise<*>}
 */
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    context = 'operation',
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries) {
        logger.error(`${context}: All ${maxRetries + 1} attempts failed`, {
          error: error.message,
        });
        break;
      }

      if (!shouldRetry(error)) {
        logger.warn(`${context}: Non-retryable error, stopping`, {
          error: error.message,
        });
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = delay * 0.1 * Math.random();
      const totalDelay = Math.round(delay + jitter);

      logger.warn(`${context}: Attempt ${attempt + 1} failed, retrying in ${totalDelay}ms`, {
        error: error.message,
        attempt: attempt + 1,
        maxRetries,
      });

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

/**
 * fetch() with an enforced timeout so a hung upstream API can't block
 * a scheduler tick or request indefinitely.
 *
 * @param {string} url
 * @param {Object} options - Standard fetch options.
 * @param {number} timeoutMs - Abort after this many ms (default: 10000).
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(url, { ...options, signal });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(`Request to ${new URL(url).hostname} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

module.exports = { retry, fetchWithTimeout };
