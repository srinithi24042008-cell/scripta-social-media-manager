const { decrypt } = require('./encryptionService');
const { logger } = require('../utils/logger');
const { fetchWithTimeout } = require('../utils/retry');

// Fetch a media file as a Buffer
async function fetchMediaBuffer(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch media from URL: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// LinkedIn API Real Share
async function publishToLinkedIn(post, account) {
  if (!account.access_token) {
    return { success: false, message: 'OAuth access token missing. Please reconnect your account.' };
  }
  const token = decrypt(account.access_token);
  if (!token) {
    return { success: false, message: 'OAuth access token decryption failed.' };
  }

  try {
    const authorUrn = account.linkedin_person_urn ? `urn:li:person:${account.linkedin_person_urn}` : (account.handle ? `urn:li:person:${account.handle}` : 'urn:li:person:unknown');

    let shareMediaCategory = 'NONE';
    let media = [];
    let textContent = post.content || '';

    if (post.media_path) {
       const isVideo = post.media_type === 'video' || post.media_path.endsWith('.mp4') || post.media_path.endsWith('.webm') || post.media_path.endsWith('.mov');
       const recipe = isVideo ? 'urn:li:digitalmediaRecipe:feedshare-video' : 'urn:li:digitalmediaRecipe:feedshare-image';

       // 1. Register Upload
       const registerRes = await fetchWithTimeout('https://api.linkedin.com/v2/assets?action=registerUpload', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json',
           'X-Restli-Protocol-Version': '2.0.0'
         },
         body: JSON.stringify({
           registerUploadRequest: {
             recipes: [recipe],
             owner: authorUrn,
             serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
           }
         })
       });

       const registerData = await registerRes.json();
       if (!registerRes.ok) {
         throw new Error(`Failed to register upload with LinkedIn: ${registerData.message || JSON.stringify(registerData)}`);
       }

       const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
       const assetUrn = registerData.value.asset;

       // 2. Fetch Media Buffer
       logger.info(`[LinkedIn] Fetching media buffer from ${post.media_path}`);
       const mediaBuffer = await fetchMediaBuffer(post.media_path);

       // 3. Upload Media Bytes
       logger.info(`[LinkedIn] Uploading media bytes to LinkedIn`);
       const uploadRes = await fetchWithTimeout(uploadUrl, {
         method: 'PUT',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/octet-stream'
         },
         body: mediaBuffer
       });

       if (!uploadRes.ok) {
         const errText = await uploadRes.text();
         throw new Error(`Failed to upload media bytes to LinkedIn: ${errText}`);
       }

       shareMediaCategory = isVideo ? 'VIDEO' : 'IMAGE';
       media = [{
         status: 'READY',
         description: { text: textContent.substring(0, 200) },
         media: assetUrn,
         title: { text: textContent.substring(0, 100) || 'Scripta Media' }
       }];
    }

    const payload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: textContent
          },
          shareMediaCategory: shareMediaCategory,
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    if (shareMediaCategory !== 'NONE') {
        payload.specificContent['com.linkedin.ugc.ShareContent'].media = media;
    }

    logger.info(`[LinkedIn] Creating UGC Post`);
    const res = await fetchWithTimeout('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('LinkedIn API error details:', data);
      return { success: false, message: `LinkedIn API error: ${data.message || 'Unknown LinkedIn error'}` };
    }

    return {
      success: true,
      externalId: data.id || `linkedin-${Date.now()}`,
      message: 'Published to LinkedIn successfully.'
    };
  } catch (err) {
    logger.error(`[LinkedIn ERROR]: ${err.message}`);
    return { success: false, message: `LinkedIn Network error: ${err.message}` };
  }
}

module.exports = { publishToLinkedIn };
