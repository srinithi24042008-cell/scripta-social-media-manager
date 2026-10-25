const { logger } = require('../utils/logger');
const { fetchWithTimeout } = require('../utils/retry');

async function exchangeLongLivedToken(platform, shortLivedToken, clientId, clientSecret) {
  let exchangeUrl = '';
  
  if (platform === 'facebook' || platform === 'instagram') {
    exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
  } else if (platform === 'threads') {
    exchangeUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${clientSecret}&access_token=${shortLivedToken}`;
  } else {
    throw new Error(`Unsupported token exchange platform: ${platform}`);
  }

  logger.info(`[Meta Token Service] Exchanging long-lived token for platform: ${platform}`);
  const res = await fetchWithTimeout(exchangeUrl);
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.error?.message || data.error_description || data.error || 'Long-lived token exchange failed';
    throw new Error(errMsg);
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 5184000 // 60 days default
  };
}

async function refreshThreadsToken(longLivedToken) {
  const refreshUrl = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${longLivedToken}`;
  logger.info('[Meta Token Service] Refreshing Threads token');
  
  const res = await fetchWithTimeout(refreshUrl, { method: 'GET' });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.error?.message || data.error_description || data.error || 'Threads token refresh failed';
    throw new Error(errMsg);
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 5184000
  };
}

module.exports = {
  exchangeLongLivedToken,
  refreshThreadsToken
};
