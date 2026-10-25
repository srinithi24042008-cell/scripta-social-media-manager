const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const {
  aiStudioAction,
  analyzeImage,
  analyzeVideo,
  generateCaption,
  generateHashtags,
  scoreContent,
  generatePlatformVariants,
  suggestBestTime,
  startVideoQueue: geminiGenerateVideo,
  checkVideoStatus: geminiCheckVideoStatus,
} = require('../services/geminiService');
const { storeAndGetUrl } = require('../services/mediaService');
const { createNotification } = require('../services/notificationService');
const { upload: uploadToCloudinary } = require('../services/cloudinaryService');

const { workspaceContext } = require('../middleware/workspace');

const router = express.Router();
router.use(requireAuth);
router.use(workspaceContext);
router.use((req, res, next) => {
  if (req.userRole === 'viewer') {
    return res.status(403).json({ error: 'Access denied: Viewers cannot use AI Studio.' });
  }
  next();
});

const AI_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'ai-analysis');
fs.mkdirSync(AI_UPLOAD_DIR, { recursive: true });

// Secure file type allowlist — same rules as media.js upload route
const AI_ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm']);
const AI_BLOCKED_EXTENSIONS = new Set(['.html', '.htm', '.svg', '.js', '.php', '.exe', '.bat', '.sh', '.xml']);

function isAllowedAIFile(originalname, mimetype) {
  const ext = path.extname(originalname).toLowerCase();
  if (AI_BLOCKED_EXTENSIONS.has(ext)) return false;
  if (!AI_ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!mimetype.startsWith('image/') && !mimetype.startsWith('video/')) return false;
  return true;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, AI_UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isAllowedAIFile(file.originalname, file.mimetype)) {
      return cb(new Error('File type not allowed. Only images (jpg, jpeg, png, webp, gif) and videos (mp4, mov, webm) are supported.'), false);
    }
    cb(null, true);
  },
});

function cleanup(filepath) {
  if (filepath) fs.unlink(filepath, () => { });
}

// ── Existing Endpoints ──────────────────────────────────────────────────────

// Unified AI Studio action endpoint
router.post('/action', async (req, res) => {
  const { action, content, tone, platform } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });
  try {
    const result = await aiStudioAction({ action, content, tone, platform });

    // Trigger AI success notification removed

    res.json(result);
  } catch (err) {
    // Trigger AI failure notification removed
    res.status(502).json({ error: err.message });
  }
});

// Image/Video analysis — uploads to Cloudinary (if configured), then analyzes via Gemini vision
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  const filepath = req.file?.path;
  if (!req.file) return res.status(400).json({ error: 'Media file is required' });
  try {
    try {
      await storeAndGetUrl(filepath, req.file.mimetype, 'ai-analysis');
    } catch {
      // Cloudinary upload is optional for analysis; continue with local file
    }
    const isVideo = req.file.mimetype.startsWith('video/');
    const result = isVideo ? await analyzeVideo(filepath) : await analyzeImage(filepath);

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  } finally {
    cleanup(filepath);
  }
});

// Batch AI Studio: upload image/video → Cloudinary → analyze → generate caption + hashtags
router.post('/from-image', upload.single('image'), async (req, res) => {
  const filepath = req.file?.path;
  if (!req.file) return res.status(400).json({ error: 'Media file is required' });
  try {
    const isVideo = req.file.mimetype.startsWith('video/');
    const analysis = isVideo ? await analyzeVideo(filepath) : await analyzeImage(filepath);
    const captionResult = await aiStudioAction({
      action: 'caption',
      content: `Image description: ${analysis.description || ''}. Mood: ${analysis.mood || ''}. Subjects: ${(analysis.subjects || []).join(', ')}`,
    });
    const hashtagResult = await aiStudioAction({
      action: 'hashtags',
      content: captionResult.caption || analysis.description || '',
    });

    // Trigger AI success notification removed

    res.json({ analysis, caption: captionResult, hashtags: hashtagResult });
  } catch (err) {
    // Trigger AI failure notification removed
    res.status(502).json({ error: err.message });
  } finally {
    cleanup(filepath);
  }
});

// Generate AI Insights from analytics data
router.post('/insights', async (req, res) => {
  const { analyticsData } = req.body;
  if (!analyticsData) return res.status(400).json({ error: 'analyticsData is required' });

  try {
    const { geminiChat } = require('../services/geminiService');
    const systemPrompt = 'You are a social media expert analyst. Given raw analytics data, provide 3 short, actionable, and specific tips for the user to improve their social media strategy. Return JSON: { "insights": ["tip 1", "tip 2", "tip 3"] }';

    const dataSummary = {
      aggregate: analyticsData.aggregate,
      platformBreakdown: analyticsData.platformBreakdown,
      daysOfData: analyticsData.timeline?.length || 0
    };

    const responseText = await geminiChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this data: ${JSON.stringify(dataSummary)}` },
    ], { maxTokens: 800, responseFormat: { type: 'json_object' } });

    const cleaned = responseText.replace(/```json|```/g, '').trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      result = { insights: ["Post more consistently.", "Engage with your audience in the comments.", "Use more video content."] };
    }

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── New Compose-Specific Endpoints ─────────────────────────────────────────

/**
 * POST /api/ai/generate-caption
 * Generate platform-optimized captions with tone, language, length controls
 */
router.post('/generate-caption', async (req, res) => {
  const { topic, tone, language, length, platform, audience, brandVoice } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }
  try {
    const result = await generateCaption({ topic: topic.trim(), tone, language, length, platform, audience, brandVoice });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/ai/generate-hashtags
 * Generate categorized hashtags: trending, niche, local, brand
 */
router.post('/generate-hashtags', async (req, res) => {
  const { topic, platform, location, caption } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }
  try {
    const result = await generateHashtags({ topic: topic.trim(), platform, location, caption });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/ai/content-score
 * Score content across quality, readability, engagement, CTA, emoji, hashtag dimensions
 */
router.post('/content-score', async (req, res) => {
  const { content, platform } = req.body;
  try {
    const result = await scoreContent({ content, platform });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/ai/platform-content
 * Auto-generate platform-specific content variants from a single source caption
 */
router.post('/platform-content', async (req, res) => {
  const { content, platforms } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'platforms (non-empty array) is required' });
  }
  try {
    const result = await generatePlatformVariants({ content: content.trim(), platforms });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/ai/best-time
 * Gemini-powered best posting time suggestions based on audience and timezone
 */
router.post('/best-time', async (req, res) => {
  const { platforms, audience, timezone } = req.body;
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'platforms (non-empty array) is required' });
  }
  try {
    const result = await suggestBestTime({ platforms, audience, timezone });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/ai/compile-package
 * Compile full campaign package with caption, hashtags, CTA, best times, and variants
 */
router.post('/compile-package', async (req, res) => {
  const { prompt, platform, tone, language } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const platforms = ['instagram', 'facebook', 'linkedin', 'youtube'];
    const [captionRes, hashtagRes, ctaRes, bestTimeRes] = await Promise.all([
      generateCaption({ topic: prompt.trim(), tone, language, platform }),
      generateHashtags({ topic: prompt.trim(), platform }),
      aiStudioAction({ action: 'cta', content: prompt.trim(), tone, platform }),
      suggestBestTime({ platforms, audience: 'General' })
    ]);

    const mainCaption = captionRes.caption || captionRes.text || '';
    const platformVariants = await generatePlatformVariants({ content: mainCaption, platforms });

    res.json({
      caption: mainCaption,
      hashtags: hashtagRes.all || hashtagRes.trending || [],
      ctas: ctaRes.ctas || [],
      bestTimes: bestTimeRes.suggestions || bestTimeRes || [],
      platformVariants: platformVariants.variants || platformVariants || {}
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/ai/video/generate
 * Generate video using Fal AI given a text prompt (and optional image URL)
 */
router.post('/video/generate', async (req, res) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  const { prompt, imageUrl, duration } = req.body;
  if (!prompt && !imageUrl) {
    return res.status(400).json({ error: 'A prompt or imageUrl is required for video generation' });
  }
  try {
    const parsedDuration = parseInt(duration, 10) || 5;
    const result = await geminiGenerateVideo({ prompt, imageUrl, duration: parsedDuration });
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/ai/video/generate Error Details]:', err.message || err, err.body || err.detail || JSON.stringify(err));
    res.status(502).json({ error: err.message || err.detail || JSON.stringify(err), body: err.body });
  }
});

/**
 * GET /api/ai/video/status/:requestId
 */
router.get('/video/status/:requestId', async (req, res) => {
  try {
    const statusResult = await geminiCheckVideoStatus(req.params.requestId);
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
        videoUrl: finalUrl,
        url: finalUrl,
        originalUrl: finalUrl,
        mediaType: 'video',
        mimetype: 'video/mp4',
        filename: `gemini_${req.params.requestId}.mp4`
      });
    }
    res.json(statusResult);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Multer config for audio upload
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, AI_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') ||
      ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].some(ext => file.originalname.toLowerCase().endsWith(ext));
    cb(ok ? null : new Error('Only audio files (mp3, wav, ogg, m4a, aac) are supported'), ok);
  },
});

// POST /api/ai/text/generate — Text generator
router.post('/text/generate', async (req, res) => {
  const { prompt, platform, tone, language, length, creativity } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const { geminiChat } = require('../services/geminiService');

    let temperature = 0.7;
    if (creativity === 'low') temperature = 0.2;
    if (creativity === 'high') temperature = 1.0;

    const systemPrompt = `You are a professional AI copywriting assistant. Generate content optimized for the requested platform/type, tone, language, and length.`;
    const userPrompt = `
Topic/Prompt: "${prompt.trim()}"
Platform/Type: "${platform || 'Instagram'}"
Tone: "${tone || 'Friendly'}"
Language: "${language || 'English'}"
Length: "${length || 'Medium'}"
`;

    const generatedText = await geminiChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gemini-3.1-flash-lite',
      temperature,
      maxTokens: 2000
    });

    res.json({ text: generatedText });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/ai/image/generate — Image generator (Imagen 3)
router.post('/image/generate', async (req, res) => {
  const { prompt, aspectRatio, style, sampleCount } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const { generateImagenImages } = require('../services/geminiService');
    const results = await generateImagenImages({
      prompt: prompt.trim(),
      aspectRatio: aspectRatio || '1:1',
      style: style || 'Realistic',
      sampleCount: sampleCount || 1
    });
    res.status(201).json({ images: results });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/ai/audio/tts — Text to speech audio generation
router.post('/audio/tts', async (req, res) => {
  const { text, language, speed, voice, emotion } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const cleanText = text.replace(/#\w+/g, '').trim();
    const lang = language ? language.split('-')[0] : 'en';

    const chunks = [];
    let currentText = cleanText;
    while (currentText.length > 0) {
      if (currentText.length <= 150) {
        chunks.push(currentText);
        break;
      }
      let lastSpace = currentText.lastIndexOf(' ', 150);
      if (lastSpace === -1) lastSpace = 150;
      chunks.push(currentText.substring(0, lastSpace).trim());
      currentText = currentText.substring(lastSpace).trim();
    }

    const buffers = [];
    for (const chunk of chunks) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const audioRes = await fetch(ttsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!audioRes.ok) {
        throw new Error(`Google TTS failed with status ${audioRes.status}`);
      }
      buffers.push(Buffer.from(await audioRes.arrayBuffer()));
    }

    const finalBuffer = Buffer.concat(buffers);
    const filename = `tts_${Date.now()}.mp3`;
    const originalsDir = path.join(__dirname, '..', 'uploads', 'originals');
    fs.mkdirSync(originalsDir, { recursive: true });
    const outputPath = path.join(originalsDir, filename);
    fs.writeFileSync(outputPath, finalBuffer);

    const { storeAndGetUrl } = require('../services/mediaService');
    const stored = await storeAndGetUrl(outputPath, 'audio/mp3', 'originals');

    res.status(201).json({
      url: stored.url,
      originalUrl: stored.url,
      filename,
      mimetype: 'audio/mp3',
      mediaType: 'audio',
      provider: 'Google Translate TTS',
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/ai/audio/process — Audio upload analysis
router.post('/audio/process', audioUpload.single('audio'), async (req, res) => {
  const filepath = req.file?.path;
  if (!req.file) return res.status(400).json({ error: 'Audio file is required' });
  try {
    const { processAudioUpload } = require('../services/geminiService');
    const result = await processAudioUpload({
      filepath,
      mimetype: req.file.mimetype
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  } finally {
    cleanup(filepath);
  }
});

module.exports = router;
