const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  _id: { type: String }, // UUID
  user_id: { type: String, ref: 'User', required: true },
  name: { type: String, required: true },
  goal: { type: String, default: '' },
  organizationId: { type: String, ref: 'Organization', default: null },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Campaign', campaignSchema);
