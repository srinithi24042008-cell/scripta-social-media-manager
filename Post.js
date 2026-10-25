const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  _id: { type: String }, // UUID
  user_id: { type: String, ref: 'User', required: true },

  // Core content
  platform: { type: String, required: false },          // primary platform (backward compat)
  platforms: [{ type: String }],                        // multi-platform list
  content: { type: String, default: '' },
  hashtags: [{ type: String }],                         // extracted hashtag list

  // Status lifecycle
  status: { type: String, enum: ['draft', 'pending_approval', 'scheduled', 'publishing', 'published', 'failed', 'failed_retry', 'failed_permanent'], default: 'draft' },
  approved_by: { type: String, ref: 'User', default: null },
  scheduled_at: { type: Date, default: null },
  published_at: { type: Date, default: null },
  publish_result: { type: String, default: null },
  publish_attempts: { type: Number, default: 0 },

  // Media
  media_path: { type: String, default: null },
  media_type: { type: String, default: null },          // 'image' | 'video'
  video_url: { type: String, default: null },
  video_duration: { type: Number, default: null },
  video_thumbnail: { type: String, default: null },

  // Organisation
  organizationId: { type: String, ref: 'Organization', default: null },
  campaign_id: { type: String, default: null },
  brand_voice_id: { type: String, default: null },
  approvedBy: { type: String, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },

  assigned_to: { type: String, default: null },
  reviewers: [{ type: String }],
  timezone: { type: String, default: 'UTC' },

  // AI metadata
  ai_generated: { type: Boolean, default: false },
  ai_metadata: { type: Object, default: {} },

  // Scheduling
  auto_scheduled: { type: Boolean, default: false },

  // Auto-save tracking
  auto_saved_at: { type: Date, default: null },

  // Comments
  comments: [{ type: String, ref: 'Comment' }],

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Keep updated_at in sync
postSchema.pre('findOneAndUpdate', function () {
  this.set({ updated_at: new Date() });
});

// ── Indexes ────────────────────────────────────────────────────────────────────
// Composite index for scheduler cron — queries scheduled/failed_retry posts due to publish.
// Without this index, every 60-second scheduler tick does a full collection scan.
postSchema.index({ status: 1, scheduled_at: 1 });

// Index for per-user post listing with status filter
postSchema.index({ user_id: 1, status: 1 });

// Index for organization-scoped post queries
postSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model('Post', postSchema);
