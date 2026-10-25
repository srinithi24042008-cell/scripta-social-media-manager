const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext } = require('../middleware/workspace');
const SocialAccount = require('../models/SocialAccount');
const { decrypt } = require('../services/encryptionService');
const { fetchWithTimeout } = require('../utils/retry');
const { logger } = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);
router.use(workspaceContext);

// ── Helper: LinkedIn API fetch with auth ──────────────────────────────────────
async function liApi(path, token) {
  const res = await fetchWithTimeout(`https://api.linkedin.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.serviceErrorCode || `LinkedIn API error (${res.status})`);
  }
  return data;
}

// ── Middleware: load LinkedIn account ─────────────────────────────────────────
async function requireLinkedIn(req, res, next) {
  try {
    const query = { platform: 'linkedin', status: 'connected', ...req.workspaceFilter };
    const account = await SocialAccount.findOne(query).sort({ updated_at: -1 });
    if (!account || !account.access_token) {
      return res.status(404).json({ error: 'LinkedIn account not connected or missing credentials' });
    }
    req.liAccount = account;
    req.liToken = decrypt(account.access_token);
    next();
  } catch (err) {
    logger.error('[LinkedIn] requireLinkedIn error:', err.message);
    res.status(500).json({ error: 'Failed to load LinkedIn account' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/linkedin/profile
// Returns: id, firstName, lastName, headline, profilePicture, vanityName
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', requireLinkedIn, async (req, res) => {
  try {
    const token = req.liToken;
    let id = req.liAccount.linkedin_person_urn || req.liAccount.handle;
    let firstName = '';
    let lastName = '';
    let pictureUrl = req.liAccount.avatar_url || null;
    let headline = req.liAccount.bio || '';
    let vanityName = req.liAccount.handle || '';

    // 1. Try OIDC /v2/userinfo (works with openid profile scopes)
    try {
      const userinfoRes = await fetchWithTimeout('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userInfo = await userinfoRes.json().catch(() => ({}));
      if (userinfoRes.ok && userInfo.sub) {
        id = userInfo.sub;
        if (userInfo.name) {
          const parts = userInfo.name.split(' ');
          firstName = userInfo.given_name || parts[0] || '';
          lastName = userInfo.family_name || parts.slice(1).join(' ') || '';
        } else {
          firstName = userInfo.given_name || '';
          lastName = userInfo.family_name || '';
        }
        pictureUrl = userInfo.picture || pictureUrl;
      } else {
        // 2. Try legacy /v2/me as fallback
        try {
          const profile = await liApi(
            '/v2/me?projection=(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName,profilePicture(displayImage~:playableStreams))',
            token
          );
          id = profile.id || id;
          firstName = profile.localizedFirstName || firstName;
          lastName = profile.localizedLastName || lastName;
          headline = profile.localizedHeadline || headline;
          vanityName = profile.vanityName || vanityName;
          const elements = profile.profilePicture?.['displayImage~']?.elements || [];
          if (elements.length > 0) {
            pictureUrl = elements[elements.length - 1].identifiers?.[0]?.identifier || pictureUrl;
          }
        } catch (meErr) {
          logger.warn('[LinkedIn] /v2/me fetch failed:', meErr.message);
        }
      }
    } catch (e) {
      logger.warn('[LinkedIn] Profile fetch warning:', e.message);
    }

    // 3. Fallback names from SocialAccount document if API profile fields are empty
    if (!firstName && req.liAccount.profile_name) {
      const parts = req.liAccount.profile_name.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    // Connection count via networkSizes (best-effort)
    let connectionCount = req.liAccount.followers_count || 0;
    if (id) {
      try {
        const sizeRes = await fetchWithTimeout(
          `https://api.linkedin.com/v2/networkSizes/${encodeURIComponent(id)}?edgeType=CompanyFollowedByMember`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        );
        const sizeData = await sizeRes.json().catch(() => ({}));
        connectionCount = sizeData.firstDegreeSize || connectionCount;
      } catch (e) {
        logger.warn('[LinkedIn] Could not fetch connection count:', e.message);
      }
    }

    res.json({
      id,
      firstName: firstName || req.liAccount.profile_name || 'LinkedIn User',
      lastName: lastName || '',
      headline,
      vanityName,
      pictureUrl,
      connectionCount,
      accountHandle: req.liAccount.handle || '',
    });
  } catch (err) {
    logger.error('[LinkedIn] /profile error:', err.message);
    let msg = err.message || 'Failed to fetch LinkedIn profile';
    if (msg.includes('Not enough permissions') || msg.includes('NO_VERSION') || msg.includes('unauthorized') || msg.includes('403')) {
      msg = 'No permission is given for LinkedIn profile access. Please reconnect your account.';
    }
    res.status(500).json({ error: msg });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/linkedin/posts
// Returns recent UGC posts with per-post: text, date, reactions, comments, shares
// ─────────────────────────────────────────────────────────────────────────────
router.get('/posts', requireLinkedIn, async (req, res) => {
  try {
    const token = req.liToken;
    const account = req.liAccount;

    // Build person URN
    const personId = account.linkedin_person_urn || account.handle || null;
    if (!personId) {
      return res.json({ posts: [], message: 'LinkedIn person ID not stored — reconnect to refresh.' });
    }
    const personUrn = `urn:li:person:${personId}`;
    const encodedUrn = encodeURIComponent(personUrn);

    // Fetch recent UGC posts by this author
    let ugcData = { elements: [] };
    try {
      ugcData = await liApi(
        `/v2/ugcPosts?q=authors&authors=List(${encodedUrn})&count=20&sortBy=LAST_MODIFIED`,
        token
      );
    } catch (e) {
      logger.warn('[LinkedIn] ugcPosts fetch error:', e.message);
    }

    const posts = (ugcData.elements || []).map(post => {
      // Extract post text
      let text = '';
      try {
        text = post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '';
      } catch (e) { /* no text */ }

      // Extract timestamp
      const createdAt = post.created?.time
        ? new Date(post.created.time).toISOString()
        : new Date(post.firstPublishedAt || 0).toISOString();

      // Statistics available directly on the UGC post object
      const stats = post.socialDetail || post.statistics || {};
      const reactions = stats.numLikes || stats.totalSocialActivityCounts?.numLikes || 0;
      const comments = stats.numComments || stats.totalSocialActivityCounts?.numComments || 0;
      const shares = stats.numShares || post.numShares || 0;
      const impressions = stats.numImpressions || 0;

      return {
        id: post.id,
        text,
        createdAt,
        reactions,
        comments,
        shares,
        impressions,
        lifecycleState: post.lifecycleState || 'PUBLISHED',
      };
    });

    res.json({ posts });
  } catch (err) {
    logger.error('[LinkedIn] /posts error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch LinkedIn posts' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/linkedin/stats
// Returns aggregated stats: totalPosts, totalReactions, totalComments, totalShares, connectionCount
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', requireLinkedIn, async (req, res) => {
  try {
    const token = req.liToken;
    const account = req.liAccount;

    const personId = account.linkedin_person_urn || account.handle || null;
    let totalPosts = 0, totalReactions = 0, totalComments = 0, totalShares = 0;

    if (personId) {
      const personUrn = `urn:li:person:${personId}`;
      const encodedUrn = encodeURIComponent(personUrn);

      try {
        const ugcData = await liApi(
          `/v2/ugcPosts?q=authors&authors=List(${encodedUrn})&count=50`,
          token
        );
        const elements = ugcData.elements || [];
        totalPosts = ugcData.paging?.total || elements.length;

        elements.forEach(post => {
          const stats = post.socialDetail || post.statistics || {};
          totalReactions += stats.numLikes || stats.totalSocialActivityCounts?.numLikes || 0;
          totalComments += stats.numComments || stats.totalSocialActivityCounts?.numComments || 0;
          totalShares += stats.numShares || post.numShares || 0;
        });
      } catch (e) {
        logger.warn('[LinkedIn] stats ugcPosts error:', e.message);
      }
    }

    // Connection count via networkSizes (best-effort, no restricted scope needed)
    let connectionCount = account.followers_count || 0;
    try {
      if (personId) {
        const sizeRes = await fetchWithTimeout(
          `https://api.linkedin.com/v2/networkSizes/${encodeURIComponent(personId)}?edgeType=CompanyFollowedByMember`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        );
        const sizeData = await sizeRes.json().catch(() => ({}));
        connectionCount = sizeData.firstDegreeSize || connectionCount;
      }
    } catch (e) {
      logger.warn('[LinkedIn] stats connection count error:', e.message);
    }

    res.json({
      connectionCount,
      totalPosts,
      totalReactions,
      totalComments,
      totalShares,
    });
  } catch (err) {
    logger.error('[LinkedIn] /stats error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch LinkedIn stats' });
  }
});

module.exports = router;
