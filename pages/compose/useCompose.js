// useCompose.js — Central state management hook for the Compose page
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  saveDraft, updateDraft, getDrafts, getAccounts, getBrand,
  uploadMedia, analyzeImageFull, getContentScore,
} from './composeApi';


const AUTOSAVE_DELAY = 10000; // 10 seconds
const SESSION_KEY = 'compose_unsaved_draft';

const PLATFORM_CHAR_LIMITS = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  youtube: 5000,
};

const VALID_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'youtube'];

export function useCompose() {
  // ── Core content ────────────────────────────────────────────────────────
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [platformContent, setPlatformContent] = useState({}); // per-platform caption overrides

  // ── AI Settings ──────────────────────────────────────────────────────────
  const [aiTone, setAiTone] = useState('Friendly');
  const [aiLanguage, setAiLanguage] = useState('English');
  const [aiLength, setAiLength] = useState('medium');
  const [aiAudience, setAiAudience] = useState('General');
  const [brandVoice, setBrandVoice] = useState('');

  // ── AI Outputs ───────────────────────────────────────────────────────────
  const [generatedCaptions, setGeneratedCaptions] = useState(null); // {short, medium, long, tones, primary}
  const [generatedHashtags, setGeneratedHashtags] = useState(null); // {trending, niche, local, brand}
  const [contentScore, setContentScore] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [bestTimes, setBestTimes] = useState(null);

  // ── AI loading states ────────────────────────────────────────────────────
  const [aiCaptionBusy, setAiCaptionBusy] = useState(false);
  const [aiHashtagBusy, setAiHashtagBusy] = useState(false);
  const [aiScoreBusy, setAiScoreBusy] = useState(false);
  const [aiImproveBusy, setAiImproveBusy] = useState(false);
  const [aiPlatformBusy, setAiPlatformBusy] = useState(false);
  const [aiTimeBusy, setAiTimeBusy] = useState(false);
  const [imageAnalysisBusy, setImageAnalysisBusy] = useState(false);

  // ── Media ────────────────────────────────────────────────────────────────
  const [media, setMedia] = useState(null); // { url, publicId, mediaType, originalUrl }
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Scheduling ───────────────────────────────────────────────────────────
  const [publishMode, setPublishMode] = useState('now'); // 'now' | 'schedule' | 'draft' | 'recurring'
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // ── Publishing state ─────────────────────────────────────────────────────
  const [publishStatus, setPublishStatus] = useState({}); // { platformId: 'idle'|'publishing'|'success'|'failed' }
  const [publishResults, setPublishResults] = useState({});
  const [publishBusy, setPublishBusy] = useState(false);

  // ── Drafts ────────────────────────────────────────────────────────────────
  const [draftId, setDraftId] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const [lastSaved, setLastSaved] = useState(null);

  // ── App data ──────────────────────────────────────────────────────────────
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Preview ───────────────────────────────────────────────────────────────
  const [previewPlatform, setPreviewPlatform] = useState('instagram');
  const [previewMode, setPreviewMode] = useState('mobile'); // 'desktop' | 'mobile'
  const [previewTheme, setPreviewTheme] = useState('light'); // 'light' | 'dark'

  // ── UI ────────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState(1);

  const autoSaveTimer = useRef(null);
  const scoreTimer = useRef(null);

  // ── Initialize: load accounts, campaigns, draft recovery ────────────────
  useEffect(() => {
    async function init() {
      setDataLoading(true);
      try {
        const [accountsRes, brandRes] = await Promise.allSettled([
          getAccounts(),
          getBrand(),
        ]);

        if (accountsRes.status === 'fulfilled') {
          const accts = accountsRes.value.accounts || [];
          setConnectedAccounts(accts);
          const seen = new Set();
          const platforms = [];
          for (const a of accts) {
            if (a.platform && VALID_PLATFORMS.includes(a.platform.toLowerCase()) && !seen.has(a.platform)) {
              seen.add(a.platform);
              platforms.push(a.platform);
            }
          }
          setConnectedPlatforms(platforms);
          if (platforms.length > 0) {
            setSelectedPlatforms(platforms);
            setPreviewPlatform(platforms[0]);
          }
        }

        if (brandRes.status === 'fulfilled' && brandRes.value.tone) {
          setBrandVoice(brandRes.value.tone || '');
        }

        // Check if we are recovering a draft from the Drafts page
        const recovery = sessionStorage.getItem('scripta_draft_recovery');
        if (recovery) {
          try {
            const draft = JSON.parse(recovery);
            setDraftId(draft._id);
            setCaption(draft.content || '');
            const recPlats = (draft.platforms || (draft.platform ? [draft.platform] : [])).filter(p => VALID_PLATFORMS.includes(p?.toLowerCase()));
            setSelectedPlatforms(recPlats);
            if (recPlats.length > 0) setPreviewPlatform(recPlats[0]);
            setHashtags(draft.hashtags || []);
            if (draft.media_path) {
              setMedia({ url: draft.media_path, mediaType: draft.media_type, originalUrl: draft.media_path });
            }
            if (draft.ai_metadata) {
              if (draft.ai_metadata.aiTone) setAiTone(draft.ai_metadata.aiTone);
              if (draft.ai_metadata.aiLanguage) setAiLanguage(draft.ai_metadata.aiLanguage);
              if (draft.ai_metadata.aiLength) setAiLength(draft.ai_metadata.aiLength);
            }
            setActiveSection(1);
            sessionStorage.removeItem('scripta_draft_recovery');
          } catch { /* ignore malformed */ }
        } else {
          // Recover unsaved draft from session
          const saved = sessionStorage.getItem(SESSION_KEY);
          if (saved) {
            try {
              const draft = JSON.parse(saved);
              if (draft.caption) setCaption(draft.caption);
              if (draft.hashtags) setHashtags(draft.hashtags);
              if (draft.aiTone) setAiTone(draft.aiTone);
              if (draft.selectedPlatforms) {
                const sessPlats = draft.selectedPlatforms.filter(p => VALID_PLATFORMS.includes(p?.toLowerCase()));
                setSelectedPlatforms(sessPlats);
                if (sessPlats.length > 0) setPreviewPlatform(sessPlats[0]);
              }
            } catch { /* ignore malformed */ }
          }
        }
      } catch (err) {
        console.error('Compose init error:', err);
      } finally {
        setDataLoading(false);
      }
    }
    init();
  }, []);

  // ── Persist to sessionStorage on every change ────────────────────────────
  useEffect(() => {
    if (!caption && hashtags.length === 0) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ caption, hashtags, aiTone, selectedPlatforms }));
  }, [caption, hashtags, aiTone, selectedPlatforms]);

  // ── Auto-save debounce ───────────────────────────────────────────────────
  useEffect(() => {
    if (!caption.trim() && !media) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus('saving');
    autoSaveTimer.current = setTimeout(() => {
      autoSave();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(autoSaveTimer.current);
  }, [caption, media, selectedPlatforms, hashtags, aiTone, aiLanguage, aiLength, draftId]);

  // ── Debounced content score ──────────────────────────────────────────────
  useEffect(() => {
    if (!caption.trim()) { setContentScore(null); return; }
    if (scoreTimer.current) clearTimeout(scoreTimer.current);
    scoreTimer.current = setTimeout(async () => {
      try {
        setAiScoreBusy(true);
        const score = await getContentScore({ content: caption, platform: previewPlatform });
        setContentScore(score);
      } catch { /* silent */ } finally {
        setAiScoreBusy(false);
      }
    }, 2500);
    return () => clearTimeout(scoreTimer.current);
  }, [caption, previewPlatform]);

  // ── Auto-save function ───────────────────────────────────────────────────
  const autoSave = useCallback(async () => {
    try {
      const payload = {
        content: caption,
        platforms: selectedPlatforms,
        platform: selectedPlatforms[0] || 'instagram',
        hashtags,
        media_path: media?.url || null,
        media_type: media ? media.mediaType : null,
        ai_metadata: { aiTone, aiLanguage, aiLength },
        auto_save: true,
      };
      if (draftId) {
        await updateDraft(draftId, payload);
      } else {
        const res = await saveDraft(payload);
        const id = res.post?._id;
        if (id) setDraftId(id);
      }
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
    } catch {
      setAutoSaveStatus('error');
    }
  }, [caption, selectedPlatforms, hashtags, media, aiTone, aiLanguage, aiLength, draftId]);

  // ── Media upload ─────────────────────────────────────────────────────────
  const handleMediaUpload = useCallback(async (file) => {
    if (!file) return;
    setMediaError('');
    setMediaBusy(true);
    setUploadProgress(0);
    try {
      const uploaded = await uploadMedia(file);
      setMedia(uploaded);
      setUploadProgress(100);
      // Auto-analyze image
      if (file.type.startsWith('image/')) {
        setImageAnalysisBusy(true);
        try {
          const analysis = await analyzeImageFull(file);
          setImageAnalysis(analysis.analysis || analysis);
          // Pre-fill caption if empty
          if (!caption && analysis.caption?.caption) {
            setCaption(analysis.caption.caption);
          }
        } catch { /* silent — analysis is optional */ } finally {
          setImageAnalysisBusy(false);
        }
      }
    } catch (err) {
      setMediaError(err.message);
    } finally {
      setMediaBusy(false);
    }
  }, [caption]);

  const clearMedia = useCallback(() => {
    setMedia(null);
    setMediaError('');
    setImageAnalysis(null);
    setUploadProgress(0);
  }, []);

  // ── Platform selection ───────────────────────────────────────────────────
  const togglePlatform = useCallback((platform) => {
    if (!VALID_PLATFORMS.includes(platform?.toLowerCase())) return;
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev.filter(p => VALID_PLATFORMS.includes(p?.toLowerCase())), platform]
    );
  }, []);

  // ── Reset all for new post ───────────────────────────────────────────────
  const resetCompose = useCallback(() => {
    setCaption('');
    setHashtags([]);
    setMedia(null);
    setGeneratedCaptions(null);
    setGeneratedHashtags(null);
    setContentScore(null);
    setImageAnalysis(null);
    setBestTimes(null);
    setPlatformContent({});
    setPublishMode('now');
    setScheduleDate('');
    setScheduleTime('');
    setDraftId(null);
    setPublishStatus({});
    setPublishResults({});
    setAutoSaveStatus('');
    setLastSaved(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  // ── Load draft for editing ───────────────────────────────────────────────
  const loadDraftForEditing = useCallback((draft) => {
    setDraftId(draft._id);
    setCaption(draft.content || '');
    setSelectedPlatforms((draft.platforms || (draft.platform ? [draft.platform] : [])).filter(p => VALID_PLATFORMS.includes(p?.toLowerCase())));
    setHashtags(draft.hashtags || []);
    if (draft.media_path) {
      setMedia({ url: draft.media_path, mediaType: draft.media_type, originalUrl: draft.media_path });
    }
    if (draft.ai_metadata) {
      if (draft.ai_metadata.aiTone) setAiTone(draft.ai_metadata.aiTone);
      if (draft.ai_metadata.aiLanguage) setAiLanguage(draft.ai_metadata.aiLanguage);
      if (draft.ai_metadata.aiLength) setAiLength(draft.ai_metadata.aiLength);
    }

    setActiveSection(1);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getCharCount = useCallback((platform) => {
    const content = platformContent[platform] || caption;
    return { count: content.length, limit: PLATFORM_CHAR_LIMITS[platform] || 2200 };
  }, [caption, platformContent]);

  const getEffectiveCaption = useCallback((platform) => {
    return platformContent[platform] || caption;
  }, [caption, platformContent]);

  return {
    // Content
    caption, setCaption,
    selectedPlatforms, setSelectedPlatforms, togglePlatform,
    hashtags, setHashtags,
    platformContent, setPlatformContent,

    // AI Settings
    aiTone, setAiTone,
    aiLanguage, setAiLanguage,
    aiLength, setAiLength,
    aiAudience, setAiAudience,
    brandVoice, setBrandVoice,

    // AI Outputs
    generatedCaptions, setGeneratedCaptions,
    generatedHashtags, setGeneratedHashtags,
    contentScore, setContentScore,
    imageAnalysis, setImageAnalysis,
    bestTimes, setBestTimes,

    // AI Loading
    aiCaptionBusy, setAiCaptionBusy,
    aiHashtagBusy, setAiHashtagBusy,
    aiScoreBusy, setAiScoreBusy,
    aiImproveBusy, setAiImproveBusy,
    aiPlatformBusy, setAiPlatformBusy,
    aiTimeBusy, setAiTimeBusy,
    imageAnalysisBusy, setImageAnalysisBusy,

    // Media
    media, setMedia,
    mediaBusy, mediaError, uploadProgress,
    handleMediaUpload, clearMedia,

    // Scheduling
    publishMode, setPublishMode,
    scheduleDate, setScheduleDate,
    scheduleTime, setScheduleTime,
    timezone, setTimezone,

    // Publishing
    publishStatus, setPublishStatus,
    publishResults, setPublishResults,
    publishBusy, setPublishBusy,

    draftId, setDraftId,
    autoSaveStatus, lastSaved,
    loadDraftForEditing,
    resetCompose, autoSave,

    // App data
    connectedAccounts, connectedPlatforms,
    dataLoading,

    // Preview
    previewPlatform, setPreviewPlatform,
    previewMode, setPreviewMode,
    previewTheme, setPreviewTheme,

    // UI
    activeSection, setActiveSection,

    // Helpers
    getCharCount, getEffectiveCaption,
    PLATFORM_CHAR_LIMITS,
  };
}
