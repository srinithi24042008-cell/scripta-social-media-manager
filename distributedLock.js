const crypto = require('crypto');
const SchedulerLock = require('../models/SchedulerLock');

// Stable per-process identifier, used so we only ever release a lock we
// actually hold (never someone else's, even across a stale-lock race).
const INSTANCE_ID = `${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

/**
 * Try to acquire a named lock for `ttlMs`. Returns true if acquired.
 *
 * Safe for multiple backend instances hitting this at the same time:
 * the upsert only inserts when no unexpired lock document exists. If a
 * concurrent instance already holds the lock, the unique _id collides and
 * Mongo throws E11000, which we treat as "someone else has it."
 */
async function acquireLock(name, ttlMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    await SchedulerLock.updateOne(
      {
        _id: name,
        $or: [{ expiresAt: { $lt: now } }, { expiresAt: null }],
      },
      { $set: { lockedBy: INSTANCE_ID, lockedAt: now, expiresAt } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    if (err.code === 11000) return false; // held by another instance
    throw err;
  }
}

/** Release a lock, but only if this process is still the holder. */
async function releaseLock(name) {
  await SchedulerLock.deleteOne({ _id: name, lockedBy: INSTANCE_ID });
}

module.exports = { acquireLock, releaseLock, INSTANCE_ID };
