const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext } = require('../middleware/workspace');
const Analytics = require('../models/Analytics');

const router = express.Router();
router.use(requireAuth);
router.use(workspaceContext);

// Get aggregated analytics for the dashboard
router.get('/dashboard', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    // ── Build filter for period metrics (likes, impressions, reach, etc.) ──
    const periodFilter = { ...req.workspaceFilter };
    if (startDate || endDate) {
      periodFilter.date = {};
      if (startDate) periodFilter.date.$gte = new Date(startDate);
      if (endDate) periodFilter.date.$lte = new Date(endDate);
    }

    const allFilter = { ...req.workspaceFilter };
    
    const [periodAnalytics, allAnalytics] = await Promise.all([
      Analytics.find(periodFilter).lean(),
      Analytics.find(allFilter).lean(),
    ]);

    // Build latestFollowersMap and latestErrorMap from ALL records (most recent per platform)
    const latestFollowersMap = {};
    const latestErrorMap = {};
    allAnalytics.sort((a, b) => new Date(a.date) - new Date(b.date)); // ascending
    allAnalytics.forEach((a) => {
      if (a.metrics.followers > 0) {
        latestFollowersMap[a.platform] = a.metrics.followers;
      }
      if (a.metrics.error_message) {
        latestErrorMap[a.platform] = a.metrics.error_message;
      } else {
        latestErrorMap[a.platform] = null; // Clear if the latest sync was successful
      }
    });

    const aggregate = {
      followers: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      impressions: 0,
      reach: 0,
      views: 0,
      saves: 0,
      profile_visits: 0,
      clicks: 0,
    };

    const platformBreakdown = {};
    const timelineMap = {};

    // Sort period analytics ascending for correct timeline ordering
    periodAnalytics.sort((a, b) => new Date(a.date) - new Date(b.date));

    periodAnalytics.forEach((a) => {
      // Sum period totals (NOT followers — those come from latestFollowersMap)
      aggregate.likes += a.metrics.likes || 0;
      aggregate.comments += a.metrics.comments || 0;
      aggregate.shares += a.metrics.shares || 0;
      aggregate.impressions += a.metrics.impressions || 0;
      aggregate.reach += a.metrics.reach || 0;
      aggregate.views += a.metrics.views || 0;
      aggregate.saves += a.metrics.saves || 0;
      aggregate.profile_visits += a.metrics.profile_visits || 0;
      aggregate.clicks += a.metrics.link_clicks || 0;

      // Platform breakdown — accumulate period metrics per platform
      if (!platformBreakdown[a.platform]) {
        platformBreakdown[a.platform] = {
          engagements: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          impressions: 0,
          reach: 0,
          views: 0,
          saves: 0,
          profile_visits: 0,
          clicks: 0,
          followers: 0, // will be set from latestFollowersMap below
          error_message: null,
        };
      }
      const pb = platformBreakdown[a.platform];
      pb.engagements += (a.metrics.likes || 0) + (a.metrics.comments || 0) + (a.metrics.shares || 0);
      pb.likes += a.metrics.likes || 0;
      pb.comments += a.metrics.comments || 0;
      pb.shares += a.metrics.shares || 0;
      pb.impressions += a.metrics.impressions || 0;
      pb.reach += a.metrics.reach || 0;
      pb.views += a.metrics.views || 0;
      pb.saves += a.metrics.saves || 0;
      pb.profile_visits += a.metrics.profile_visits || 0;
      pb.clicks += a.metrics.link_clicks || 0;

      // Timeline (group by day, sum engagements across platforms for that day)
      const day = new Date(a.date).toISOString().split('T')[0];
      if (!timelineMap[day]) {
        timelineMap[day] = {
          date: day,
          engagements: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          impressions: 0,
          reach: 0,
          views: 0,
          profile_visits: 0,
        };
      }
      const td = timelineMap[day];
      td.engagements += (a.metrics.likes || 0) + (a.metrics.comments || 0) + (a.metrics.shares || 0);
      td.likes += a.metrics.likes || 0;
      td.comments += a.metrics.comments || 0;
      td.shares += a.metrics.shares || 0;
      td.impressions += a.metrics.impressions || 0;
      td.reach += a.metrics.reach || 0;
      td.views += a.metrics.views || 0;
      td.profile_visits += a.metrics.profile_visits || 0;
    });

    // Set followers and error_message from the MOST RECENT record (not summed, not from date-range only)
    aggregate.followers = Object.values(latestFollowersMap).reduce((sum, val) => sum + val, 0);
    Object.keys(platformBreakdown).forEach((p) => {
      platformBreakdown[p].followers = latestFollowersMap[p] || 0;
      platformBreakdown[p].error_message = latestErrorMap[p] || null;
    });

    // Also add entries for connected platforms not in periodAnalytics (so their cards show follower counts)
    Object.keys(latestFollowersMap).forEach((p) => {
      if (!platformBreakdown[p]) {
        platformBreakdown[p] = {
          engagements: 0, likes: 0, comments: 0, shares: 0,
          impressions: 0, reach: 0, views: 0, saves: 0,
          profile_visits: 0, clicks: 0, followers: latestFollowersMap[p] || 0,
          error_message: latestErrorMap[p] || null,
        };
      }
    });

    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ aggregate, platformBreakdown, timeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync analytics from official APIs for the current user
router.post('/sync', async (req, res) => {
  try {
    const { syncAnalyticsForUser } = require('../services/analyticsSyncService');
    const results = await syncAnalyticsForUser(req.userId, req.workspace === 'personal' ? null : req.workspace);
    res.json({ success: true, results, message: 'Analytics synchronized successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
