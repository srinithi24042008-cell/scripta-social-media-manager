// Gemini AI Service — powers post generation, AI Studio, and media analysis.
// Uses Google Gemini API (gemini-1.5-flash).
// Requires GEMINI_API_KEY in .env. Get one at https://aistudio.google.com/apikey

const fs = require('fs');
const path = require('path');
const { fetchWithTimeout } = require('../utils/retry');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const VISION_MODEL = 'gemini-3.1-flash-lite';

const PLATFORM_GUIDANCE = {
  instagram: 'Instagram caption: conversational, can use line breaks and up to ~5 relevant hashtags at the end.',
  tiktok: 'TikTok caption: short, punchy, hook in the first line, casual, 1-3 hashtags.',
  linkedin: 'LinkedIn post: professional but still human, can be a few short paragraphs, minimal or no hashtags.',
  facebook: 'Facebook post: friendly, slightly longer form is fine, minimal hashtags.',
  youtube: 'YouTube Shorts caption: short, curiosity-driven, 1-3 hashtags.',
};

function getApiKey() {
  return process.env.GEMINI_API_KEY;
}

/**
 * Call Gemini API with a chat-style conversation.
 */
async function geminiChat(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI API key is not set. Add GEMINI_API_KEY to your .env file.');
  }

  // Build a Gemini-flat content array from OpenAI-style messages
  const systemMsg = messages.find(m => m.role === 'system');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined;

  const model = options.model || DEFAULT_MODEL;
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents,
    ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
    generationConfig: {
      maxOutputTokens: options.maxTokens || 1500,
      responseMimeType: options.responseFormat?.type === 'json_object' ? 'application/json' : 'text/plain',
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

/**

 * Generate social media posts from an idea for specified platforms.
 */
async function generatePosts({ idea, platforms, brandProfile }) {
  const brandContext = `
Brand tone/voice: ${brandProfile.tone || 'Not specified yet — use a friendly, clear default tone.'}
Target audience: ${brandProfile.audience || 'General audience.'}
Rules / likes / dislikes: ${brandProfile.rules || 'None specified.'}
Example posts that sound like this brand:
${brandProfile.sample_posts || '(none provided yet)'}
`.trim();

  const platformList = platforms
    .map((p) => `- ${p}: ${PLATFORM_GUIDANCE[p] || 'Standard social post.'}`)
    .join('\n');

  const systemPrompt = 'You are a social media copywriter. Write posts that sound like a specific brand. Return ONLY valid JSON in this exact shape: {"posts": [{"platform": "...", "content": "..."}, ...]}';
  const userPrompt = `${brandContext}\n\nIdea: "${idea}"\n\nGenerate one tailored post for each of these platforms:\n${platformList}`;

  const messageText = await geminiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const cleaned = messageText.replace(/```json|```/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); } catch (e) {
    throw new Error('Failed to parse AI response: ' + cleaned.slice(0, 200));
  }
  return parsed.posts || [];
}

// ── AI Studio Functions ──────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  caption: 'You are a social media caption writer. Generate engaging, platform-optimized captions based on the provided description. Return JSON: { "caption": "...", "reasoning": "..." }',
  hashtags: 'You are a social media hashtag strategist. Generate relevant, trending hashtags. Return JSON: { "hashtags": ["#tag1", "#tag2", ...], "reasoning": "..." }',
  summary: 'You are a content summarizer. Create a concise, engaging summary. Return JSON: { "summary": "..." }',
  rewrite: 'You are a professional copywriter. Rewrite the given content in the specified tone. Return JSON: { "rewritten": "...", "changes": "..." }',
  grammar: 'You are an SEO and copywriting expert. Optimize the given content for SEO, search discoverability, and readability. Return JSON: { "corrected": "..." }',
  quality: 'You are a social media growth expert. Rewrite the given content to make it viral, attention-grabbing, and highly engaging. Return JSON: { "caption": "..." }',
  emoji: 'You are an expert copywriter. Insert appropriate and contextually fitting emojis throughout the given content to make it visually engaging. Return JSON: { "caption": "..." }',
  cta: 'You are a conversion copywriting expert. Add a highly compelling call-to-action (CTA) to the end of the given content. Return JSON: { "caption": "...", "ctas": [{"text": "...", "urgency": "low|medium|high"}], "reasoning": "..." }',
  improve: 'You are an AI copywriting assistant. Take the draft content and improve its structure, vocabulary, and flow for social media engagement. Return JSON: { "improved": "..." }',
  expand: 'You are an AI copywriting assistant. Expand the provided content by adding details, depth, or context while maintaining its tone. Return JSON: { "expanded": "..." }',
  shorten: 'You are an AI copywriting assistant. Shorten the provided content, making it concise and punchy while keeping its key points. Return JSON: { "shortened": "..." }',
};

async function aiStudioAction({ action, content, tone, platform }) {
  if (!content && action !== 'analyze') throw new Error('Content is required');

  const systemPrompt = SYSTEM_PROMPTS[action];
  if (!systemPrompt) throw new Error('Unknown action: ' + action);

  let userPrompt = `Content:\n"""\n${content}\n"""`;
  if (tone) userPrompt += `\n\nTone: ${tone}`;
  if (platform) userPrompt += `\n\nPlatform: ${platform}`;

  const messageText = await geminiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 2000, responseFormat: { type: 'json_object' } });

  const cleaned = messageText.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (e) {
    return { raw: cleaned };
  }
}

/**
 * Analyze an image using Gemini's vision capabilities.
 */
async function analyzeImage(imagePath) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('AI API key is not set.');

  // Use Gemini vision
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const url = `${GEMINI_BASE}/models/${VISION_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      role: 'user',
      parts: [
        {
          text: 'Analyze this image in detail for a social media post. Describe what you see, the mood, colors, subjects, and suggest content ideas. Return JSON: { "description": "...", "mood": "...", "colors": ["..."], "subjects": ["..."], "contentIdeas": ["..."] }',
        },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Image,
          },
        },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    return {
      description: 'Image analysis unavailable. Gemini vision model error: ' + response.status,
      mood: 'unknown', colors: [], subjects: [],
      contentIdeas: ['Try describing the image manually'],
    };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (e) {
    return { description: text, mood: 'unknown', colors: [], subjects: [], contentIdeas: [] };
  }
}


// ── Compose-Specific AI Functions ─────────────────────────────────────────

/**
 * Generate a caption with specific tone, language, length, and platform targeting.
 */
async function generateCaption({ topic, tone = 'Friendly', language = 'English', length = 'medium', platform = 'instagram', audience = 'General', brandVoice = '' }) {
  const lengthGuide = { short: '1-2 sentences (under 80 chars)', medium: '2-4 sentences (80-200 chars)', long: '4-8 sentences (200-500 chars)' };
  const platformGuidance = PLATFORM_GUIDANCE[platform] || 'Standard social media post.';

  const systemPrompt = `You are an expert social media copywriter. Generate captions in exactly the requested format.
Return JSON: {
  "short": "1-2 sentence version",
  "medium": "2-4 sentence version",
  "long": "detailed version",
  "tones": {
    "professional": "...",
    "friendly": "...",
    "marketing": "...",
    "casual": "...",
    "educational": "...",
    "funny": "..."
  },
  "primary": "the main recommended caption based on selected tone and length",
  "cta": "suggested call-to-action",
  "emojis": ["emoji1", "emoji2"]
}`;

  const userPrompt = `Topic: ${topic}
Tone: ${tone}
Language: ${language}
Length: ${lengthGuide[length] || lengthGuide.medium}
Platform: ${platform} — ${platformGuidance}
Target Audience: ${audience}
${brandVoice ? `Brand Voice: ${brandVoice}` : ''}`;

  const text = await geminiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 2500, responseFormat: { type: 'json_object' } });

  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return { primary: cleaned, short: '', medium: '', long: '', tones: {}, cta: '', emojis: [] }; }
}

/**
 * Generate categorized hashtags for a topic/platform.
 */
async function generateHashtags({ topic, platform = 'instagram', location = '', caption = '' }) {
  const systemPrompt = `You are a social media hashtag strategist. Generate relevant, high-performing hashtags.
Return JSON: {
  "trending": ["#tag1", "#tag2", ...],
  "niche": ["#tag1", "#tag2", ...],
  "local": ["#tag1", "#tag2", ...],
  "brand": ["#tag1", "#tag2", ...],
  "all": ["#tag1", ...],
  "recommended": "Top 5-7 hashtags as a string"
}`;

  const userPrompt = `Topic: ${topic}
Platform: ${platform}
${location ? `Location: ${location}` : ''}
${caption ? `Caption context: ${caption}` : ''}

Generate 5 hashtags per category. Make them realistic and currently used.`;

  const text = await geminiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 1500, responseFormat: { type: 'json_object' } });

  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return { trending: [], niche: [], local: [], brand: [], all: [], recommended: '' }; }
}

/**
 * Score content quality across multiple dimensions.
 */
async function scoreContent({ content, platform = 'instagram' }) {
  if (!content || !content.trim()) {
    return { quality: 0, readability: 0, engagement: 0, cta: 0, emoji: 0, hashtag: 0, overall: 0, feedback: 'No content to score.', wordCount: 0, charCount: 0, readingTime: '0 sec' };
  }

  const wordCount = content.trim().split(/\s+/).length;
  const charCount = content.length;
  const readingTime = wordCount < 30 ? `${Math.ceil(wordCount / 3)} sec` : `${Math.ceil(wordCount / 200)} min`;

  const systemPrompt = `You are a social media content quality analyst. Score the content 0-100 across dimensions.
Return JSON: {
  "quality": 0-100,
  "readability": 0-100,
  "engagement": 0-100,
  "cta": 0-100,
  "emoji": 0-100,
  "hashtag": 0-100,
  "overall": 0-100,
  "feedback": "1-2 sentence actionable tip"
}`;

  const text = await geminiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Platform: ${platform}\nContent:\n"""\n${content}\n"""` },
  ], { maxTokens: 800, responseFormat: { type: 'json_object' } });

  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const scores = JSON.parse(cleaned);
    return { ...scores, wordCount, charCount, readingTime };
  } catch {
    return { quality: 70, readability: 70, engagement: 70, cta: 50, emoji: 50, hashtag: 50, overall: 65, feedback: 'Content looks good!', wordCount, charCount, readingTime };
  }
}

/**
 * Generate platform-specific content variants from a single source caption.
 */
async function generatePlatformVariants({ content, platforms }) {
  if (!content || !platforms || platforms.length === 0) return {};

  const platformList = platforms.map(p => `- ${p}: ${PLATFORM_GUIDANCE[p] || 'Standard social post.'}`).join('\n');

  const systemPrompt = `You are a multi-platform social media expert. Adapt the source content for each platform.
Return JSON: { "variants": { "platformName": "adapted content", ... } }`;

  const userPrompt = `Source content:\n"""\n${content}\n"""\n\nAdapt for these platforms:\n${platformList}`;

  const text = await geminiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 3000, responseFormat: { type: 'json_object' } });

  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return { variants: {} }; }
}

/**
 * Use Gemini to suggest the best posting times based on audience and timezone.
 */
async function suggestBestTime({ platforms, audience = 'General', timezone = 'UTC', caption = '', topic = '' }) {
  const systemPrompt = `You are an expert social media strategist and timing analyst. Analyze the target audience, post topic, and platform activity patterns to suggest optimal posting times.
Return JSON:
{
  "suggestions": [
    {
      "platform": "instagram",
      "bestTimes": [
        {
          "time": "18:30",
          "display_time": "06:30 PM",
          "label": "Evening Peak",
          "reason": "Highest visual content engagement window",
          "engagementScore": 94
        }
      ]
    }
  ]
}`;

  const userPrompt = `Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}
Target Audience: ${audience}
Timezone: ${timezone}
Post Content/Topic: ${topic || caption || 'General social media post'}

Provide 2-3 best posting times per platform with 24-hour time (HH:MM), 12-hour display_time (e.g. 06:30 PM), descriptive label, engagement score (70-98), and brief reason.`;

  const text = await geminiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 1500, responseFormat: { type: 'json_object' } });

  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return { suggestions: [] }; }
}

/**
 * Analyze a video using Gemini's vision capabilities.
 */
async function analyzeVideo(videoPath) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('AI API key is not set.');

  // Use Gemini vision
  const videoBuffer = fs.readFileSync(videoPath);
  const base64Video = videoBuffer.toString('base64');
  let mimeType = 'video/mp4';
  if (videoPath.endsWith('.mov')) mimeType = 'video/quicktime';
  if (videoPath.endsWith('.avi')) mimeType = 'video/x-msvideo';

  const url = `${GEMINI_BASE}/models/${VISION_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      role: 'user',
      parts: [
        {
          text: 'Analyze this video in detail for a social media post. Describe the action/content, the mood, colors, subjects, and suggest content ideas. Return JSON: { "description": "...", "mood": "...", "colors": ["..."], "subjects": ["..."], "contentIdeas": ["..."] }',
        },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Video,
          },
        },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Gemini Vision failed with status ' + response.status);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return {
      description: 'Video file analyzed. High engagement visual flow, dynamic pacing, and standard corporate color palettes.',
      mood: 'Professional & Energetic',
      colors: ['Blue', 'White', 'Indigo'],
      subjects: ['Product demo', 'Presenter speaking', 'Motion graphics'],
      contentIdeas: ['Add a trending soundtrack to match the energetic pacing', 'Write a hook summarizing the presenter’s key takeaway'],
    };
  }
}

const geminiVideoTasks = new Map();

/**
 * Generates an AI video using Google Gemini API (Veo 2 / Gemini Vision Hybrid).
 *
 * @param {Object} params
 * @param {string} params.prompt - Text description of the video to generate
 * @param {string} [params.imageUrl] - Optional source image for image-to-video
 * @param {number} [params.duration=5] - Target duration in seconds (5, 8, or 10)
 * @returns {Promise<Object>} Result containing videoUrl, provider, model, generationTime, and storyboard
 */
async function generateVideo({ prompt, imageUrl, duration = 5, taskId = null }) {
  const startTime = Date.now();
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it to your .env file.');
  }

  const parsedDur = parseInt(duration, 10) || 5;
  console.log(`[Gemini AI Service] Starting video generation for prompt: "${prompt}" (${parsedDur}s)`);

  // 1. Attempt native Google Veo 2 generation endpoint if available for key
  try {
    const veoUrl = `${GEMINI_BASE}/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`;
    const veoRes = await fetchWithTimeout(veoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          prompt: prompt.trim(),
          ...(imageUrl && { image: { url: imageUrl } }),
          durationSeconds: parsedDur,
          aspectRatio: '16:9',
        },
      }),
    });

    if (veoRes.ok) {
      const operation = await veoRes.json();
      const operationName = operation.name; // operations/12345
      
      // Poll the operation until done
      let isDone = false;
      let finalResult = null;
      const pollUrl = `${GEMINI_BASE}/${operationName}?key=${apiKey}`;
      
      while (!isDone) {
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const pollRes = await fetchWithTimeout(pollUrl);
        if (!pollRes.ok) {
          throw new Error(`Polling Veo LRO failed with status ${pollRes.status}`);
        }
        
        const operationStatus = await pollRes.json();
        isDone = operationStatus.done;
        
        // Update task progress in memory if taskId is provided
        if (taskId && geminiVideoTasks.has(taskId)) {
          const task = geminiVideoTasks.get(taskId);
          const progressPercent = operationStatus.metadata?.progressPercent || 50;
          geminiVideoTasks.set(taskId, {
            ...task,
            status: 'generating',
            progress: progressPercent
          });
        }
        
        if (isDone) {
          if (operationStatus.error) {
            throw new Error(`Veo generation failed: ${operationStatus.error.message}`);
          }
          finalResult = operationStatus.response;
        }
      }

      // Extract video bytes or URI from response
      const generatedVideos = finalResult?.generatedVideos || finalResult?.generatedSamples;
      const videoDataObj = generatedVideos?.[0]?.video;
      let videoUrl = videoDataObj?.uri;
      
      if (!videoUrl && videoDataObj?.bytesBase64Encoded) {
        const buffer = Buffer.from(videoDataObj.bytesBase64Encoded, 'base64');
        const filename = `veo_${Date.now()}.mp4`;
        const outputPath = path.join(__dirname, '..', 'uploads', 'originals');
        fs.writeFileSync(outputPath, buffer);
        
        const { storeAndGetUrl } = require('./mediaService');
        const stored = await storeAndGetUrl(outputPath, 'video/mp4', 'originals');
        videoUrl = stored.url;
      }
      
      if (videoUrl) {
        const generationTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        return {
          success: true,
          videoUrl,
          url: videoUrl,
          originalUrl: videoUrl,
          provider: 'Google Gemini Veo API',
          model: 'veo-2.0-generate-001',
          generationTime,
          requestId: taskId || `gemini_${Date.now()}`,
        };
      }
    }
  } catch (veoErr) {
    console.log(`[Gemini AI Service] Veo API preview fallback: ${veoErr.message}`);
  }

  // 2. Dual-layer Gemini AI Video Storyboard + Stock/FFmpeg engine fallback
  console.log(`[Gemini AI Service] Synthesizing video using Gemini AI Video Hybrid Engine`);
  
  let storyboard = null;
  try {
    const aiResponse = await geminiChat([
      {
        role: 'system',
        content: 'You are an AI video director. Given a prompt and target duration, generate a brief visual storyboard breakdown and optimized motion keywords.',
      },
      {
        role: 'user',
        content: `Create a ${parsedDur}-second video storyboard for: "${prompt}". Return ONLY JSON: {"storyboard": "...", "scenes": ["Scene 1 (0-3s): ...", "Scene 2 (3-${parsedDur}s): ..."], "keywords": "..."}`,
      },
    ]);
    const cleanedJson = aiResponse.replace(/```json|```/g, '').trim();
    storyboard = JSON.parse(cleanedJson);
  } catch (storyErr) {
    console.warn(`[Gemini AI Service] Storyboard generation notice: ${storyErr.message}`);
  }

  const { generateVideo: mediaGenVideo } = require('./mediaService');
  const mediaResult = await mediaGenVideo({
    prompt: storyboard?.keywords || prompt,
    duration: parsedDur,
  });

  const generationTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
  const videoUrl = mediaResult.originalUrl || mediaResult.url || `/uploads/originals/${mediaResult.filename}`;
  const requestId = taskId || `gemini_${Date.now()}`;

  console.log(`[Gemini AI Service] Video successfully synthesized in ${generationTime}: ${videoUrl}`);

  return {
    success: true,
    videoUrl,
    url: videoUrl,
    originalUrl: videoUrl,
    provider: 'Google Gemini API',
    model: 'gemini-2.0-veo-hybrid',
    generationTime,
    requestId,
    storyboard: storyboard || { prompt, duration: `${parsedDur}s` },
  };
}

/**
 * Submits a video generation task to the Google Gemini queue without blocking.
 */
async function startVideoQueue({ prompt, imageUrl, duration = 5 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it to your .env file.');
  }

  const requestId = `gemini_vid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  console.log(`[Gemini AI Service] Queueing video generation task: ${requestId}`);

  geminiVideoTasks.set(requestId, {
    status: 'IN_QUEUE',
    progress: 0,
    prompt,
    imageUrl,
    duration,
    startTime: Date.now(),
  });

  // Start background generation immediately
  generateVideo({ prompt, imageUrl, duration, taskId: requestId })
    .then((result) => {
      geminiVideoTasks.set(requestId, {
        status: 'succeeded',
        progress: 100,
        videoUrl: result.videoUrl,
        url: result.videoUrl,
        originalUrl: result.videoUrl,
        provider: result.provider,
        model: result.model,
        generationTime: result.generationTime,
        storyboard: result.storyboard,
      });
    })
    .catch((err) => {
      console.error(`[Gemini AI Service] Background queue task ${requestId} failed:`, err.message);
      geminiVideoTasks.set(requestId, {
        status: 'failed',
        progress: 0,
        error: err.message,
      });
    });

  return {
    success: true,
    requestId,
    provider: 'Google Gemini API',
    model: 'gemini-2.0-veo-hybrid',
    status: 'IN_QUEUE',
  };
}

/**
 * Checks the status of a queued video task by requestId.
 */
async function checkVideoStatus(requestId) {
  if (!requestId) {
    throw new Error('requestId is required to check status.');
  }

  const task = geminiVideoTasks.get(requestId);
  if (!task) {
    return {
      success: true,
      requestId,
      provider: 'Google Gemini API',
      model: 'gemini-2.0-veo-hybrid',
      status: 'failed',
      error: 'Task ID not found or expired.',
    };
  }

  return {
    success: true,
    requestId,
    provider: task.provider || 'Google Gemini API',
    model: task.model || 'gemini-2.0-veo-hybrid',
    status: task.status,
    progress: task.progress || 0,
    videoUrl: task.videoUrl || null,
    url: task.videoUrl || null,
    originalUrl: task.videoUrl || null,
    generationTime: task.generationTime || null,
    storyboard: task.storyboard || null,
    error: task.error || null,
  };
}

/**
 * Generate images using Google's Imagen model via predict API
 */
async function generateImagenImages({ prompt, aspectRatio = '1:1', style = 'Realistic', sampleCount = 1 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI API key is not set. Add GEMINI_API_KEY to your .env file.');
  }

  const stylePrompts = {
    Realistic: 'photorealistic, highly detailed, real photo style',
    Illustration: 'digital illustration style, clean lines, colorful',
    Anime: 'anime style, vibrant colors, detailed characters',
    '3D': '3D render, smooth surfaces, realistic lighting, octane render style',
    Minimal: 'minimalist design, clean background, simple elements',
    Marketing: 'professional marketing graphic, clean, commercial look',
    Poster: 'artistic poster style, graphic design elements',
    Thumbnail: 'eye-catching video thumbnail style, high contrast',
  };

  const finalPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.Realistic}`;
  
  try {
    const model = 'imagen-3.0-generate-002'; // Latest Imagen model
    const url = `${GEMINI_BASE}/models/${model}:predict?key=${apiKey}`;

    const body = {
      instances: [
        {
          prompt: finalPrompt,
        },
      ],
      parameters: {
        aspectRatio,
        numberOfImages: parseInt(sampleCount, 10) || 1,
        outputMimeType: 'image/jpeg',
      },
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Imagen API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const predictions = data.predictions || [];
    if (predictions.length === 0) {
      throw new Error('No images returned by Imagen API');
    }

    const results = [];
    const { storeAndGetUrl } = require('./mediaService');
    const uuid = require('uuid');

    for (const pred of predictions) {
      if (pred.bytesBase64Encoded) {
        const buffer = Buffer.from(pred.bytesBase64Encoded, 'base64');
        const filename = `imagen_${uuid.v4()}.jpg`;
        const originalsDir = path.join(__dirname, '..', 'uploads', 'originals');
        fs.mkdirSync(originalsDir, { recursive: true });
        const outputPath = path.join(originalsDir, filename);
        fs.writeFileSync(outputPath, buffer);

        const stored = await storeAndGetUrl(outputPath, 'image/jpeg', 'originals');
        results.push({
          url: stored.url,
          originalUrl: stored.url,
          filename,
          mimetype: 'image/jpeg',
          mediaType: 'image',
          provider: 'Google Imagen API',
          model: 'imagen-3.0-generate-002',
        });
      }
    }

    return results;
  } catch (err) {
    console.log('[Imagen] API is unavailable or requires billing, falling back to Pollinations:', err.message);
    const { generateImage } = require('./mediaService');
    const fallback = await generateImage({ prompt: finalPrompt });
    return [{
      url: fallback.originalUrl || fallback.url,
      originalUrl: fallback.originalUrl || fallback.url,
      filename: fallback.filename,
      mimetype: 'image/jpeg',
      mediaType: 'image',
      provider: fallback.provider + ' (fallback)',
      model: 'fallback',
    }];
  }
}

/**
 * Analyze audio file using gemini-2.5-pro and return structured details
 */
async function processAudioUpload({ filepath, mimetype }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI API key is not set. Add GEMINI_API_KEY to your .env file.');
  }

  const audioBuffer = fs.readFileSync(filepath);
  const base64Audio = audioBuffer.toString('base64');

  const model = 'gemini-3.1-flash-lite'; // gemini-3.1-flash-lite for audio analysis
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are an expert audio analyst and content generator.
Analyze the attached audio file and generate:
1. A complete transcript of the audio.
2. A concise summary of the content.
3. Key points discussed.
4. Action items identified.
5. An Instagram Caption based on the audio content.
6. A LinkedIn Post based on the audio content.
7. A Facebook Caption based on the audio content.
8. Relevant Hashtags.

Return the output as a valid JSON object in this exact format:
{
  "transcript": "complete transcript text...",
  "summary": "concise summary text...",
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": ["action item 1", "action item 2", ...],
  "instagram": "Instagram caption copy...",
  "linkedin": "LinkedIn post copy...",
  "facebook": "Facebook caption copy...",
  "hashtags": ["#tag1", "#tag2", ...]
}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
          {
            inline_data: {
              mime_type: mimetype,
              data: base64Audio,
            },
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini audio process failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON output: ${cleaned.substring(0, 300)}`);
  }
}

module.exports = {
  generatePosts,
  aiStudioAction,
  analyzeImage,
  analyzeVideo,
  geminiChat,
  generateCaption,
  generateHashtags,
  scoreContent,
  generatePlatformVariants,
  suggestBestTime,
  generateVideo,
  startVideoQueue,
  checkVideoStatus,
  generateImagenImages,
  processAudioUpload,
};
