const mongoose = require('mongoose');

const PlatformConfigSchema = new mongoose.Schema({
  platform: { type: String, required: true, unique: true },
  client_id: { type: String, required: true },
  client_secret: { type: String, required: true },
  meta_app_id: { type: String },
  app_id: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlatformConfig', PlatformConfigSchema);
