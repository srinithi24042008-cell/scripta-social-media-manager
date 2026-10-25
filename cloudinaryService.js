// Cloudinary Service
// Handles image/video uploads, transformations (aspect-ratio fitting), 
// and cleanup using Cloudinary's SDK and URL-based transformations.
//
// Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// in .env. If missing, falls back to local-only behavior so the app still works.

const cloudinary = require('cloudinary').v2;
const fs = require('fs');

let configured = false;

// Platform specs — same dimensions as mediaService.js, used for generating
// Cloudinary transformation URLs without a separate upload.
const PLATFORM_SPECS = {
  instagram: { width: 1080, height: 1350, crop: 'fill' },
  tiktok:    { width: 1080, height: 1920, crop: 'fill' },
  x:         { width: 1200, height: 675,  crop: 'fill' },
  linkedin:  { width: 1200, height: 627,  crop: 'fill' },
  facebook:  { width: 1200, height: 630,  crop: 'fill' },
  youtube:   { width: 1280, height: 720,  crop: 'fill' },
  discord:   { width: 1280, height: 720,  crop: 'fill' },
  reddit:    { width: 1080, height: 1350, crop: 'fill' },
  pinterest: { width: 1000, height: 1500, crop: 'fill' },
  bluesky:   { width: 1200, height: 675,  crop: 'fill' },
  tumblr:    { width: 1080, height: 1350, crop: 'fill' },
  threads:   { width: 1080, height: 1350, crop: 'fill' },
  snapchat:  { width: 1080, height: 1920, crop: 'fill' },
};

function tryConfigure() {
  if (configured) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    configured = true;
    return true;
  }
  return false;
}

// Returns true if Cloudinary credentials are available
function isConfigured() {
  return tryConfigure();
}

// Upload a local file to Cloudinary. Returns { url, publicId, format, width, height }.
// Falls back to returning a local URL if Cloudinary is not configured.
async function upload(filePath, options = {}) {
  if (!tryConfigure()) return null; // caller should fall back

  const folder = options.folder || 'scripta/originals';
  const resourceType = options.resourceType || 'auto';

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: resourceType,
    ...options.transformation ? { transformation: options.transformation } : {},
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
  };
}

// Generate a Cloudinary URL with aspect-ratio fitting transformation.
// Does NOT re-upload — Cloudinary applies the transform on-the-fly.
function getFittedUrl(publicId, platform, mediaType = 'image') {
  if (!tryConfigure()) return null;

  const spec = PLATFORM_SPECS[platform];
  if (!spec) return null;

  const transformations = [
    { width: spec.width, height: spec.height, crop: 'fill', gravity: 'center' },
    { quality: 'auto', fetch_format: 'auto' },
  ];

  return cloudinary.url(publicId, {
    transformation: transformations,
    secure: true,
    resource_type: mediaType === 'video' ? 'video' : 'image',
  });
}

// Delete an image/video from Cloudinary by public ID
async function remove(publicId, resourceType = 'image') {
  if (!tryConfigure()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

// Upload a generated/optimized image to Cloudinary's fitted folder.
// Used when a generated image needs a specific crop saved as a separate asset.
async function uploadFitted(filePath, platform, mimetype) {
  if (!tryConfigure()) return null;

  const spec = PLATFORM_SPECS[platform];
  const folder = `scripta/fitted/${platform}`;

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: mimetype?.startsWith('video/') ? 'video' : 'image',
    transformation: [
      { width: spec.width, height: spec.height, crop: 'fill', gravity: 'center' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    mediaType: result.resource_type === 'video' ? 'video' : 'image',
  };
}

module.exports = { isConfigured, upload, getFittedUrl, uploadFitted, remove, PLATFORM_SPECS };
