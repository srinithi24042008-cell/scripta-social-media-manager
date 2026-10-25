const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  _id: { type: String }, // UUID
  user_id: { type: String, ref: 'User', required: true },
  platform: { type: String, required: true }, // e.g., 'linkedin', 'instagram', 'total'
  social_account_id: { type: String, ref: 'SocialAccount', default: null },
  date: { type: String, required: true }, // YYYY-MM-DD for daily metrics
  
  metrics: {
    views: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    engagement_rate: { type: Number, default: 0 },
    profile_visits: { type: Number, default: 0 },
    link_clicks: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    error_message: { type: String, default: null },
  },

  organizationId: { type: String, ref: 'Organization', default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Index to query daily metrics per platform/user easily
analyticsSchema.index({ user_id: 1, platform: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
