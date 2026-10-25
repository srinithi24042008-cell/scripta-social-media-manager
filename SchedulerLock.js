const mongoose = require('mongoose');

// One document per named lock (e.g. "due-posts-tick"). Acquired via an
// upsert that only succeeds if no lock exists or the existing one expired —
// see utils/distributedLock.js. This is what lets the cron scheduler run
// safely on more than one backend instance without double-publishing posts.
const schedulerLockSchema = new mongoose.Schema({
  _id: { type: String }, // lock name
  lockedBy: { type: String, required: true },
  lockedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model('SchedulerLock', schedulerLockSchema);
