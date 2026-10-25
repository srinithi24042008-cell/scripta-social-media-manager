const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');
const cloudinary = require('./cloudinaryService');

async function ensurePublicMediaUrl(mediaUrl, mediaType) {
  if (!mediaUrl) return null;
  const isLocalUrl = mediaUrl.startsWith('/') || mediaUrl.startsWith('http://localhost') || mediaUrl.startsWith('http://127.0.0.1');
  
  if (isLocalUrl) {
    logger.info(`[Meta Media Service] Local URL detected (${mediaUrl}), uploading to Cloudinary...`);
    const localPath = path.join(__dirname, '..', mediaUrl.replace(/^\//, ''));
    
    if (fs.existsSync(localPath)) {
      if (cloudinary.isConfigured()) {
        const result = await cloudinary.upload(localPath, {
          folder: 'scripta/publish',
          resourceType: mediaType === 'video' ? 'video' : 'image',
        });
        if (result) {
          logger.info(`[Meta Media Service] Uploaded to Cloudinary: ${result.url}`);
          return result.url;
        }
      } else {
        throw new Error('Publishing media requires a public HTTPS URL. Configure Cloudinary in your .env file.');
      }
    } else {
      throw new Error(`Media file not found on server: ${mediaUrl}`);
    }
  }
  return mediaUrl;
}

module.exports = { ensurePublicMediaUrl };
