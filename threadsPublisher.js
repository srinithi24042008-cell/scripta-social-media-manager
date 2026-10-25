const { decrypt } = require('./encryptionService');
const { logger } = require('../utils/logger');
const { retry, fetchWithTimeout } = require('../utils/retry');
const { ensurePublicMediaUrl } = require('./metaMediaService');

// Helper to make Threads Graph API calls
async function threadsGraphApi(url, options = {}) {
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

async function publishToThreads(post, account) {
  if (!account.access_token) {
    return { success: false, message: 'OAuth access token missing. Please reconnect your account.' };
  }
  const token = decrypt(account.access_token);
  if (!token) {
    return { success: false, message: 'OAuth access token decryption failed.' };
  }

  // Threads User ID is stored in page_id
  const threadsUserId = account.page_id;
  if (!threadsUserId) {
    return { success: false, message: 'Threads User ID not found. Please reconnect your Threads account.' };
  }

  try {
    let mediaUrl = null;
    if (post.media_path) {
      mediaUrl = await ensurePublicMediaUrl(post.media_path, post.media_type);
    }

    const containerBody = {
      access_token: token,
    };

    if (mediaUrl) {
      // Threads only supports Text and Image in our scope
      if (post.media_type === 'video') {
        return { success: false, message: 'Threads publishing currently only supports text and image posts.' };
      }
      containerBody.media_type = 'IMAGE';
      containerBody.image_url = mediaUrl;
      if (post.content) containerBody.text = post.content;
    } else {
      containerBody.media_type = 'TEXT';
      containerBody.text = post.content || '';
    }

    // 1. Create Media Container
    const containerUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    logger.info(`[Threads Publish] Creating container at URL: ${containerUrl}`);

    const containerData = await retry(async () => {
      return await threadsGraphApi(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerBody)
      });
    }, { context: 'Threads Create Container' });

    const creationId = containerData.id;
    logger.info(`[Threads Publish] Container created. Creation ID: ${creationId}`);

    // 2. Publish Container
    const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
    logger.info(`[Threads Publish] Publishing container at URL: ${publishUrl}`);

    const publishData = await retry(async () => {
      return await threadsGraphApi(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token
        })
      });
    }, { context: 'Threads Publish Container' });

    logger.info(`[Threads Publish] SUCCESS! Published thread ID: ${publishData.id}`);

    return {
      success: true,
      externalId: publishData.id,
      message: 'Published to Threads successfully.'
    };
  } catch (err) {
    logger.error(`[Threads Publish ERROR]: ${err.message}`);
    return { success: false, message: `Threads error: ${err.message}` };
  }
}

module.exports = { publishToThreads };
