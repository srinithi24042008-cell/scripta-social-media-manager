const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  _id: { type: String }, // UUID
  user_id: { type: String, ref: 'User', required: true },
  platform: { type: String, required: true },
  handle: { type: String, required: true },
  status: { type: String, default: 'connected', enum: ['connected', 'expired', 'reconnect_required'] },
  access_token: { type: String, default: null },
  refresh_token: { type: String, default: null },
  token_expiry: { type: Date, default: null },
  app_password: { type: String, default: null },
  profile_name: { type: String, default: null },
  avatar_url: { type: String, default: null },
  followers_count: { type: Number, default: 0 },
  following_count: { type: Number, default: 0 },
  posts_count: { type: Number, default: 0 },
  bio: { type: String, default: null },
  page_id: { type: String, default: null },
  instagram_business_id: { type: String, default: null },
  page_access_token: { type: String, default: null },
  permissions: { type: [String], default: [] },
  account_type: { type: String, enum: ['business', 'creator', 'personal', 'linkedin_page', 'linkedin_profile', null], default: null },
  linkedin_person_urn: { type: String, default: null },
  linkedin_organization_urn: { type: String, default: null },
  organizationId: { type: String, ref: 'Organization', default: null },
  last_synced_at: { type: Date, default: Date.now },
  error_message: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  connected_at: { type: Date, default: Date.now },
});

// Indexes for common queries
socialAccountSchema.index({ user_id: 1, platform: 1 });
socialAccountSchema.index({ status: 1 });
// Organization workspace queries (used by scheduler and publish-now flow)
socialAccountSchema.index({ organizationId: 1, platform: 1 });

module.exports = mongoose.model('SocialAccount', socialAccountSchema);
