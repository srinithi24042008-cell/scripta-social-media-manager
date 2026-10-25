const Analytics = require('../models/Analytics');
const SocialAccount = require('../models/SocialAccount');
const { decrypt } = require('./encryptionService');
const { v4: uuidv4 } = require('uuid');
const { fetchWithTimeout } = require('../utils/retry');

async function fbGraphApi(url, options = {}) {
  const res = await fetchWithTimeout(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Facebook API error');
  }
  return data;
}

async function syncAnalyticsForUser(userId, workspaceId = null) {
  const accountFilter = workspaceId
    ? { organizationId: workspaceId, status: 'connected' }
    : { user_id: userId, organizationId: null, status: 'connected' };
  const accounts = await SocialAccount.find(accountFilter);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const results = [];

  for (const account of accounts) {
    const platform = account.platform;
    const token = account.access_token ? decrypt(account.access_token) : null;
    if (!token) continue;

    // Start with empty object — we only set fields that the live API actually returns.
    // This prevents overwriting valid historical data with zeroes on partial failures.
    let metrics = {};

    let fetchedFollowers = false; // track whether the API returned a real value

    try {
      if (platform === 'facebook') {
        const pageId = account.page_id;
        if (!pageId) throw new Error('Missing page_id');

        // Get follower count
        const fbRes = await fbGraphApi(
          `https://graph.facebook.com/v21.0/${pageId}?fields=followers_count,fan_count`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        metrics.followers = fbRes.followers_count || fbRes.fan_count || 0;

        // Get page insights (valid metrics: page_impressions, page_impressions_unique)
        // Note: page_reach is NOT a valid standalone metric — use page_impressions_unique instead
        // We removed page_post_engagements to calculate likes strictly from posts
        try {
          const insightsRes = await fbGraphApi(
            `https://graph.facebook.com/v21.0/${pageId}/insights?metric=page_impressions,page_impressions_unique&period=day`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (insightsRes.data) {
            const imp = insightsRes.data.find(m => m.name === 'page_impressions');
            const reach = insightsRes.data.find(m => m.name === 'page_impressions_unique');
            metrics.impressions = imp?.values?.[0]?.value || 0;
            metrics.reach = reach?.values?.[0]?.value || 0;
          }
        } catch (e) {
          metrics.error_message = e.message.includes('#100') ? 'Facebook API limitation: Could not fetch some metrics.' : `Facebook API error: ${e.message}`;
          if (!e.message.includes('#10') && !e.message.includes('#100')) {
            console.warn('FB Insights error:', e.message);
          }
        }

        // Fetch recent page posts to strictly calculate likes, comments, and shares
        try {
          const postsRes = await fbGraphApi(
            `https://graph.facebook.com/v21.0/${pageId}/posts?fields=likes.summary(true).limit(0),comments.summary(true).limit(0),shares&limit=20`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (postsRes.data) {
            metrics.likes = 0;
            metrics.comments = 0;
            metrics.shares = 0;
            postsRes.data.forEach(post => {
              metrics.likes += post.likes?.summary?.total_count || 0;
              metrics.comments += post.comments?.summary?.total_count || 0;
              metrics.shares += post.shares?.count || 0;
            });
          }
        } catch (e) {
          if (!e.message.includes('#10') && !e.message.includes('#100')) {
            console.warn('FB Posts error:', e.message);
          }
        }

      } else if (platform === 'instagram') {
        const igId = account.instagram_business_id;
        if (!igId || token === 'direct_credentials') {
          metrics.followers = account.followers_count || 0;
          metrics.posts = account.posts_count || 0;
          metrics.error_message = 'Connected via direct credentials. Graph API metrics require Meta OAuth.';
        } else {
          // Get followers and media_count
          const igRes = await fbGraphApi(
            `https://graph.facebook.com/v21.0/${igId}?fields=followers_count,media_count`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          metrics.followers = igRes.followers_count || 0;
          metrics.posts = igRes.media_count || 0;

          // Get Instagram insights (requires instagram_manage_insights permission)
          // Error #10 means the app lacks this permission — skip gracefully and use media-level data instead
          try {
            const insightsRes = await fbGraphApi(
              `https://graph.facebook.com/v21.0/${igId}/insights?metric=impressions,reach,profile_views,website_clicks&period=day`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (insightsRes.data) {
              metrics.impressions = insightsRes.data.find(m => m.name === 'impressions')?.values?.[0]?.value || 0;
              metrics.reach = insightsRes.data.find(m => m.name === 'reach')?.values?.[0]?.value || 0;
              metrics.profile_visits = insightsRes.data.find(m => m.name === 'profile_views')?.values?.[0]?.value || 0;
              metrics.link_clicks = insightsRes.data.find(m => m.name === 'website_clicks')?.values?.[0]?.value || 0;
            }
          } catch (e) {
            if (e.message.includes('#10')) {
            } else {
              metrics.error_message = `Instagram API error: ${e.message}`;
            }
            if (!e.message.includes('#10')) {
              console.warn('IG Insights error:', e.message);
            }
          }

          // Get recent media likes & comments
          try {
            const mediaRes = await fbGraphApi(
              `https://graph.facebook.com/v21.0/${igId}/media?fields=id,like_count,comments_count,media_type,timestamp&limit=20`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (mediaRes.data) {
              metrics.likes = 0;
              metrics.comments = 0;
              mediaRes.data.forEach(m => {
                metrics.likes += m.like_count || 0;
                metrics.comments += m.comments_count || 0;
              });
            }
          } catch (e) {
            console.warn('IG Media error:', e.message);
          }
        }
      } else if (platform === 'linkedin') {
        // Fetch LinkedIn profile to get person ID
        let personId = account.linkedin_person_urn || account.handle || null;
        try {
          const liProfileRes = await fetchWithTimeout(
            'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)',
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Restli-Protocol-Version': '2.0.0',
              },
            }
          );
          const liProfileData = await liProfileRes.json().catch(() => ({}));
          if (liProfileData.id) {
            personId = liProfileData.id;
            // Persist person URN if not already stored
            if (!account.linkedin_person_urn) {
              account.linkedin_person_urn = liProfileData.id;
              await account.save();
            }
          }
        } catch (e) {
          console.warn('LinkedIn profile fetch error:', e.message);
        }

        // Fetch connection count via networkSizes (works with standard scopes)
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
            const connCount = sizeData.firstDegreeSize || 0;
            if (connCount > 0) metrics.followers = connCount;
          }
        } catch (e) {
          console.warn('LinkedIn connection count error:', e.message);
          metrics.followers = account.followers_count || 0;
        }

        // Fetch UGC posts and aggregate reactions/comments/shares
        if (personId) {
          try {
            const personUrn = `urn:li:person:${personId}`;
            const ugcRes = await fetchWithTimeout(
              `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(personUrn)})&count=50`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Restli-Protocol-Version': '2.0.0',
                  'LinkedIn-Version': '202401',
                },
              }
            );
            const ugcData = await ugcRes.json().catch(() => ({}));
            const posts = ugcData.elements || [];

            let totalReactions = 0, totalComments = 0, totalShares = 0;
            posts.forEach(post => {
              const stats = post.socialDetail || post.statistics || {};
              totalReactions += stats.numLikes || stats.totalSocialActivityCounts?.numLikes || 0;
              totalComments += stats.numComments || stats.totalSocialActivityCounts?.numComments || 0;
              totalShares += stats.numShares || post.numShares || 0;
            });

            metrics.likes = totalReactions;
            metrics.comments = totalComments;
            metrics.shares = totalShares;
            metrics.posts = ugcData.paging?.total || posts.length;
          } catch (e) {
            console.warn('LinkedIn UGC posts error:', e.message);
          }
        }

      } else if (platform === 'youtube') {
        // Fetch channel statistics using YouTube Data API v3
        try {
          const ytRes = await fetchWithTimeout(
            'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const ytData = await ytRes.json();
          if (ytRes.ok && ytData.items && ytData.items.length > 0) {
            const stats = ytData.items[0].statistics;
            metrics.followers = parseInt(stats.subscriberCount || '0', 10);
            metrics.views = parseInt(stats.viewCount || '0', 10);
          }
        } catch (e) {
          console.warn('YouTube channel stats error:', e.message);
        }

        // Fetch YouTube Analytics for likes/comments on recent videos
        try {
          const today30 = new Date();
          const startDate30 = new Date(today30);
          startDate30.setDate(startDate30.getDate() - 30);
          const startStr = startDate30.toISOString().split('T')[0];
          const endStr = today30.toISOString().split('T')[0];

          const ytAnalRes = await fetchWithTimeout(
            `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startStr}&endDate=${endStr}&metrics=likes,comments,shares,views,estimatedMinutesWatched&dimensions=day`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const ytAnalData = await ytAnalRes.json();
          if (ytAnalRes.ok && ytAnalData.rows && ytAnalData.rows.length > 0) {
            // Sum today's row (last row is most recent day)
            const todayRow = ytAnalData.rows[ytAnalData.rows.length - 1];
            // columns: day, likes, comments, shares, views, estimatedMinutesWatched
            metrics.likes = todayRow[1] || 0;
            metrics.comments = todayRow[2] || 0;
            metrics.shares = todayRow[3] || 0;
            // views from analytics may be more accurate (daily views)
            const dailyViews = todayRow[4] || 0;
            if (dailyViews > 0) metrics.views = dailyViews;
            metrics.reach = todayRow[5] || 0; // mapping estimatedMinutesWatched to reach
          }
        } catch (e) {
          metrics.error_message = `YouTube Analytics error: ${e.message}`;
          console.warn('YouTube Analytics error:', e.message);
        }
      }

      // Construct $set dynamically to avoid overwriting existing valid metrics with missing ones
      const setPayload = {
        social_account_id: account._id,
        organizationId: account.organizationId || null,
        updated_at: new Date(),
      };

      // Use dot notation for metrics to only update fetched fields
      Object.keys(metrics).forEach(key => {
        setPayload[`metrics.${key}`] = metrics[key];
      });

      // Upsert Analytics record for today matching unique index: { user_id, platform, date }
      await Analytics.findOneAndUpdate(
        { user_id: userId, platform: platform, date: today },
        { 
          $set: setPayload,
          $setOnInsert: { _id: uuidv4(), created_at: new Date() }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );

      // Also update the account's follower count
      if (metrics.followers > 0) {
        account.followers_count = metrics.followers;
        await account.save();
      }

      results.push({ platform, success: true, metrics });
    } catch (err) {
      console.error(`Error syncing analytics for ${platform}:`, err.message);
      results.push({ platform, success: false, error: err.message });
    }
  }

  return results;
}

module.exports = { syncAnalyticsForUser };
