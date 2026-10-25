const { decrypt } = require('./encryptionService');
const { logger } = require('../utils/logger');
const { retry, fetchWithTimeout } = require('../utils/retry');
const { ensurePublicMediaUrl } = require('./metaMediaService');

// Create a generic function to call Facebook/Instagram Graph API
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

// Instagram Graph API Real Post (Image/Video container upload)
// Supports:
//   - Image posts → image_url
//   - Video/Reels  → video_url + media_type: 'REELS'
//   - Uses the Instagram Business Account ID (not `me`) for container endpoints.
//   - Always sends a publicly accessible HTTPS URL (uploads to Cloudinary if needed).
//
// REQUIRED: The SocialAccount must have `instagram_business_id` populated.
// This is fetched during OAuth via:
//   GET /me/accounts → GET /{page-id}?fields=instagram_business_account
async function publishToInstagram(post, account) {
  // Use the Page Access Token for Instagram Publishing
  if (!account.page_access_token) {
    return { success: false, message: 'Page Access Token missing. Please reconnect your Instagram account.', noRetry: true };
  }
  const token = decrypt(account.page_access_token);
  if (!token) {
    return { success: false, message: 'Page Access Token decryption failed. Please reconnect.', noRetry: true };
  }

  // ── 0. Validate Instagram Business Account ID ─────────────────────────
  const igBusinessId = account.instagram_business_id;
  if (!igBusinessId) {
    return {
      success: false,
      message: 'Instagram Business Account ID not found. Please reconnect your Instagram account. The account must be a Business or Creator account linked to a Facebook Page.',
    };
  }

  logger.info(`[Instagram Publish] Using Instagram Business Account ID: ${igBusinessId}`);

  // ── 1. Validate media ────────────────────────────────────────────────
  if (!post.media_path) {
    return { success: false, message: 'Instagram publishing requires a media URL.', noRetry: true };
  }

  let mediaUrl;
  try {
    mediaUrl = await ensurePublicMediaUrl(post.media_path, post.media_type);
  } catch (uploadErr) {
    return { success: false, message: uploadErr.message };
  }

  // ── 3. Final validation ──────────────────────────────────────────────
  if (!mediaUrl || !mediaUrl.startsWith('http')) {
    return { success: false, message: 'Instagram publishing requires a valid public HTTPS media URL.' };
  }

  const isVideo = post.media_type === 'video';

  try {
    // ── 4. Create Media Container (Retry wrapped) ─────────────────────
    const containerBody = {
      caption: post.content || '',
      access_token: token,
    };

    if (isVideo) {
      containerBody.video_url = mediaUrl;
      containerBody.media_type = 'REELS';
    } else {
      containerBody.image_url = mediaUrl;
    }

    const containerUrl = `https://graph.facebook.com/v21.0/${igBusinessId}/media`;

    const containerData = await retry(async () => {
      return await fbGraphApi(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerBody)
      });
    }, { context: 'Instagram Create Container' });

    const creationId = containerData.id;
    logger.info(`[Instagram Publish] Container created. Creation ID: ${creationId}`);

    // ── 5. Polling for Video (Reels) Processing ────────────────────────
    if (isVideo) {
      logger.info(`[Instagram Publish] Video container detected, polling for processing completion...`);
      let isReady = false;
      const maxPolls = 15; // 15 * 5s = 75 seconds wait max
      for (let i = 0; i < maxPolls; i++) {
        await new Promise(res => setTimeout(res, 5000)); // wait 5 seconds between polls
        const statusData = await fbGraphApi(`https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${token}`);
        
        const status = statusData.status_code;
        logger.info(`[Instagram Publish] Container status: ${status}`);
        
        if (status === 'FINISHED') {
          isReady = true;
          break;
        } else if (status === 'ERROR') {
          throw new Error('Instagram failed to process the video container.');
        }
      }
      if (!isReady) {
        throw new Error('Timed out waiting for Instagram to process the video container.');
      }
    }

    // ── 6. Publish Container ──────────────────────────────────────────
    const publishUrl = `https://graph.facebook.com/v21.0/${igBusinessId}/media_publish`;
    
    const publishData = await retry(async () => {
      return await fbGraphApi(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token
        })
      });
    }, { context: 'Instagram Publish Container' });

    logger.info(`[Instagram Publish] SUCCESS! Published media ID: ${publishData.id}`);
    
    return {
      success: true,
      externalId: publishData.id,
      message: 'Published to Instagram successfully.'
    };
  } catch (err) {
    logger.error(`[Instagram Publish ERROR]: ${err.message}`);
    let cleanMsg = err.message || 'Unknown error';
    if (cleanMsg.toLowerCase().includes('aspect ratio') || cleanMsg.includes('36003')) {
      cleanMsg = 'Incorrect aspect ratio';
    } else {
      cleanMsg = cleanMsg.replace(/^API error:\s*/i, '').replace(/\s*\(code:.*?\)/i, '');
    }
    return { success: false, message: cleanMsg };
  }
}

module.exports = { publishToInstagram };
