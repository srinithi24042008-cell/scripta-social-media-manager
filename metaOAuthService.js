const { logger } = require('../utils/logger');
const { fetchWithTimeout } = require('../utils/retry');

function getAuthUrl(platform, redirectUri, state, clientId) {
  logger.info(`[Meta OAuth] Generating Auth URL for platform: ${platform}`);
  logger.info(`[Meta OAuth] Using META_APP_ID: ${clientId}`);
  logger.info(`[Meta OAuth] Using Redirect URI: ${redirectUri}`);

  if (platform === 'facebook') {
    const scopes = 'public_profile,pages_show_list,pages_read_engagement,pages_manage_posts';
    logger.info(`[Meta OAuth] Requested Scopes: ${scopes}`);
    return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;
  } else if (platform === 'instagram') {
    const scopes = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_metadata,business_management';
    logger.info(`[Meta OAuth] Requested Scopes: ${scopes}`);
    return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;
  } else if (platform === 'threads') {
    const scopes = 'threads_basic,threads_content_publish';
    logger.info(`[Meta OAuth] Requested Scopes: ${scopes}`);
    return `https://threads.net/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;
  }
  return null;
}

async function exchangeCodeForToken(platform, code, redirectUri, clientId, clientSecret) {
  let tokenUrl = '';
  let bodyData = {};
  let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (platform === 'facebook' || platform === 'instagram') {
    tokenUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';
    bodyData = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code
    };
  } else if (platform === 'threads') {
    tokenUrl = 'https://graph.threads.net/oauth/access_token';
    bodyData = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code'
    };
  } else {
    throw new Error(`Unsupported Meta platform: ${platform}`);
  }

  const searchParams = new URLSearchParams();
  for (const key in bodyData) {
    searchParams.append(key, bodyData[key]);
  }

  logger.info(`[Meta OAuth] Exchanging code for token on URL: ${tokenUrl}`);
  logger.info(`[Meta OAuth] Token Exchange Redirect URI: ${redirectUri}`);
  logger.info(`[Meta OAuth] Token Exchange META_APP_ID: ${clientId}`);
  const res = await fetchWithTimeout(tokenUrl, {
    method: 'POST',
    headers,
    body: searchParams.toString()
  });

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.error?.message || data.error_description || data.error || 'Token exchange failed';
    throw new Error(errMsg);
  }

  return data;
}

module.exports = {
  getAuthUrl,
  exchangeCodeForToken
};
