const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext } = require('../middleware/workspace');
const { createNotification } = require('../services/notificationService');
const { fitMediaForPlatform, generateImage, generateVideo, storeAndGetUrl, PLATFORM_SPECS, ORIGINALS_DIR, isVideo } = require('../services/mediaService');
const geminiService = require('../services/geminiService');
const { upload: uploadToCloudinary } = require('../services/cloudinaryService');
const { aiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.use(requireAuth);
router.use(workspaceContext);
router.use((req, res, next) => {
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Access denied: Viewers cannot perform media actions.' });
  }
  next();
});

// ── Secure File Type Validation ───────────────────────────────────────────────
// Dual check: extension + browser-supplied MIME type.
// Magic-byte verification is done after disk write using the file-type package.

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.mov', '.webm',
]);

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

const BLOCKED_EXTENSIONS = new Set([
  '.html', '.htm', '.svg', '.js', '.jsx', '.ts', '.tsx',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.exe', '.bat', '.sh', '.cmd', '.ps1',
  '.py', '.rb', '.pl', '.asp', '.aspx',
  '.xml', '.json', '.yaml', '.yml',
]);

function isAllowedFile(originalname, mimetype) {
  const ext = path.extname(originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!ALLOWED_MIME_PREFIXES.some(prefix => mimetype.startsWith(prefix))) return false;
  return true;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ORIGINALS_DIR),
  filename: (req, file, cb) => {
    // Use only the allowed extension, never the original full name (path traversal safe)
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isAllowedFile(file.originalname, file.mimetype)) {
      return cb(new Error(
        `File type not allowed. Permitted types: images (jpg, jpeg, png, webp, gif) and videos (mp4, mov, webm).`
      ), false);
    }
    cb(null, true);
  },
});

// Upload a raw photo/video.
// Stores locally (multer) then uploads to Cloudinary if configured.
// Returns secure Cloudinary URL or local URL as fallback.
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Magic-byte verification using file-type package (reads actual file content, not browser headers)
  try {
    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(req.file.path);
    if (detected) {
      const detectedExt = `.${detected.ext}`;
      const detectedMime = detected.mime;
      if (!ALLOWED_EXTENSIONS.has(detectedExt) && !ALLOWED_MIME_PREFIXES.some(p => detectedMime.startsWith(p))) {
        const fs = require('fs');
        fs.unlink(req.file.path, () => {}); // Remove the file
        return res.status(400).json({ error: `File content does not match an allowed media type (detected: ${detectedMime}).` });
      }
    }
  } catch (ftErr) {
    // file-type check is best-effort; log but don't block on failure
    console.warn('[media/upload] file-type check failed:', ftErr.message);
  }

  try {
    const stored = await storeAndGetUrl(req.file.path, req.file.mimetype, 'originals');
    res.status(201).json({
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      mediaType: isVideo(req.file.mimetype) ? 'video' : 'image',
      originalUrl: stored.url,
      publicId: stored.publicId,
      cloudinary: !stored.local,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Save a media asset from URL directly into the media library
router.post('/save-from-url', async (req, res) => {
  const { url, mediaType, filename } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    let finalUrl = url;
    let publicId = null;
    try {
      const cloudinaryResult = await uploadToCloudinary(url, { resourceType: mediaType === 'video' ? 'video' : 'image', folder: 'scripta/library' });
      if (cloudinaryResult && cloudinaryResult.url) {
        finalUrl = cloudinaryResult.url;
        publicId = cloudinaryResult.publicId;
      }
    } catch (e) {
      console.warn('Could not upload URL to Cloudinary, keeping direct URL:', e.message);
    }
    res.status(201).json({
      success: true,
      filename: filename || `saved_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
      mimetype: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      mediaType: mediaType || 'video',
      originalUrl: finalUrl,
      publicId,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Returns a version of the uploaded media cropped/resized for a platform.
// With Cloudinary: generates a transform URL from the original's publicId.
// Without Cloudinary: crops locally using sharp/ffmpeg.
router.post('/:filename/fit', async (req, res) => {
  const { platform, publicId } = req.body;
  if (!PLATFORM_SPECS[platform]) {
    return res.status(400).json({ error: `platform must be one of: ${Object.keys(PLATFORM_SPECS).join(', ')}` });
  }
  try {
    const mimetype = req.body.mimetype || 'image/jpeg';
    const result = await fitMediaForPlatform({
      originalFilename: req.params.filename,
      mimetype,
      platform,
      publicId, // Cloudinary publicId (passed from upload response)
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generate an image or video from a text prompt
router.post('/generate', aiLimiter, async (req, res) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  const { prompt, type, duration, imageUrl } = req.body;
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'prompt is required' });
  try {
    let result;
    if (type === 'video') {
      const parsedDuration = parseInt(duration, 10) || 5;
      result = await geminiService.generateVideo({ prompt: prompt.trim(), imageUrl, duration: parsedDuration });
    } else {
      result = await generateImage({ prompt: prompt.trim() });
    }
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/media/generate Error Details]:', err.message || err, err.body || err.detail || JSON.stringify(err));
    res.status(502).json({ error: err.message || err.detail || JSON.stringify(err), body: err.body });
  }
});

// Poll status of video generation
router.get('/generate/video/status/:id', async (req, res) => {
  try {
    const statusResult = await geminiService.checkVideoStatus(req.params.id);

    if (statusResult.status === 'succeeded' && statusResult.videoUrl) {
      const tempUrl = statusResult.videoUrl;
      let finalUrl = tempUrl;

      try {
        const cloudinaryResult = await uploadToCloudinary(tempUrl, { resourceType: 'video' });
        if (cloudinaryResult && cloudinaryResult.url) finalUrl = cloudinaryResult.url;
      } catch (uploadErr) {
        console.error('Failed to upload Gemini AI video to Cloudinary:', uploadErr.message);
      }

      return res.json({
        ...statusResult,
        url: finalUrl,
        originalUrl: finalUrl,
        videoUrl: finalUrl,
        mediaType: 'video',
        mimetype: 'video/mp4',
        filename: `gemini_${req.params.id}.mp4`
      });
    }

    res.json(statusResult);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/platform-specs', (req, res) => res.json({ specs: PLATFORM_SPECS }));

module.exports = router;
