// Auto-fits uploaded photos/videos to each platform's recommended aspect
// ratio. Images are handled with sharp (fast, no external binary). Video
// is handled with ffmpeg via ffmpeg-static - if that binary is missing or
// fails for any reason, we fall back to just returning the original
// video untouched, rather than blocking the whole post.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');


function isVideo(filePath) {
  if (!filePath) return false;

  const ext = path.extname(filePath).toLowerCase();

  return [
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".m4v",
    ".3gp"
  ].includes(ext);
}
let ffmpeg = null;
try {
  const fluent = require('fluent-ffmpeg');
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const { spawnSync } = require('child_process');

  // Test if the binary actually works on this OS without crashing
  const testRun = spawnSync(ffmpegPath, ['-version']);
  if (testRun.error) {
    console.warn('ffmpeg test failed, video processing will be skipped:', testRun.error.message);
  } else {
    fluent.setFfmpegPath(ffmpegPath);
    ffmpeg = fluent;
  }
} catch (e) {
  // @ffmpeg-installer/ffmpeg failed to load.
  // Video auto-fit will be skipped gracefully - see fitVideo() below.
}

// One target size per platform. Real platforms support several aspect
// ratios each (e.g. Instagram feed vs Stories) - this picks the single
// most broadly-recommended one per platform to keep the feature simple.
const PLATFORM_SPECS = {
  instagram: { width: 1080, height: 1350, ratioLabel: '4:5' },
  tiktok: { width: 1080, height: 1920, ratioLabel: '9:16' },
  x: { width: 1200, height: 675, ratioLabel: '16:9' },
  linkedin: { width: 1200, height: 627, ratioLabel: '1.91:1' },
  facebook: { width: 1200, height: 630, ratioLabel: '1.91:1' },
  youtube: { width: 1280, height: 720, ratioLabel: '16:9' },
  discord: { width: 1280, height: 720, ratioLabel: '16:9' },   // embeds render best at 16:9
  reddit: { width: 1080, height: 1350, ratioLabel: '4:5' },     // feed crops close to Instagram's
  pinterest: { width: 1000, height: 1500, ratioLabel: '2:3' },     // Pins are tall
  bluesky: { width: 1200, height: 675, ratioLabel: '16:9' },    // timeline card, like X
  tumblr: { width: 1080, height: 1350, ratioLabel: '4:5' },
  threads: { width: 1080, height: 1350, ratioLabel: '4:5' },     // shares Instagram's crop rules
  snapchat: { width: 1080, height: 1920, ratioLabel: '9:16' },    // full-screen vertical
};

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const ORIGINALS_DIR = path.join(UPLOAD_ROOT, 'originals');
const FITTED_DIR = path.join(UPLOAD_ROOT, 'fitted');

for (const dir of [UPLOAD_ROOT, ORIGINALS_DIR, FITTED_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}



async function fitImage(inputPath, outputPath, spec) {
  await sharp(inputPath)
    .resize(spec.width, spec.height, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 88 })
    .toFile(outputPath);
}

function fitVideo(inputPath, outputPath, spec) {
  if (!ffmpeg) {
    fs.copyFileSync(inputPath, outputPath);
    return Promise.resolve({ skipped: true });
  }
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .videoFilters([
        `scale=${spec.width}:${spec.height}:force_original_aspect_ratio=increase`,
        `crop=${spec.width}:${spec.height}`,
      ])
      .outputOptions(['-movflags +faststart'])
      .on('end', () => resolve({ skipped: false }))
      .on('error', () => {
        // Fall back to the original file untouched rather than failing
        // the whole request - the person still gets their video attached.
        fs.copyFileSync(inputPath, outputPath);
        resolve({ skipped: true });
      })
      .save(outputPath);
  });
}

// Produces (or reuses a cached) platform-fitted version of an uploaded
// media file. Returns a URL path servable from /uploads.
async function fitMediaForPlatform({ originalFilename, mimetype, platform, publicId }) {
  const spec = PLATFORM_SPECS[platform];
  if (!spec) throw new Error(`Unknown platform: ${platform}`);

  const video =
    mimetype?.startsWith("video/") ||
    isVideo(originalFilename);

  try {
    const cloudinary = require('./cloudinaryService');
    if (cloudinary.isConfigured() && publicId) {
      const fittedUrl = cloudinary.getFittedUrl(publicId, platform, video ? 'video' : 'image');
      if (fittedUrl) {
        return {
          url: fittedUrl,
          mediaType: video ? 'video' : 'image',
          spec,
        };
      }
    }
  } catch {
    // Fall back to local
  }

  const inputPath = path.join(ORIGINALS_DIR, originalFilename);
  if (!fs.existsSync(inputPath)) throw new Error('Original media not found');


  const ext = video ? path.extname(originalFilename) || '.mp4' : '.jpg';
  const outputFilename = `${path.parse(originalFilename).name}-${platform}${ext}`;
  const outputPath = path.join(FITTED_DIR, outputFilename);

  if (!fs.existsSync(outputPath)) {
    if (video) {
      await fitVideo(inputPath, outputPath, spec);
    } else {
      await fitImage(inputPath, outputPath, spec);
    }
  }

  return {
    url: `/uploads/fitted/${outputFilename}`,
    mediaType: video ? 'video' : 'image',
    spec,
  };
}


async function uploadToCloudinary(filePath, mimetype) {
  try {
    const cloudinary = require('./cloudinaryService');
    if (cloudinary.isConfigured()) {
      const result = await cloudinary.upload(filePath, {
        folder: 'scripta/generated',
        resourceType: mimetype?.startsWith('video/') ? 'video' : 'image',
      });
      if (result) return result.url;
    }
  } catch { /* Cloudinary not available */ }
  return null;
}

async function generateImage({ prompt }) {
  if (!prompt || !prompt.trim()) throw new Error('A prompt is required');

  const filename = `${uuidv4()}.jpg`;
  const outputPath = path.join(ORIGINALS_DIR, filename);

  // AI image generation via Pollinations
  const encoded = encodeURIComponent(prompt);
  const res = await fetch(`https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true`);
  if (!res.ok) {
    throw new Error(`Image generation failed (${res.status}). Please try again.`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  // Upload to Cloudinary for a public HTTPS URL
  const cloudinaryUrl = await uploadToCloudinary(outputPath, 'image/jpeg');
  return {
    filename,
    mimetype: 'image/jpeg',
    mediaType: 'image',
    originalUrl: cloudinaryUrl || `/uploads/originals/${filename}`,
    provider: 'pollinations',
    publicId: null,
  };
}

function createVideoFromImage(imagePath, videoPath, duration = 5) {
  if (!ffmpeg) {
    return Promise.reject(new Error('ffmpeg binary is not available'));
  }
  const frameCount = duration * 25;
  // Premium Cinematic Zoom + Diagonal Pan + Vignette + Color Contrast adjustments
  const zoompanFilter = `zoompan=z='zoom+0.0008':x='(iw-iw/zoom)*(on/${frameCount})':y='(ih-ih/zoom)*(on/${frameCount})':d=${frameCount}:s=1024x1024,vignette=angle=0.3,eq=saturation=1.15:contrast=1.05`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop 1'])
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        `-t ${duration}`,
        '-pix_fmt yuv420p',
        `-vf ${zoompanFilter}`
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(videoPath);
  });
}

function trimVideo(inputPath, outputPath, duration = 5) {
  if (!ffmpeg) {
    return Promise.reject(new Error('ffmpeg binary is not available'));
  }
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        `-t ${duration}`,
        '-pix_fmt yuv420p',
        '-an'
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

async function searchAndDownloadCoverrVideo(prompt, videoOutputPath) {
  const keywords = prompt.trim()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['with', 'your', 'about', 'from', 'this', 'that', 'they', 'them', 'here', 'there'].includes(word.toLowerCase()));

  if (keywords.length >= 3) {
    console.log(`[Coverr] Prompt is descriptive (${keywords.length} keywords). Bypassing stock search to generate custom AI video.`);
    return false;
  }

  const searchQuery = keywords.slice(0, 3).join(' ') || 'nature';

  try {
    const searchUrl = `https://coverr.co/s?q=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Coverr search failed with status ${response.status}`);
    }

    const html = await response.text();
    const coverrRegex = /https:\/\/cdn\.coverr\.co\/videos\/[^"']+\/1080p\.mp4/g;
    const matches = html.match(coverrRegex) || [];
    const uniqueUrls = [...new Set(matches)];
    const filteredUrls = uniqueUrls.filter(url => !url.includes('paywall') && !url.includes('subscription'));

    let targetVideoUrl = null;
    if (filteredUrls.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(filteredUrls.length, 5));
      targetVideoUrl = filteredUrls[randomIndex];
    } else {
      const fallbackResponse = await fetch('https://coverr.co/s?q=nature', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const fallbackHtml = await fallbackResponse.text();
      const fallbackMatches = fallbackHtml.match(coverrRegex) || [];
      const fallbackUnique = [...new Set(fallbackMatches)].filter(url => !url.includes('paywall') && !url.includes('subscription'));
      if (fallbackUnique.length > 0) {
        targetVideoUrl = fallbackUnique[0];
      }
    }

    if (!targetVideoUrl) {
      throw new Error('No video URL matches found on Coverr');
    }

    const fileRes = await fetch(targetVideoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch video file: ${fileRes.statusText}`);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    fs.writeFileSync(videoOutputPath, buffer);
    return true;
  } catch (err) {
    console.error('Coverr video download failed:', err.message);
    return false;
  }
}

async function generateVideo({ prompt, duration = 5 }) {
  const filename = `${uuidv4()}.mp4`;
  const videoOutputPath = path.join(ORIGINALS_DIR, filename);

  console.log(`Starting real stock video generation for prompt: "${prompt}"`);

  // 1. Try to download a matching high-quality B-roll video clip from Coverr
  const tempPath = path.join(ORIGINALS_DIR, `temp-${uuidv4()}.mp4`);
  let downloaded = false;
  try {
    downloaded = await searchAndDownloadCoverrVideo(prompt, tempPath);
  } catch (err) {
    console.error('Error downloading Coverr video:', err.message);
  }

  if (downloaded) {
    try {
      // Trim the downloaded video to the requested duration
      console.log(`Trimming downloaded video to target duration of ${duration} seconds...`);
      try {
        await trimVideo(tempPath, videoOutputPath, duration);
      } catch (trimErr) {
        console.error('Failed to trim coverr video, falling back to full duration:', trimErr.message);
        fs.renameSync(tempPath, videoOutputPath);
      }

      const cloudinaryUrl = await uploadToCloudinary(videoOutputPath, 'video/mp4');

      // Cleanup tempPath
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (err) { }
      }

      return {
        filename,
        mimetype: 'video/mp4',
        mediaType: 'video',
        originalUrl: cloudinaryUrl || `/uploads/originals/${filename}`,
        provider: 'coverr-stock',
        publicId: null,
      };
    } catch (err) {
      console.error('Failed to store downloaded video to Cloudinary, serving locally:', err.message);
    }
  }

  // Cleanup tempPath if downloaded was false but file was somehow created
  if (fs.existsSync(tempPath)) {
    try {
      fs.unlinkSync(tempPath);
    } catch (err) { }
  }

  // 2. Fallback: Generate an image and convert it via ffmpeg
  console.log('Coverr download failed or empty, falling back to Ken Burns image conversion');
  const imageResult = await generateImage({ prompt });
  const imagePath = path.join(ORIGINALS_DIR, imageResult.filename);
  const fallbackVideoFilename = `${path.parse(imageResult.filename).name}.mp4`;
  const fallbackVideoOutputPath = path.join(ORIGINALS_DIR, fallbackVideoFilename);

  try {
    await createVideoFromImage(imagePath, fallbackVideoOutputPath, duration);
    const cloudinaryUrl = await uploadToCloudinary(fallbackVideoOutputPath, 'video/mp4');
    return {
      filename: fallbackVideoFilename,
      mimetype: 'video/mp4',
      mediaType: 'video',
      originalUrl: cloudinaryUrl || `/uploads/originals/${fallbackVideoFilename}`,
      provider: `${imageResult.provider}-ffmpeg-fallback`,
      publicId: null,
    };
  } catch (err) {
    console.error('Failed to convert image to video using ffmpeg:', err.message);
    return imageResult;
  }
}

/**
 * Store a file permanently: upload to Cloudinary if configured,
 * otherwise serve it locally from /uploads.
 */
async function storeAndGetUrl(filePath, mimetype, folder = 'originals') {
  try {
    const cloudinary = require('./cloudinaryService');
    if (cloudinary.isConfigured()) {
      const result = await cloudinary.upload(filePath, { folder: `scripta/${folder}`, resourceType: mimetype?.startsWith('video/') ? 'video' : 'image' });
      if (result) {
        return { url: result.url, publicId: result.publicId, local: false };
      }
    }
  } catch {
    // Cloudinary not available, fall through to local
  }
  // Local fallback — file is already on disk from multer
  const filename = path.basename(filePath);
  return { url: `/uploads/${folder}/${filename}`, publicId: null, local: true };
}

module.exports = { PLATFORM_SPECS, fitMediaForPlatform, generateImage, generateVideo, ORIGINALS_DIR, isVideo, storeAndGetUrl };