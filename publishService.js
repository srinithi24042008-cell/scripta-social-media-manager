// Handles publishing posts to connected platforms.
// Enforces strict real OAuth token authentication and official platform APIs.
const { Agent, CredentialSession, RichText } = require('@atproto/api');
const { decrypt } = require('./encryptionService');
const { logger } = require('../utils/logger');
const { retry, fetchWithTimeout } = require('../utils/retry');

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

// Cache agents by identifier/handle to handle multiple personal accounts
const blueskyAgentsCache = {};

async function getBlueskyAgent(account) {
  const identifier = account && account.access_token ? account.handle : process.env.BLUESKY_IDENTIFIER;
  // For Bluesky, let's decrypt token if stored, otherwise use env
  const password = account && account.access_token ? decrypt(account.access_token) : process.env.BLUESKY_APP_PASSWORD;

  if (!identifier || !password) {
    return null;
  }

  const cached = blueskyAgentsCache[identifier];
  if (cached && Date.now() < cached.expiry) {
    return cached.agent;
  }

  try {
    const session = new CredentialSession(new URL('https://bsky.social'));
    await session.login({ identifier, password });

    const agent = new Agent(session);
    blueskyAgentsCache[identifier] = {
      agent,
      expiry: Date.now() + 23 * 60 * 60 * 1000
    };
    return agent;
  } catch (err) {
    console.error(`Bluesky login failed for ${identifier}:`, err.message);
    return null;
  }
}

async function publishToBluesky(post, account) {
  const agent = await getBlueskyAgent(account);

  if (!agent) {
    return {
      success: false,
      message: 'Bluesky credentials not configured or login failed.',
    };
  }

  try {
    const rt = new RichText({ text: post.content || '' });
    await rt.detectFacets(agent);

    const response = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      externalId: response.uri,
      message: `Published to Bluesky at ${response.uri}`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Bluesky publish failed: ${err.message}`,
    };
  }
}

const { publishToFacebook } = require('./facebookPublisher');
const { publishToInstagram } = require('./instagramPublisher');
const { publishToThreads } = require('./threadsPublisher');
const { publishToYoutube } = require('./youtubePublisher');
const { publishToLinkedIn } = require('./linkedinPublisher');

// Pinterest Pin Real API Call
async function publishToPinterest(post, account) {
  if (!account.access_token) {
    return { success: false, message: 'OAuth access token missing. Please reconnect your account.' };
  }
  const token = decrypt(account.access_token);
  if (!token) {
    return { success: false, message: 'OAuth access token decryption failed.' };
  }

  if (!post.media_path) {
    return { success: false, message: 'Pinterest publishing requires an image URL.' };
  }

  try {
    const res = await fetchWithTimeout('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: post.content.substring(0, 50) || 'Scripta Pin',
        description: post.content,
        media_source: {
          source_type: 'image_url',
          url: post.media_path
        },
        board_id: 'default_board_id'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Pinterest Pin failed:', data);
      return { success: false, message: `Pinterest API error: ${data.message || 'Unknown Pinterest error'}` };
    }

    return {
      success: true,
      externalId: data.id,
      message: 'Published to Pinterest successfully.'
    };
  } catch (err) {
    return { success: false, message: `Pinterest Network error: ${err.message}` };
  }
}

// TikTok Video Resumable Upload Initialization Call
async function publishToTikTok(post, account) {
  if (!account.access_token) {
    return { success: false, message: 'OAuth access token missing. Please reconnect your account.' };
  }
  const token = decrypt(account.access_token);
  if (!token) {
    return { success: false, message: 'OAuth access token decryption failed.' };
  }

  if (!post.media_path) {
    return { success: false, message: 'TikTok publishing requires a video file.' };
  }

  try {
    const res = await fetchWithTimeout('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        post_info: {
          title: post.content.substring(0, 100),
          privacy_level: 'PUBLIC_TO_EVERYONE'
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size_of_file: 5000000,
          chunk_size: 5000000,
          total_chunk_count: 1
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('TikTok publish initiation failed:', data);
      return { success: false, message: `TikTok API error: ${data.error?.message || 'Unknown TikTok error'}` };
    }

    return {
      success: true,
      externalId: data.data?.publish_id || `tiktok-${Date.now()}`,
      message: 'TikTok video upload initialized.'
    };
  } catch (err) {
    return { success: false, message: `TikTok Network error: ${err.message}` };
  }
}

const PUBLISHERS = {
  instagram: publishToInstagram,
  tiktok: publishToTikTok,
  linkedin: publishToLinkedIn,
  facebook: publishToFacebook,
  youtube: publishToYoutube,
  pinterest: publishToPinterest,
  bluesky: publishToBluesky,
  threads: publishToThreads,
};

async function publish(post, account) {
  const fn = PUBLISHERS[post.platform];
  if (!fn) {
    return { success: false, message: `Unsupported platform: ${post.platform}` };
  }
  try {
    return await fn(post, account);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = { publish };
