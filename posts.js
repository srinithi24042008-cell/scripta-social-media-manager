const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Post = require('../models/Post');
const BrandProfile = require('../models/BrandProfile');
const SocialAccount = require('../models/SocialAccount');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext } = require('../middleware/workspace');
const { generatePosts } = require('../services/aiService');
const { publish } = require('../services/publishService');
const { createNotification } = require('../services/notificationService');
const router = express.Router();
router.use(requireAuth);
router.use(workspaceContext);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip MongoDB operator characters from a string query param.
 * Prevents NoSQL injection via req.query (e.g. ?status[$gt]=scheduled).
 */
const ALLOWED_POST_STATUSES = new Set([
  'draft', 'pending_approval', 'scheduled', 'publishing',
  'published', 'failed', 'failed_retry', 'failed_permanent'
]);

function sanitizeQueryString(value) {
  if (typeof value !== 'string') return undefined;
  // Remove $ signs and curly braces that form MongoDB operators
  return value.replace(/[${}]/g, '').trim().slice(0, 200);
}

/**
 * Build a consistent post update/create payload from request body.

 * Handles both legacy single-platform and new multi-platform usage.
 */
function buildPostPayload(body) {
  const {
    platform,
    platforms,
    content,
    hashtags,
    scheduled_at,
    media_path,
    media_type,
    campaign_id,
    brand_voice_id,
    timezone,
    ai_generated,
    ai_metadata,
  } = body;

  const payload = {};

  // Primary platform (required for publish service compat)
  if (platform !== undefined) payload.platform = platform;
  if (platforms !== undefined) payload.platforms = Array.isArray(platforms) ? platforms : [platforms];

  if (content !== undefined) payload.content = content;
  if (hashtags !== undefined) payload.hashtags = Array.isArray(hashtags) ? hashtags : [];
  if (scheduled_at !== undefined) payload.scheduled_at = scheduled_at || null;
  if (media_path !== undefined) payload.media_path = media_path || null;
  if (media_type !== undefined) payload.media_type = media_type || null;
  if (campaign_id !== undefined) payload.campaign_id = campaign_id || null;
  if (brand_voice_id !== undefined) payload.brand_voice_id = brand_voice_id || null;
  if (timezone !== undefined) payload.timezone = timezone || 'UTC';
  if (ai_generated !== undefined) payload.ai_generated = Boolean(ai_generated);
  if (ai_metadata !== undefined) payload.ai_metadata = ai_metadata || {};

  return payload;
}

// ── Smart Scheduling ──────────────────────────────────────────────────────────

/**
 * GET /posts/smart-schedule?platform=instagram&timezone=Asia/Kolkata
 *
 * Returns 3 AI-recommended posting time slots based on platform-specific
 * engagement research data + current day-of-week + timezone.
 */
router.get('/smart-schedule', async (req, res) => {
  const { platform = 'instagram', timezone = 'UTC', caption = '', topic = '' } = req.query;
  const { suggestBestTime } = require('../services/geminiService');

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = formatter.format(now);

    // Try Gemini AI first
    const geminiRes = await suggestBestTime({
      platforms: [platform],
      audience: 'General',
      timezone,
      caption,
      topic,
    }).catch(() => null);

    if (geminiRes && Array.isArray(geminiRes.suggestions) && geminiRes.suggestions.length > 0) {
      const platformSug = geminiRes.suggestions.find(s => s.platform.toLowerCase() === platform.toLowerCase()) || geminiRes.suggestions[0];
      if (platformSug && Array.isArray(platformSug.bestTimes) && platformSug.bestTimes.length > 0) {
        const slots = platformSug.bestTimes.map((bt, idx) => {
          let hourStr = '12';
          let minStr = '00';
          if (bt.time && bt.time.includes(':')) {
            const parts = bt.time.split(':');
            hourStr = parts[0].padStart(2, '0');
            minStr = parts[1].slice(0, 2).padStart(2, '0');
          }

          let targetDate = new Date(`${todayStr}T${hourStr}:${minStr}:00`);
          if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 1);
          }

          const hNum = parseInt(hourStr, 10);
          const ampm = hNum >= 12 ? 'PM' : 'AM';
          const h12 = hNum % 12 || 12;
          const displayTime = bt.display_time || `${String(h12).padStart(2, '0')}:${minStr} ${ampm}`;

          return {
            rank: idx + 1,
            label: bt.label || 'Peak Engagement',
            datetime: targetDate.toISOString(),
            display_time: displayTime,
            time: `${hourStr}:${minStr}`,
            engagement_score: bt.engagementScore || bt.engagement_score || 92,
            reason: bt.reason || `Optimal engagement window for ${platform}`,
          };
        });

        return res.json({ platform, slots, is_ai_generated: true });
      }
    }

    // Fallback research windows if Gemini service is offline
    const PLATFORM_WINDOWS = {
      instagram: [
        { hour: 11, label: 'Lunch Break', engagement: 88 },
        { hour: 18, label: 'Evening Peak', engagement: 94 },
        { hour: 20, label: 'Prime Time', engagement: 91 },
      ],
      facebook: [
        { hour: 9, label: 'Morning', engagement: 82 },
        { hour: 13, label: 'Lunch', engagement: 88 },
        { hour: 19, label: 'Evening', engagement: 85 },
      ],
      x: [
        { hour: 8, label: 'Morning Commute', engagement: 79 },
        { hour: 12, label: 'Midday', engagement: 84 },
        { hour: 17, label: 'End of Day', engagement: 91 },
      ],
      linkedin: [
        { hour: 8, label: 'Pre-Work', engagement: 87 },
        { hour: 12, label: 'Lunch', engagement: 91 },
        { hour: 17, label: 'Post-Work', engagement: 83 },
      ],
      youtube: [
        { hour: 14, label: 'Afternoon Upload', engagement: 89 },
        { hour: 18, label: 'Evening Prime', engagement: 95 },
        { hour: 21, label: 'Late Night Peak', engagement: 90 },
      ],
      default: [
        { hour: 9, label: 'Morning', engagement: 80 },
        { hour: 14, label: 'Afternoon', engagement: 85 },
        { hour: 19, label: 'Evening', engagement: 88 },
      ],
    };

    const windows = PLATFORM_WINDOWS[platform] || PLATFORM_WINDOWS.default;
    const slots = windows.map((w, idx) => {
      const hourStr = String(w.hour).padStart(2, '0');
      let targetDate = new Date(`${todayStr}T${hourStr}:00:00`);
      if (targetDate <= now) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      const hNum = w.hour;
      const ampm = hNum >= 12 ? 'PM' : 'AM';
      const h12 = hNum % 12 || 12;

      return {
        rank: idx + 1,
        label: w.label,
        datetime: targetDate.toISOString(),
        display_time: `${String(h12).padStart(2, '0')}:00 ${ampm}`,
        time: `${hourStr}:00`,
        engagement_score: w.engagement,
        reason: `${w.label} — high audience activity on ${platform}`,
      };
    });

    res.json({ platform, slots, is_ai_generated: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List Posts ────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    // Sanitize query params before passing to MongoDB to prevent NoSQL injection
    const rawStatus = sanitizeQueryString(req.query.status);
    const rawCampaignId = sanitizeQueryString(req.query.campaign_id);
    const from = sanitizeQueryString(req.query.from);
    const to = sanitizeQueryString(req.query.to);

    const filter = { ...req.workspaceFilter };

    // Only apply status if it matches a known enum value (whitelist)
    if (rawStatus && ALLOWED_POST_STATUSES.has(rawStatus)) {
      filter.status = rawStatus;
    }

    // campaign_id must be alphanumeric to be a safe ID
    if (rawCampaignId && /^[a-zA-Z0-9_-]{1,100}$/.test(rawCampaignId)) {
      filter.campaign_id = rawCampaignId;
    }

    if (from || to) {
      const rangeFilter = {};
      if (from) rangeFilter.$gte = new Date(from);
      if (to) rangeFilter.$lte = new Date(to);
      filter.$or = [
        { scheduled_at: null, published_at: null },
        {
          $or: [
            { $and: [{ scheduled_at: { $ne: null } }, { scheduled_at: rangeFilter }] },
            { $and: [{ scheduled_at: null }, { published_at: rangeFilter }] },
          ],
        },
      ];
    }

    const posts = await Post.find(filter).sort({ created_at: -1 }).lean();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── Generate Posts (AI) ───────────────────────────────────────────────────────

router.post('/generate', async (req, res) => {
  const { idea, platforms } = req.body;

  if (!idea || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'idea (string) and platforms (non-empty array) are required' });
  }

  let brandProfile = await BrandProfile.findOne(req.workspaceFilter).lean();
  if (!brandProfile) brandProfile = { tone: '', audience: '', rules: '', sample_posts: '' };

  try {
    const posts = await generatePosts({ idea, platforms, brandProfile });
    res.json({ posts });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── Create Post ───────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot create posts' });
  }

  try {
    let status = req.body.status || (req.body.scheduled_at ? 'scheduled' : 'draft');
    let { platform, content } = req.body;

    if (req.userRole === 'editor') {
      if (status === 'scheduled' || status === 'pending_approval') {
        status = 'pending_approval';
      }
    }

    if (status === 'draft') {
      if (!platform) platform = 'instagram'; // default fallback for drafts
      if (content === undefined || content === null) content = '';
    } else {
      if (!platform || !content || !content.trim()) {
        return res.status(400).json({ error: 'platform and content are required' });
      }
    }

    const orgId = req.workspace === 'personal' ? null : req.workspace;
    const payload = buildPostPayload({ ...req.body, platform, content });
    const targetPlatforms = payload.platforms && payload.platforms.length > 0 ? payload.platforms : [payload.platform];

    if (targetPlatforms.length > 1) {
      const createdPosts = [];
      for (const p of targetPlatforms) {
        const id = uuidv4();
        const post = await Post.create({
          _id: id,
          user_id: req.userId,
          status,
          ...payload,
          platform: p,
          platforms: [p],
          organizationId: orgId,
        });
        createdPosts.push(post);
      }
      
      if (status === 'scheduled') {
        await createNotification(req.userId, 'success', 'Post scheduled successfully.', null, orgId);
      } else if (status === 'pending_approval') {
        await createNotification(req.userId, 'info', 'Post submitted for approval.', null, orgId);
      }
      return res.status(201).json({ post: createdPosts[0], posts: createdPosts });
    } else {
      const id = uuidv4();
      await Post.create({
        _id: id,
        user_id: req.userId,
        status,
        ...payload,
        platform: targetPlatforms[0],
        platforms: targetPlatforms,
        organizationId: orgId,
      });

      const post = await Post.findById(id).lean();
      if (status === 'scheduled') {
        await createNotification(req.userId, 'success', 'Post scheduled successfully.', null, orgId);
      } else if (status === 'pending_approval') {
        await createNotification(req.userId, 'info', 'Post submitted for approval.', null, orgId);
      }
      return res.status(201).json({ post, posts: [post] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Post ───────────────────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot edit posts' });
  }

  try {
    const existing = await Post.findOne({ _id: req.params.id, ...req.workspaceFilter });
    if (!existing) return res.status(404).json({ error: 'Post not found' });

    if (existing.status === 'published') {
      return res.status(400).json({ error: 'Cannot edit a post that has already been published' });
    }

    const payload = buildPostPayload(req.body);

    if (payload.scheduled_at !== undefined) {
      payload.status = payload.scheduled_at ? 'scheduled' : 'draft';
    }

    if (req.userRole === 'editor') {
      if (payload.status === 'scheduled' || payload.status === 'pending_approval') {
        payload.status = 'pending_approval';
      }
    }

    if (req.body.auto_save) {
      payload.auto_saved_at = new Date();
    }

    const orgId = req.workspace === 'personal' ? null : req.workspace;
    const targetPlatforms = payload.platforms && payload.platforms.length > 0 ? payload.platforms : (existing.platforms && existing.platforms.length > 0 ? existing.platforms : [existing.platform]);

    if (payload.status === 'scheduled' && targetPlatforms.length > 1) {
      const createdPosts = [];
      for (let i = 0; i < targetPlatforms.length; i++) {
        const p = targetPlatforms[i];
        if (i === 0) {
          const updated = await Post.findByIdAndUpdate(req.params.id, {
            ...payload,
            platform: p,
            platforms: [p],
          }, { returnDocument: 'after', lean: true });
          createdPosts.push(updated);
        } else {
          const id = uuidv4();
          const newPost = await Post.create({
            ...existing.toObject(),
            ...payload,
            _id: id,
            platform: p,
            platforms: [p],
            status: 'scheduled',
            organizationId: orgId,
          });
          createdPosts.push(newPost);
        }
      }
      
      if (payload.status === 'scheduled' && existing.status === 'scheduled') {
        await createNotification(req.userId, 'success', 'Scheduled post updated.', null, orgId);
      } else if (payload.status === 'scheduled' && existing.status !== 'scheduled') {
        await createNotification(req.userId, 'success', 'Post scheduled successfully.', null, orgId);
      } else if (payload.status === 'draft' && existing.status === 'scheduled') {
        await createNotification(req.userId, 'info', 'Scheduled post cancelled.', null, orgId);
      }
      
      return res.json({ post: createdPosts[0], posts: createdPosts });
    } else {
      const post = await Post.findByIdAndUpdate(req.params.id, {
        ...payload,
        platforms: targetPlatforms,
        platform: targetPlatforms[0] || existing.platform
      }, { returnDocument: 'after', lean: true });
      
      if (payload.status === 'scheduled' && existing.status === 'scheduled') {
        await createNotification(req.userId, 'success', 'Scheduled post updated.', null, orgId);
      } else if (payload.status === 'scheduled' && existing.status !== 'scheduled') {
        await createNotification(req.userId, 'success', 'Post scheduled successfully.', null, orgId);
      } else if (payload.status === 'draft' && existing.status === 'scheduled') {
        await createNotification(req.userId, 'info', 'Scheduled post cancelled.', null, orgId);
      } else if (payload.status === 'pending_approval') {
        await createNotification(req.userId, 'info', 'Post submitted for approval.', null, orgId);
      }

      return res.json({ post });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Publish Now ───────────────────────────────────────────────────────────────

router.post('/:id/publish-now', async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can publish posts immediately.' });
  }

  try {
    const post = await Post.findOne({ _id: req.params.id, ...req.workspaceFilter });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const targetPlatforms = post.platforms && post.platforms.length > 0 ? post.platforms : [post.platform];
    const orgId = req.workspace === 'personal' ? null : req.workspace;

    if (targetPlatforms.length > 1) {
      const results = [];
      let primaryUpdatedPost = null;

      for (let i = 0; i < targetPlatforms.length; i++) {
        const platform = targetPlatforms[i];
        let postToPublish;

        if (i === 0) {
          post.platform = platform;
          post.platforms = [platform];
          await post.save();
          postToPublish = post;
        } else {
          const id = uuidv4();
          postToPublish = await Post.create({
            ...post.toObject(),
            _id: id,
            platform,
            platforms: [platform],
            status: 'draft',
            organizationId: orgId,
          });
        }

        const account = await SocialAccount.findOne({ platform: postToPublish.platform, ...req.workspaceFilter });
        if (!account) {
          await Post.findByIdAndUpdate(postToPublish._id, {
            status: 'failed',
            publish_result: `No connected ${postToPublish.platform} account.`,
          });
          results.push({ platform, success: false, message: `No connected ${postToPublish.platform} account.` });
          if (i === 0) primaryUpdatedPost = await Post.findById(postToPublish._id).lean();
          continue;
        }

        await Post.findByIdAndUpdate(postToPublish._id, {
          status: 'publishing',
          publish_attempts: (postToPublish.publish_attempts || 0) + 1,
        });
        
        const result = await publish(postToPublish.toObject(), account.toObject());
        const updated = await Post.findByIdAndUpdate(
          postToPublish._id,
          {
            status: result.success ? 'published' : 'failed',
            published_at: result.success ? new Date() : null,
            publish_result: result.message,
          },
          { returnDocument: 'after', lean: true }
        );

        if (i === 0) primaryUpdatedPost = updated;
        results.push({ platform, success: result.success, message: result.message });
        
        await createNotification(
          req.userId,
          result.success ? 'success' : 'error',
          result.success
            ? `Post published successfully to ${platform} as @${account.handle}.`
            : `Publishing to ${platform} failed: ${result.message}`,
          postToPublish._id,
          orgId
        );
      }

      const allSuccess = results.every(r => r.success);
      return res.json({
        post: primaryUpdatedPost,
        result: {
          success: allSuccess,
          message: results.map(r => `${r.platform}: ${r.message}`).join(' | '),
          details: results
        }
      });
    } else {
      const account = await SocialAccount.findOne({ platform: post.platform, ...req.workspaceFilter });
      if (!account) {
        return res.status(400).json({ error: `No connected ${post.platform} account. Connect one first.` });
      }

      await Post.findByIdAndUpdate(post._id, {
        status: 'publishing',
        publish_attempts: (post.publish_attempts || 0) + 1,
      });
      
      const result = await publish(post.toObject(), account.toObject());

      const updated = await Post.findByIdAndUpdate(
        post._id,
        {
          status: result.success ? 'published' : 'failed',
          published_at: result.success ? new Date() : null,
          publish_result: result.message,
        },
        { returnDocument: 'after', lean: true }
      );
      
      await createNotification(
        req.userId,
        result.success ? 'success' : 'error',
        result.success
          ? `Post published successfully to ${account.platform} as @${account.handle}.`
          : `Publishing to ${account.platform} failed: ${result.message}`,
        post._id,
        orgId
      );

      res.json({ post: updated, result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Approve Post (Admin Only) ──────────────────────────────────────────────────

router.post('/:id/approve', async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can approve posts.' });
  }
  try {
    const post = await Post.findOne({ _id: req.params.id, ...req.workspaceFilter });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Post is not pending approval.' });
    }

    const orgId = req.workspace === 'personal' ? null : req.workspace;
    post.approvedBy = req.userId;
    post.approvedAt = new Date();

    if (post.scheduled_at) {
      post.status = 'scheduled';
      await post.save();
      await createNotification(post.user_id, 'success', `Your scheduled post has been approved.`, post._id, orgId);
      return res.json({ success: true, post });
    } else {
      // Publish immediately
      const account = await SocialAccount.findOne({ platform: post.platform, ...req.workspaceFilter });
      if (!account) {
        return res.status(400).json({ error: `No connected ${post.platform} account found to publish.` });
      }
      post.status = 'publishing';
      await post.save();
      
      await createNotification(post.user_id, 'info', `Approved post is being published to ${post.platform}...`, post._id, orgId);
      const result = await publish(post.toObject(), account.toObject());
      
      post.status = result.success ? 'published' : 'failed';
      post.published_at = result.success ? new Date() : null;
      post.publish_result = result.message;
      await post.save();

      await createNotification(
        post.user_id,
        result.success ? 'success' : 'error',
        result.success
          ? `Approved post published successfully to ${post.platform} as @${account.handle}.`
          : `Publishing approved post failed: ${result.message}`,
        post._id,
        orgId
      );
      return res.json({ success: result.success, post, result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reject Post (Admin Only) ───────────────────────────────────────────────────

router.post('/:id/reject', async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can reject posts.' });
  }
  try {
    const post = await Post.findOne({ _id: req.params.id, ...req.workspaceFilter });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Post is not pending approval.' });
    }

    const orgId = req.workspace === 'personal' ? null : req.workspace;
    post.status = 'draft';
    await post.save();

    await createNotification(post.user_id, 'info', `Your post was rejected by an administrator.`, post._id, orgId);
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Post ───────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot delete posts.' });
  }
  try {
    const result = await Post.deleteOne({ _id: req.params.id, ...req.workspaceFilter });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
