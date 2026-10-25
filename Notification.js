const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  _id: { type: String }, // UUID
  user_id: { type: String, ref: 'User', required: true },
  type: { type: String, enum: ['success', 'error', 'info'], required: true },
  message: { type: String, required: true },
  post_id: { type: String, ref: 'Post', default: null },
  read: { type: Boolean, default: false },
  organizationId: { type: String, ref: 'Organization', default: null },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
