const mongoose = require('mongoose');

const brandProfileSchema = new mongoose.Schema({
  user_id: { type: String, ref: 'User', required: true },
  organizationId: { type: String, ref: 'Organization', default: null },
  tone: { type: String, default: '' },
  audience: { type: String, default: '' },
  rules: { type: String, default: '' },
  sample_posts: { type: String, default: '' },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BrandProfile', brandProfileSchema);
