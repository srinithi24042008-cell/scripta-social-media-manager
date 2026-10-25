const cron = require('node-cron');
const Post = require('./models/Post');
const SocialAccount = require('./models/SocialAccount');
const { getCredentialsForUserAndPlatform } = require('./services/credentialService');
const { publish } = require('./services/publishService');
const { encrypt, decrypt } = require('./services/encryptionService');
const { createNotification } = require('./services/notificationService');
const { logger } = require('./utils/logger');
const { fetchWithTimeout } = require('./utils/retry');
const { acquireLock, releaseLock } = require('./utils/distributedLock');

const DUE_POSTS_LOCK = 'due-posts-tick';
const DUE_POSTS_LOCK_TTL_MS = 50 * 1000; // shorter than the 60s cron interval

async function refreshOAuthToken(account) {
  const platform = account.platform;

  if (platform === 'threads') {
    const decryptedAccess = decrypt(account.access_token);
    if (!decryptedAccess) {
      throw new Error('No access token available to refresh.');
    }
    const tokenUrl = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${decryptedAccess}`;
    const res = await fetchWithTimeout(tokenUrl, { method: 'GET' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.error?.message || 'Threads token refresh rejected');
    }
    return {
      access_token: data.access_token,
      refresh_token: null,
      expires_in: data.expires_in || 5184000
    };
  }

  const decryptedRefresh = decrypt(account.refresh_token);
  if (!decryptedRefresh) {
    throw new Error('No refresh token available.');
  }
  const { clientId, clientSecret } = await getCredentialsForUserAndPlatform(account.user_id, platform);

  if (!clientId || !clientSecret) {
    throw new Error('Platform integration credentials are not configured.');
  }

  let tokenUrl = '';
  let bodyData = {};
  let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (platform === 'linkedin') {
    tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    bodyData = {
      grant_type: 'refresh_token',
      refresh_token: decryptedRefresh,
      client_id: clientId,
      client_secret: clientSecret
    };
  } else if (platform === 'facebook' || platform === 'instagram') {
    tokenUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';
    bodyData = {
      grant_type: 'fb_exchange_token',
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: decrypt(account.access_token)
    };
  } else if (platform === 'youtube') {
    tokenUrl = 'https://oauth2.googleapis.com/token';
    bodyData = {
      grant_type: 'refresh_token',
      refresh_token: decryptedRefresh,
      client_id: clientId,
      client_secret: clientSecret
    };
  } else if (platform === 'pinterest') {
    tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
    bodyData = {
      grant_type: 'refresh_token',
      refresh_token: decryptedRefresh
    };
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${authHeader}`;
  } else if (platform === 'tiktok') {
    tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    bodyData = {
      client_key: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: decryptedRefresh
    };
  } else {
    throw new Error(`Unsupported token refresh platform: ${platform}`);
  }

  const searchParams = new URLSearchParams();
  for (const key in bodyData) {
    searchParams.append(key, bodyData[key]);
  }

  const res = await fetchWithTimeout(tokenUrl, {
    method: 'POST',
    headers,
    body: searchParams.toString()
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Token refresh rejected by platform');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || decryptedRefresh,
    expires_in: data.expires_in || 3600
  };
}

function startScheduler() {
  cron.schedule('* * * * *', async () => {
    // Distributed lock: if this app is scaled to multiple instances, only
    // one of them processes a given minute's due posts, preventing the
    // same post from being published twice.
    const gotLock = await acquireLock(DUE_POSTS_LOCK, DUE_POSTS_LOCK_TTL_MS).catch((err) => {
      logger.error('[Scheduler] Failed to acquire due-posts lock:', { error: err.message });
      return false;
    });
    if (!gotLock) return;

    try {
      await processDuePostsTick();
    } finally {
      await releaseLock(DUE_POSTS_LOCK).catch((err) => {
        logger.error('[Scheduler] Failed to release due-posts lock:', { error: err.message });
      });
    }
  });

  // Analytics Sync: Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('[Scheduler] Starting automated analytics sync...');
      const { syncAnalyticsForUser } = require('./services/analyticsSyncService');
      const uniqueUsers = await SocialAccount.distinct('user_id');
      for (const userId of uniqueUsers) {
        await syncAnalyticsForUser(userId);
      }
      logger.info('[Scheduler] Automated analytics sync completed.');
    } catch (err) {
      logger.error('[Scheduler] Automated analytics sync failed:', { error: err.message });
    }
  });

  // Weekly Analytics Report Notification: Run every Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    try {
      const uniqueUsers = await SocialAccount.distinct('user_id');
      for (const userId of uniqueUsers) {
        await createNotification(userId, 'info', 'Weekly analytics report generated.');
      }
    } catch (err) {
      logger.error('[Scheduler] Failed to send weekly report notifications:', { error: err.message });
    }
  });

  logger.info('[Scheduler] Started: checking for due posts every minute, syncing analytics every 6 hours.');
}

async function processDuePostsTick() {
    let duePosts;
    try {
      duePosts = await Post.find({
        status: { $in: ['scheduled', 'failed_retry'] },
        scheduled_at: { $lte: new Date() },
      }).lean();
    } catch (err) {
      logger.error('[Scheduler] Failed to query due posts:', { error: err.message });
      return; // Abort this tick but do NOT crash the cron loop
    }

    // Process each post in its own try/catch so one failure doesn't abort the rest of the tick
    for (const post of duePosts) {
      try {
        const attempts = (post.publish_attempts || 0) + 1;
        const accountQuery = post.organizationId
          ? { organizationId: post.organizationId, platform: post.platform }
          : { user_id: post.user_id, organizationId: null, platform: post.platform };
        let account = await SocialAccount.findOne(accountQuery);

        if (!account) {
          await Post.findByIdAndUpdate(post._id, {
            status: 'failed_permanent',
            publish_result: `No connected ${post.platform} account`,
            publish_attempts: attempts
          });
          await createNotification(
            post.user_id,
            'error',
            `Publishing failed permanently: No connected ${post.platform} account found.`,
            post._id,
            post.organizationId || null
          );
          continue;
        }

        // Check if token has expired
        let isExpired = account.token_expiry && new Date(account.token_expiry) <= new Date();

        if (isExpired) {
          try {
            const refreshResult = await refreshOAuthToken(account);
            account.access_token = encrypt(refreshResult.access_token);
            account.refresh_token = encrypt(refreshResult.refresh_token);
            account.token_expiry = new Date(Date.now() + refreshResult.expires_in * 1000);
            account.status = 'connected';
            await account.save();

            isExpired = false;
            logger.info(`[Scheduler] Refreshed expired OAuth token for @${account.handle} on ${account.platform}`);
            await createNotification(
              post.user_id,
              'info',
              `OAuth access token for @${account.handle} on ${account.platform} was expired. Auto-refreshed successfully.`,
              null,
              post.organizationId || null
            );
          } catch (err) {
            logger.error('[Scheduler] Failed to auto-refresh expired token:', { error: err.message });
            // Leave isExpired = true so it transits to expired state
          }
        }

        if (isExpired) {
          account.status = 'expired';
          await account.save();

          await Post.findByIdAndUpdate(post._id, {
            status: 'failed_permanent',
            publish_result: 'OAuth authentication token expired. Reconnect required.',
            publish_attempts: attempts
          });

          await createNotification(
            post.user_id,
            'error',
            `Publishing to ${account.platform} (@${account.handle}) failed permanently: OAuth token expired. Reconnect Required.`,
            post._id,
            post.organizationId || null
          );
          continue;
        }

        // Trigger publishing
        const result = await publish(post, account.toObject());
        
        if (result.success) {
          await Post.findByIdAndUpdate(post._id, {
            status: 'published',
            published_at: new Date(),
            publish_result: result.message,
            publish_attempts: attempts
          });
          await createNotification(
            post.user_id,
            'success',
            `Post published successfully to ${account.platform} as @${account.handle}.`,
            post._id,
            post.organizationId || null
          );
        } else {
          const maxRetries = 3;
          if (attempts >= maxRetries || result.noRetry) {
            await Post.findByIdAndUpdate(post._id, {
              status: 'failed_permanent',
              publish_result: result.message,
              publish_attempts: attempts
            });
            await createNotification(
              post.user_id,
              'error',
              `Publishing to ${account.platform} failed permanently: ${result.message}`,
              post._id,
              post.organizationId || null
            );
          } else {
            // Retry after 2 minutes
            const nextRetry = new Date(Date.now() + 2 * 60 * 1000);
            await Post.findByIdAndUpdate(post._id, {
              status: 'failed_retry',
              publish_result: `Attempt ${attempts} failed: ${result.message}. Retrying at ${nextRetry.toISOString()}`,
              publish_attempts: attempts,
              scheduled_at: nextRetry
            });
            logger.info(`[Scheduler] Post ${post._id} failed. Retrying at ${nextRetry.toISOString()}`);
          }
        }
      } catch (postErr) {
        // Per-post error isolation: log but continue processing other posts in this tick
        logger.error(`[Scheduler] Unexpected error processing post ${post._id}:`, { error: postErr.message });
      }
    }
}

module.exports = { startScheduler };
