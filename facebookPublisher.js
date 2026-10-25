const { decrypt } = require('./encryptionService');
const { logger } = require('../utils/logger');
const { retry, fetchWithTimeout } = require('../utils/retry');
const { ensurePublicMediaUrl } = require('./metaMediaService');

// Helper to make FB Graph API calls
async function fbGraphApi(url, options = {}) {
  const res = await fetchWithTimeout(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error?.message 
      ? `API error: ${data.error.message} (code: ${data.error.code || 'unknown'})`
      : JSON.stringify(data);
    throw new Error(errorMsg);
  }
  return data;
}

async function publishToFacebook(post, account) {
  if (!account.access_token) {
    return { success: false, message: 'OAuth access token missing. Please reconnect your account.' };
  }
  const token = decrypt(account.access_token);
  if (!token) {
    return { success: false, message: 'OAuth access token decryption failed.' };
  }

  // Retrieve the Facebook Page ID (stored in page_id)
  const pageId = account.page_id;
  if (!pageId) {
    return { success: false, message: 'Facebook Page ID not found. Please reconnect your Facebook account.' };
  }

  try {
    let mediaUrl = null;
    let isVideo = post.media_type === 'video';

    if (post.media_path) {
      mediaUrl = await ensurePublicMediaUrl(post.media_path, post.media_type);
      isVideo = isVideo || post.media_path.endsWith('.mp4') || post.media_path.endsWith('.mov') || post.media_path.endsWith('.webm');
    }

    let url = '';
    let body = {};

    if (mediaUrl) {
      if (isVideo) {
        url = `https://graph.facebook.com/v21.0/${pageId}/videos`;
        body = {
          description: post.content || '',
          file_url: mediaUrl,
          access_token: token
        };
      } else {
        url = `https://graph.facebook.com/v21.0/${pageId}/photos`;
        body = {
          caption: post.content || '',
          url: mediaUrl,
          access_token: token
        };
      }
    } else {
      url = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      body = {
        message: post.content || '',
        access_token: token
      };
    }

    logger.info(`[Facebook Publish] Posting to Page ID: ${pageId}, URL: ${url}`);
    
    const data = await retry(async () => {
      return await fbGraphApi(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }, { context: 'Facebook Publish Post' });

    return {
      success: true,
      externalId: data.id || data.post_id,
      message: 'Published to Facebook successfully.'
    };
  } catch (err) {
    logger.error(`[Facebook Publish ERROR]: ${err.message}`);
    let cleanMsg = err.message || 'Unknown error';
    if (cleanMsg.toLowerCase().includes('aspect ratio') || cleanMsg.includes('36003')) {
      cleanMsg = 'Incorrect aspect ratio';
    } else {
      cleanMsg = cleanMsg.replace(/^API error:\s*/i, '').replace(/\s*\(code:.*?\)/i, '');
    }
    return { success: false, message: cleanMsg };
  }
}

module.exports = { publishToFacebook };
