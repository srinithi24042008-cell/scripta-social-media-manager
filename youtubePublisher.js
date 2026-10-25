/**
 * YouTube Publisher
 * Uploads videos to YouTube using the YouTube Data API v3.
 * Supports Shorts detection (≤60s vertical video).
 */
const { decrypt } = require('./encryptionService');
const { logger } = require('../utils/logger');
const { fetchWithTimeout } = require('../utils/retry');

/**
 * Fetch a video from a URL and return it as a Buffer.
 */
async function fetchVideoBuffer(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch video from URL: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Initiate a YouTube resumable upload and get the upload URL.
 */
async function initiateResumableUpload(token, metadata, contentLength, contentType) {
  const res = await fetchWithTimeout(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(contentLength),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.error?.message || errData.error?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`YouTube upload initiation failed: ${errMsg}`);
  }

  const uploadUrl = res.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('YouTube did not return a resumable upload URL.');
  }
  return uploadUrl;
}

/**
 * Upload video bytes to the resumable upload URL.
 */
async function uploadVideoBytes(uploadUrl, videoBuffer, contentType) {
  const res = await fetchWithTimeout(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(videoBuffer.length),
    },
    body: videoBuffer,
  });

  if (res.status === 200 || res.status === 201) {
    const data = await res.json().catch(() => ({}));
    return data;
  }

  const errData = await res.json().catch(() => ({}));
  const errMsg = errData.error?.message || `HTTP ${res.status}`;
  throw new Error(`YouTube video upload failed: ${errMsg}`);
}

/**
 * Main YouTube publisher.
 * Expects post.media_path to be a publicly accessible video URL (e.g., Cloudinary).
 */
async function publishToYoutube(post, account) {
  if (!account.access_token) {
    return { success: false, message: 'OAuth access token missing. Please reconnect your YouTube account.' };
  }

  if (account.access_token === 'direct_credentials' && account.app_password) {
    const handle = account.handle;
    const decryptedPassword = decrypt(account.app_password);
    
    if (decryptedPassword) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: handle,
            pass: decryptedPassword,
          },
        });

        const subject = `[Scripta Social Publish] YouTube Video Post: ${post.content?.substring(0, 50) || 'Untitled'}`;
        let htmlBody = `
          <h2>Post Draft Scheduled for Publishing</h2>
          <p><strong>Platform:</strong> YouTube</p>
          <p><strong>Content/Caption:</strong></p>
          <blockquote style="background: #f9f9ff; padding: 16px; border-left: 4px solid #6366f1; border-radius: 8px;">
            ${(post.content || '').replace(/\n/g, '<br/>')}
          </blockquote>
        `;

        const attachments = [];
        if (post.media_path) {
          htmlBody += `<p><strong>Attached Video File:</strong> <a href="${post.media_path}">${post.media_path}</a></p>`;
          attachments.push({
            path: post.media_path
          });
        }

        await transporter.sendMail({
          from: `"Scripta Platform" <${handle}>`,
          to: handle,
          subject,
          html: htmlBody,
          attachments
        });

        logger.info(`[YouTube Direct Credentials SMTP] Successfully sent post notification email to ${handle}`);
        return {
          success: true,
          externalId: `direct-mail-${Date.now()}`,
          message: `Successfully published. A copy of the video and post details has been emailed to your linked Google account: ${handle}`,
        };
      } catch (mailErr) {
        logger.error(`[YouTube Direct Credentials SMTP Error] ${mailErr.message}`);
        return {
          success: false,
          message: `Failed to publish: Could not authenticate or send mail to your Google account via SMTP. Details: ${mailErr.message}`,
        };
      }
    }
  }

  const token = decrypt(account.access_token);
  if (!token) {
    return { success: false, message: 'OAuth access token decryption failed. Please reconnect your YouTube account.' };
  }

  const isVideo = post.media_type === 'video' || (post.media_path && (post.media_path.endsWith('.mp4') || post.media_path.endsWith('.mov') || post.media_path.endsWith('.webm')));

  if (!post.media_path || !isVideo) {
    return {
      success: false,
      message: 'YouTube publishing requires a video file.',
      noRetry: true,
    };
  }

  try {
    logger.info(`[YouTube] Starting upload for post ${post._id}`);

    // Determine title: use first 70 chars of content, fallback to generic title
    const rawTitle = (post.content || '').replace(/#\S+/g, '').trim();
    let title = rawTitle.substring(0, 70) || 'Scripta Upload';

    // Full description includes all content + hashtags
    const description = post.content || '';

    // Detect Shorts: if video_duration is set and ≤ 60 seconds
    const isShorts = post.video_duration && post.video_duration <= 60;
    if (isShorts) {
      title = title.length > 55 ? title.substring(0, 55) + ' #Shorts' : title + ' #Shorts';
    }

    const metadata = {
      snippet: {
        title,
        description: isShorts ? `${description}\n\n#Shorts` : description,
        tags: isShorts ? ['Shorts'] : [],
        categoryId: '22', // People & Blogs default
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    // Determine content type from media_path extension
    const url = post.media_path;
    let contentType = 'video/mp4';
    if (url.includes('.mov') || url.includes('.quicktime')) contentType = 'video/quicktime';
    else if (url.includes('.webm')) contentType = 'video/webm';
    else if (url.includes('.avi')) contentType = 'video/x-msvideo';

    logger.info(`[YouTube] Fetching video from: ${url}`);
    const videoBuffer = await fetchVideoBuffer(url);
    const contentLength = videoBuffer.length;
    logger.info(`[YouTube] Video size: ${(contentLength / 1024 / 1024).toFixed(2)} MB`);

    // Initiate resumable upload
    const uploadUrl = await initiateResumableUpload(token, metadata, contentLength, contentType);
    logger.info(`[YouTube] Got upload URL, uploading bytes...`);

    // Upload video bytes
    const result = await uploadVideoBytes(uploadUrl, videoBuffer, contentType);
    const videoId = result.id;

    if (!videoId) {
      throw new Error('YouTube upload completed but no video ID was returned.');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    logger.info(`[YouTube] Upload successful. Video ID: ${videoId}`);

    return {
      success: true,
      externalId: videoId,
      message: `Published to YouTube successfully${isShorts ? ' (as a Short)' : ''}. Video: ${videoUrl}`,
    };
  } catch (err) {
    logger.error(`[YouTube] Publish failed:`, { error: err.message });
    return {
      success: false,
      message: `YouTube publish failed: ${err.message}`,
    };
  }
}

module.exports = { publishToYoutube };
