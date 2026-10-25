const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String }, // UUID
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, default: '' },
  default_platforms: { type: [String], default: [] },
  notification_preferences: {
    email_notifications: { type: Boolean, default: true },
    push_notifications: { type: Boolean, default: true },
    publish_alerts: { type: Boolean, default: true },
    campaign_updates: { type: Boolean, default: false },
    weekly_digest: { type: Boolean, default: false },
  },
  reset_code: { type: String },
  reset_code_expires_at: { type: Date },
  reset_code_attempts: { type: Number, default: 0 },
  reset_code_locked_until: { type: Date },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
