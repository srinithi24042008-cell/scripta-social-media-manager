import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Image as ImageIcon,
  FileText,
  Upload,
  UploadCloud,
  Loader2,
  PenTool,
  Copy, Check,
  AlertCircle,
  Play,
  Volume2,
  Download,
  FolderPlus,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Trash2,
  Layers,
  Languages,
  Calendar,
  Star,
  Shield,
  Briefcase,
  Mic,
  Type,
  Send,
  Clock,
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';

// Available dropdown settings
const LANGUAGES = [
  { id: 'en-US', label: 'English' },
  { id: 'es-ES', label: 'Spanish' },
  { id: 'fr-FR', label: 'French' },
  { id: 'de-DE', label: 'German' },
  { id: 'ja-JP', label: 'Japanese' },
  { id: 'hi-IN', label: 'Hindi' },
  { id: 'zh-CN', label: 'Chinese' },
];

const TONES = [
  { id: 'professional', label: 'Professional', pitch: 1.0, rate: 1.0 },
  { id: 'funny', label: 'Funny', pitch: 1.2, rate: 1.1 },
  { id: 'friendly', label: 'Friendly', pitch: 1.05, rate: 0.95 },
  { id: 'luxury', label: 'Luxury', pitch: 0.9, rate: 0.85 },
  { id: 'inspiring', label: 'Inspiring', pitch: 1.15, rate: 1.0 },
  { id: 'educational', label: 'Educational', pitch: 1.0, rate: 0.9 },
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
];

const CONTENT_TYPES = [
  { id: 'post', label: 'Social Media Post' },
  { id: 'blog', label: 'Blog Post' },
  { id: 'ad', label: 'Ad Copy' },
  { id: 'script', label: 'Video Script' },
];

// Helper to create a valid 1-second silent WAV file in memory
function createMockWavBlob() {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = sampleRate * numChannels * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < dataSize; i++) {
    view.setInt8(44 + i, 0);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// Helper to format seconds to MM:SS
function formatDurationString(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function CampaignPlatformVariants({ variants, handleCopy, handleApplyVariant, showToast }) {
  const [activeTab, setActiveTab] = useState(variants[0]?.platform || 'instagram');
  const activeVariant = variants.find(v => v.platform === activeTab);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Platform-Specific Copies</span>

      <div className="flex bg-slate-100/60 p-0.5 rounded-lg select-none text-[10px] font-extrabold gap-0.5 border border-slate-100">
        {variants.map(v => (
          <button
            key={v.platform}
            type="button"
            onClick={() => setActiveTab(v.platform)}
            className={`flex-1 py-1 rounded-md text-center transition-all border-none cursor-pointer ${activeTab === v.platform
                ? 'bg-white text-indigo-600 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
          >
            {v.platform.charAt(0).toUpperCase() + v.platform.slice(1)}
          </button>
        ))}
      </div>

      {activeVariant && (
        <div className="space-y-2 text-left">
          <div className="p-3 bg-slate-50 rounded-xl text-[11px] font-semibold text-slate-600 leading-relaxed border border-slate-100 whitespace-pre-wrap max-h-36 overflow-y-auto">
            {activeVariant.content}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(activeVariant.content)}
              className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 bg-white transition-all cursor-pointer"
            >
              Copy Variant
            </button>
            <button
              onClick={() => handleApplyVariant(activeVariant.content)}
              className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-600 border-none transition-all cursor-pointer"
            >
              Apply as Main
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Aistudio() {
  const navigate = useNavigate();
  // Tabs & Views
  const [subTab, setSubTab] = useState('create-new'); // 'create-new' | 'from-upload' | 'saved-drafts'
  const [previewTab, setPreviewTab] = useState('images'); // 'images' | 'audio' | 'text'

  // Input states
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('post');
  const [platform, setPlatform] = useState('instagram');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('en-US');
  const [addAudio, setAddAudio] = useState(false);

  // Staged uploads
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFileType, setUploadFileType] = useState('image'); // 'image' | 'video'

  // Generated outputs states
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [generatedAudios, setGeneratedAudios] = useState([]);
  const [generatedText, setGeneratedText] = useState('');
  const [generationResult, setGenerationResult] = useState(null);
  const [generatedHashtags, setGeneratedHashtags] = useState([]);
  const [generatedCTA, setGeneratedCTA] = useState('');
  const [generatedBestTime, setGeneratedBestTime] = useState([]);
  const [generatedPlatformVariants, setGeneratedPlatformVariants] = useState({});
  const [isCampaignPackage, setIsCampaignPackage] = useState(false);

  // Busy/Errors
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Modal states for single generators
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('image'); // 'image' | 'audio' | 'text' | 'smart'
  const [modalPromptText, setModalPromptText] = useState('');
  const [modalContentType, setModalContentType] = useState('post');
  const [modalTone, setModalTone] = useState('professional');
  const [modalLanguage, setModalLanguage] = useState('en-US');
  const [modalPlatform, setModalPlatform] = useState('instagram');
  const [modalLoading, setModalLoading] = useState(false);
  
  // Text Generator Additional States
  const [modalLength, setModalLength] = useState('medium');
  const [modalCreativity, setModalCreativity] = useState('medium');

  // Image Generator Additional States
  const [modalAspectRatio, setModalAspectRatio] = useState('1:1');
  const [modalImageStyle, setModalImageStyle] = useState('Realistic');
  const [modalSampleCount, setModalSampleCount] = useState(1);

  // Audio Generator Additional States
  const [modalAudioTab, setModalAudioTab] = useState('tts');
  const [modalAudioVoice, setModalAudioVoice] = useState('Voice 1');
  const [modalAudioSpeed, setModalAudioSpeed] = useState('1.0');
  const [modalAudioEmotion, setModalAudioEmotion] = useState('Neutral');
  const [modalAudioFile, setModalAudioFile] = useState(null);
  const [audioResults, setAudioResults] = useState(null);

  const fileInputRef = useRef(null);
  const uploadAreaInputRef = useRef(null);
  const showToast = useToast();



  // Upload handlers
  const handleUploadAreaSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.uploadMedia(file);
      setUploadFile(res);
      setUploadPreview(res.originalUrl);
      setUploadFileType(res.mediaType);

      // Auto switch to From Upload tab to let user see options
      setSubTab('from-upload');
      showToast('Media uploaded! Auto-generating platform contents...', 'info');

      // Automatically prefill contents accordingly (based on analyzed visual features)
      const analysis = await api.aiAnalyzeImage(file);
      const autoText = `${analysis.description || 'Staged content'}\n\nGenerated mood: ${analysis.mood || 'Standard'}. Emojis: ${analysis.subjects?.join(' ')}`;
      setPrompt(`Uploaded ${res.mediaType} analysis: ${analysis.description || ''}`);
      setGeneratedText(autoText);
      setPreviewTab('text');
    } catch (err) {
      setError(err.message || 'File upload failed');
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Play Speech Synthesis according to Tone and Language
  const handlePlayVoiceover = () => {
    if (!generatedText) {
      showToast('Please generate some text/caption first to read.', 'error');
      return;
    }
    window.speechSynthesis.cancel(); // Cancel any active speech

    const cleanText = generatedText.replace(/#\w+/g, '').trim(); // strip hashtags for voiceover
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;

    // Apply tone characteristics
    const activeTone = TONES.find((t) => t.id === tone) || TONES[0];
    utterance.pitch = activeTone.pitch;
    utterance.rate = activeTone.rate;

    // Choose locale-matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(language.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => showToast('Voiceover playback completed!', 'success');
    window.speechSynthesis.speak(utterance);
    showToast(`Playing voiceover in ${LANGUAGES.find(l => l.id === language)?.label || 'selected language'} (${activeTone.label} tone)`, 'info');
  };

  // Trigger individual generators
  const handleGenerateSingle = async (type) => {
    if (!prompt.trim()) {
      showToast('Please describe your content prompt first.', 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (type === 'image') {
        const res = await api.generateMedia(prompt.trim(), 'image');
        const imgUrl = res.originalUrl || res.url;
        setGeneratedImages((prev) => [...prev, { url: imgUrl, name: prompt.substring(0, 20) }]);
        setImageIndex(generatedImages.length);
        setPreviewTab('images');
        showToast('Image generated!', 'success');
        setGenerationResult({ type: 'image', url: imgUrl, name: prompt.substring(0, 20), prompt: prompt.trim() });
      } else if (type === 'audio') {
        // Generate text first, then convert to audio via speech synthesis
        const generatedTexts = await api.generatePosts(prompt.trim(), [platform]);
        const audioCaption = generatedTexts.posts?.[0]?.content || `Generated audio content for: ${prompt.trim().substring(0, 50)}`;
        setGeneratedText(audioCaption);
        const mockBlob = createMockWavBlob();
        const url = URL.createObjectURL(mockBlob);
        const name = `Audio - ${TONES.find((t) => t.id === tone)?.label} tone`;
        setGeneratedAudios((prev) => [...prev, { url, name, duration: '01:15', caption: audioCaption }]);
        setPreviewTab('audio');
        // Play the generated text as speech
        window.speechSynthesis.cancel();
        const cleanText = audioCaption.replace(/#\w+/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        const activeTone = TONES.find((t) => t.id === tone) || TONES[0];
        utterance.pitch = activeTone.pitch;
        utterance.rate = activeTone.rate;
        utterance.onend = () => showToast('Audio playback completed!', 'success');
        window.speechSynthesis.speak(utterance);
        setGenerationResult({ type: 'audio', url, name, duration: '01:15', prompt: prompt.trim(), caption: audioCaption });
        showToast('Text generated and audio playing!', 'success');
      }
    } catch (err) {
      setError(err.message || 'Generation failed');
      showToast('Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [lastGenerationParams, setLastGenerationParams] = useState(null);

  const handleModalGenerate = async (e, forcedParams = null) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const type = forcedParams ? forcedParams.type : modalType;
    const promptText = forcedParams ? forcedParams.prompt : modalPromptText;

    if (!promptText.trim() && !(type === 'audio' && (forcedParams ? forcedParams.tab : modalAudioTab) === 'upload')) {
      showToast('Please enter a description prompt.', 'error');
      return;
    }

    setModalLoading(true);
    try {
      if (type === 'text') {
        const platformVal = forcedParams ? forcedParams.platform : modalPlatform;
        const toneVal = forcedParams ? forcedParams.tone : modalTone;
        const langVal = forcedParams ? forcedParams.language : modalLanguage;
        const lengthVal = forcedParams ? forcedParams.length : modalLength;
        const creativityVal = forcedParams ? forcedParams.creativity : modalCreativity;

        setLastGenerationParams({
          type: 'text',
          prompt: promptText,
          platform: platformVal,
          tone: toneVal,
          language: langVal,
          length: lengthVal,
          creativity: creativityVal
        });

        const res = await api.generateText(promptText.trim(), platformVal, toneVal, langVal, lengthVal, creativityVal);
        const caption = res.text || `Draft copy created!`;
        setGeneratedText(caption);
        setPreviewTab('text');
        showToast('Custom post text generated successfully!', 'success');
        setShowModal(false);
        setGenerationResult({ 
          type: 'text', 
          caption, 
          prompt: promptText.trim(),
          params: { platform: platformVal, tone: toneVal, language: langVal, length: lengthVal, creativity: creativityVal }
        });
      } else if (type === 'image') {
        const aspectVal = forcedParams ? forcedParams.aspectRatio : modalAspectRatio;
        const styleVal = forcedParams ? forcedParams.style : modalImageStyle;
        const countVal = forcedParams ? forcedParams.sampleCount : modalSampleCount;

        setLastGenerationParams({
          type: 'image',
          prompt: promptText,
          aspectRatio: aspectVal,
          style: styleVal,
          sampleCount: countVal
        });

        const res = await api.generateImageImagen(promptText.trim(), aspectVal, styleVal, countVal);
        const imagesList = res.images || [];
        const formatted = imagesList.map(img => ({
          url: img.url,
          name: promptText.substring(0, 20)
        }));
        setGeneratedImages((prev) => [...prev, ...formatted]);
        setImageIndex(generatedImages.length);
        setPreviewTab('images');
        showToast(`Generated ${formatted.length} custom image(s) successfully!`, 'success');
        setShowModal(false);
        setGenerationResult({ 
          type: 'image', 
          url: formatted[0]?.url, 
          images: formatted,
          name: promptText.substring(0, 20), 
          prompt: promptText.trim() 
        });
      } else if (type === 'audio') {
        const tabVal = forcedParams ? forcedParams.tab : modalAudioTab;

        if (tabVal === 'tts') {
          const voiceVal = forcedParams ? forcedParams.voice : modalAudioVoice;
          const speedVal = forcedParams ? forcedParams.speed : modalAudioSpeed;
          const emotionVal = forcedParams ? forcedParams.emotion : modalAudioEmotion;
          const langVal = forcedParams ? forcedParams.language : modalLanguage;

          setLastGenerationParams({
            type: 'audio',
            tab: 'tts',
            prompt: promptText,
            voice: voiceVal,
            speed: speedVal,
            emotion: emotionVal,
            language: langVal
          });

          // Generate Text first
          const textRes = await api.generateText(promptText.trim(), 'instagram', 'Friendly', langVal, 'medium', 'medium');
          const audioCaption = textRes.text || `Audio text: ${promptText}`;
          setGeneratedText(audioCaption);

          const ttsRes = await api.generateSpeechTTS(audioCaption, langVal, speedVal, voiceVal, emotionVal);
          const audUrl = ttsRes.url || ttsRes.originalUrl;
          const name = `Audio - ${voiceVal} (${langVal})`;
          setGeneratedAudios((prev) => [...prev, { url: audUrl, name, duration: '00:30', caption: audioCaption }]);
          setPreviewTab('audio');

          window.speechSynthesis.cancel();
          const cleanSpeechText = audioCaption.replace(/#\w+/g, '').trim();
          const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
          utterance.lang = langVal;
          utterance.rate = parseFloat(speedVal) || 1.0;
          window.speechSynthesis.speak(utterance);

          setShowModal(false);
          setGenerationResult({ type: 'audio', url: audUrl, name, duration: '00:30', prompt: promptText.trim(), caption: audioCaption });
          showToast('Text generated and audio playing!', 'success');
        } else {
          // Audio Upload Tab
          if (!modalAudioFile) {
            showToast('Please select or drag an audio file.', 'error');
            setModalLoading(false);
            return;
          }

          showToast('Uploading and analyzing audio content...', 'info');
          const resObj = await api.processAudioUpload(modalAudioFile);
          setAudioResults(resObj);
          
          const caption = `${resObj.summary || ''}\n\nInstagram: ${resObj.instagram || ''}\n\nLinkedIn: ${resObj.linkedin || ''}`;
          setGeneratedText(caption);
          setPreviewTab('text');
          
          setShowModal(false);
          setGenerationResult({
            type: 'audio_upload',
            results: resObj,
            prompt: `Audio upload: ${modalAudioFile.name}`,
            caption
          });
          showToast('Audio uploaded and analyzed successfully!', 'success');
        }
      } else if (type === 'smart') {
        const [packageRes, imgRes] = await Promise.all([
          api.compilePackage(promptText.trim(), modalPlatform, modalTone, modalLanguage),
          api.generateMedia(promptText.trim(), 'image')
        ]);

        const mainCaption = packageRes.caption || `Enjoying the view! #Nature #Inspiration`;
        setGeneratedText(mainCaption);
        setGeneratedHashtags(packageRes.hashtags || []);

        const ctas = packageRes.ctas || [];
        const primaryCta = ctas.length > 0 ? ctas[0].text : '';
        setGeneratedCTA(primaryCta);

        setGeneratedBestTime(packageRes.bestTimes || []);
        setGeneratedPlatformVariants(packageRes.platformVariants || {});

        const imgUrl = imgRes.originalUrl || imgRes.url;

        setGeneratedImages((prev) => [...prev, { url: imgUrl, name: promptText.substring(0, 20) }]);
        setImageIndex(generatedImages.length);

        if (addAudio) {
          const mockBlob = createMockWavBlob();
          const audUrl = URL.createObjectURL(mockBlob);
          const audName = `Voiceover - ${TONES.find((t) => t.id === modalTone)?.label} (${LANGUAGES.find((l) => l.id === modalLanguage)?.label})`;
          setGeneratedAudios((prev) => [...prev, { url: audUrl, name: audName, duration: '01:05' }]);
          setPreviewTab('audio');

          window.speechSynthesis.cancel();
          const cleanSpeechText = mainCaption.replace(/#\w+/g, '').trim();
          const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
          utterance.lang = modalLanguage;
          const activeTone = TONES.find((t) => t.id === modalTone) || TONES[0];
          utterance.pitch = activeTone.pitch;
          utterance.rate = activeTone.rate;

          const voices = window.speechSynthesis.getVoices();
          const matchingVoice = voices.find(v => v.lang.startsWith(modalLanguage.split('-')[0]));
          if (matchingVoice) utterance.voice = matchingVoice;

          utterance.onend = () => showToast('Voiceover playback completed!', 'success');
          window.speechSynthesis.speak(utterance);
        } else {
          setPreviewTab('images');
        }

        showToast('Full AI Content package compiled successfully!', 'success');
        setShowModal(false);
        setGenerationResult({ type: 'campaign', prompt: promptText.trim() });
      }
    } catch (err) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Generate All setting
  const handleGenerateAll = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      showToast('Describe your content prompt first.', 'error');
      return;
    }
    setLoading(true);
    setError('');
    setIsCampaignPackage(true);
    try {
      const [packageRes, imgRes] = await Promise.all([
        api.compilePackage(prompt.trim(), platform, tone, language),
        api.generateMedia(prompt.trim(), 'image')
      ]);

      const mainCaption = packageRes.caption || `Enjoying the view! #Nature #Inspiration`;
      setGeneratedText(mainCaption);
      setGeneratedHashtags(packageRes.hashtags || []);

      const ctas = packageRes.ctas || [];
      const primaryCta = ctas.length > 0 ? ctas[0].text : '';
      setGeneratedCTA(primaryCta);

      setGeneratedBestTime(packageRes.bestTimes || []);
      setGeneratedPlatformVariants(packageRes.platformVariants || {});

      const imgUrl = imgRes.originalUrl || imgRes.url;

      setGeneratedImages((prev) => [...prev, { url: imgUrl, name: prompt.substring(0, 20) }]);
      setImageIndex(generatedImages.length);

      if (addAudio) {
        const mockBlob = createMockWavBlob();
        const audUrl = URL.createObjectURL(mockBlob);
        const audName = `Voiceover - ${TONES.find((t) => t.id === tone)?.label} (${LANGUAGES.find((l) => l.id === language)?.label})`;
        setGeneratedAudios((prev) => [...prev, { url: audUrl, name: audName, duration: '01:05' }]);
        setPreviewTab('audio');

        window.speechSynthesis.cancel();
        const cleanSpeechText = mainCaption.replace(/#\w+/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
        utterance.lang = language;
        const activeTone = TONES.find((t) => t.id === tone) || TONES[0];
        utterance.pitch = activeTone.pitch;
        utterance.rate = activeTone.rate;
        utterance.onend = () => showToast('Voiceover playback completed!', 'success');
        window.speechSynthesis.speak(utterance);
      } else {
        setPreviewTab('images');
      }

      showToast('Full AI Content package compiled successfully!', 'success');
      setGenerationResult({ type: 'campaign', prompt: prompt.trim() });
    } catch (err) {
      setError(err.message || 'Generation package failed');
      showToast('Package compilation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStageToDraft = async () => {
    if (!generatedText.trim()) return;
    try {
      const latestImage = generatedImages[generatedImages.length - 1]?.url;
      const payload = {
        platform,
        content: generatedText.trim(),
        status: 'draft',
      };
      if (latestImage) {
        payload.media_path = latestImage;
        payload.media_type = 'image';
      }
      await api.createPost(payload);
      showToast('Staged as Draft to calendar!', 'success');
    } catch (err) {
      showToast('Staging draft failed', 'error');
    }
  };

  // Redirect generated content to Compose page
  const handleRedirectToCompose = () => {
    const payload = {
      content: generatedText.trim() || '',
      platforms: [platform],
    };
    if (generatedImages.length > 0) {
      payload.media_path = generatedImages[imageIndex]?.url;
      payload.media_type = 'image';
    }
    if (!payload.content && !payload.media_path) {
      showToast('Please generate some text or media content first.', 'error');
      return;
    }
    sessionStorage.setItem('scripta_draft_recovery', JSON.stringify(payload));
    navigate('/compose');
    showToast('Redirected content to Compose page!', 'success');
  };

  // Helper download trigger
  const triggerDownload = async (url, name) => {
    try {
      showToast('Preparing download...', 'info');
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      showToast(`Downloaded: ${name}`, 'success');
    } catch (err) {
      console.error(err);
      // Fallback
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Opened in new tab: ${name}`, 'info');
    }
  };

  const copyTextToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    showToast('Copied content text to clipboard!', 'success');
  };

  if (generationResult && generationResult.type === 'campaign') {
    let variants = [];
    if (generatedPlatformVariants && typeof generatedPlatformVariants === 'object') {
      variants = Object.entries(generatedPlatformVariants).map(([key, val]) => ({
        platform: key,
        content: val
      }));
    }

    const latestImage = generatedImages[generatedImages.length - 1]?.url;
    const latestAudio = generatedAudios[generatedAudios.length - 1]?.url;

    return (
      <div className="w-full max-w-6xl mx-auto py-8 text-left font-sans relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/20 rounded-full blur-3xl pointer-events-none" />

        {/* Back navigation */}
        <button
          onClick={() => {
            setGenerationResult(null);
            setIsCampaignPackage(false);
          }}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-800 mb-6 transition-all group border-none bg-transparent cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to AI Studio Editor</span>
        </button>

        {/* Unified Campaign Package Dashboard */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#6366f1] flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">AI Campaign Content Package</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">All assets generated & synchronized</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const payload = {
                    content: generatedText.trim() || '',
                    platforms: [platform],
                  };
                  if (latestImage) {
                    payload.media_path = latestImage;
                    payload.media_type = 'image';
                  }
                  sessionStorage.setItem('scripta_draft_recovery', JSON.stringify(payload));
                  navigate('/compose');
                  showToast('Redirected package content to Compose page!', 'success');
                }}
                className="py-3 px-5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 border-none cursor-pointer"
              >
                <Send size={13} /> Attach to Compose
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Visual Assets Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Visual & Audio Assets</h3>

              {/* Generated Image Preview Card */}
              {latestImage && (
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400">
                    <span>GENERATED IMAGE</span>
                    <button
                      onClick={() => triggerDownload(latestImage, 'campaign_image.jpg')}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 border-none bg-transparent cursor-pointer"
                    >
                      <Download size={11} /> Download
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                    <img src={latestImage} alt="Campaign visual" className="w-full object-contain max-h-[220px]" />
                  </div>
                </div>
              )}



              {/* Generated Voiceover Player Card */}
              {latestAudio && (
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400">
                    <span>GENERATED VOICEOVER AUDIO</span>
                    <button
                      onClick={() => triggerDownload(latestAudio, 'voiceover.wav')}
                      className="text-[#10b981] hover:text-emerald-850 flex items-center gap-0.5 border-none bg-transparent cursor-pointer"
                    >
                      <Download size={11} /> Download
                    </button>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePlayVoiceover}
                        className="w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 text-[#6366f1] flex items-center justify-center shadow-sm border-none cursor-pointer"
                      >
                        <Play size={16} className="ml-0.5 fill-[#6366f1]" />
                      </button>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">AI Voiceover (Speech)</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Language: {LANGUAGES.find(l => l.id === language)?.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Text Copy, CTA, Hashtags, Times & Variants (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Copywriting & Metadata</h3>

              {/* Caption Textarea */}
              <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Main Caption (Editable)</span>
                  <button
                    onClick={() => handleCopy(generatedText)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                    title="Copy text"
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  className="w-full h-40 p-4 text-xs font-semibold text-slate-700 bg-transparent resize-none focus:outline-none leading-relaxed"
                />
              </div>

              {/* Call to Action Tagline */}
              {generatedCTA && (
                <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest block mb-1">Generated CTA Tagline</span>
                    <p className="text-xs font-bold text-slate-700 italic">"{generatedCTA}"</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!generatedText.includes(generatedCTA)) {
                        setGeneratedText(prev => `${prev.trim()}\n\n${generatedCTA}`);
                        showToast('Added CTA tagline to main caption!', 'success');
                      }
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-500 hover:text-white rounded-lg text-[9px] font-extrabold text-indigo-600 border border-indigo-100 cursor-pointer transition-all shadow-sm shrink-0"
                  >
                    Insert CTA
                  </button>
                </div>
              )}

              {/* Recommended Hashtags */}
              {generatedHashtags && generatedHashtags.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Recommended Hashtags</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const tagsStr = generatedHashtags.join(' ');
                          setGeneratedText(prev => {
                            const trimmed = (prev || '').trim();
                            if (!trimmed) return tagsStr;
                            return trimmed + '\n\n' + tagsStr;
                          });
                          showToast('Hashtags appended to caption!', 'success');
                        }}
                        className="text-[10px] font-bold text-[#6366f1] hover:text-indigo-800 flex items-center gap-1 border-none bg-transparent cursor-pointer"
                      >
                        <Check size={11} /> Use & Add to Caption
                      </button>
                      <button
                        onClick={() => handleCopy(generatedHashtags.join(' '))}
                        className="text-[10px] font-bold text-[#6366f1] hover:text-indigo-800 flex items-center gap-1 border-none bg-transparent cursor-pointer"
                      >
                        <Copy size={11} /> Copy All
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedHashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          if (!generatedText.includes(tag)) {
                            setGeneratedText(prev => `${prev.trim()}\n\n${tag}`);
                            showToast(`Added ${tag} to main caption!`, 'success');
                          }
                        }}
                        className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer border border-slate-100 transition-all"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Specific Variants */}
              {variants.length > 0 && (
                <CampaignPlatformVariants
                  variants={variants}
                  handleCopy={handleCopy}
                  handleApplyVariant={(v) => {
                    setGeneratedText(v);
                    showToast('Applied platform variant as main caption!', 'success');
                  }}
                  showToast={showToast}
                />
              )}

              {/* Suggested posting times */}
              {generatedBestTime && generatedBestTime.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Suggested Posting Times</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {generatedBestTime.map((item, idx) => (
                      <div key={idx} className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50/30 gap-1 text-left">
                        <div className="flex justify-between items-center text-[10px] font-extrabold">
                          <span className="text-slate-800 uppercase tracking-wide">{item.platform}</span>
                          {item.bestTimes?.[0] && (
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Score: {item.bestTimes[0].engagementScore || 90}%</span>
                          )}
                        </div>
                        {item.bestTimes?.map((timeObj, tIdx) => (
                          <div key={tIdx} className="space-y-0.5 mt-1">
                            <span className="text-[11px] font-bold text-indigo-600 block flex items-center gap-1">
                              <Clock size={11} /> {timeObj.time} - {timeObj.label || 'Optimal'}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 block italic leading-relaxed">
                              {timeObj.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                setGenerationResult(null);
                setIsCampaignPackage(false);
              }}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all text-center cursor-pointer bg-white"
            >
              Back to Studio
            </button>

            <button
              onClick={handleStageToDraft}
              className="flex-1 py-3 px-4 rounded-xl border border-amber-250 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PenTool size={13} /> Save Calendar Draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (generationResult) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 text-left font-sans relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/20 rounded-full blur-3xl pointer-events-none" />

        {/* Back navigation */}
        <button
          onClick={() => setGenerationResult(null)}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-800 mb-6 transition-all group border-none bg-transparent cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to AI Studio Editor</span>
        </button>

        {/* Content Card */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#6366f1] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">AI Generation Success!</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Your content has been crafted successfully</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">
              Generated Live
            </span>
          </div>

          {/* Generated Result Container */}
          <div className="flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl p-6 border border-slate-100 min-h-[300px]">
            {generationResult.type === 'image' && (
              <div className="space-y-4 w-full max-w-xl">
                {generationResult.images && generationResult.images.length > 1 ? (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {generationResult.images.map((img, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white aspect-square relative group">
                        <img src={img.url} alt={`Generated image ${i+1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => triggerDownload(img.url, `image_${i+1}.jpg`)}
                            className="p-1.5 bg-white rounded-lg text-slate-800 shadow hover:bg-slate-100 border-none cursor-pointer"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white w-full">
                    <img src={generationResult.url} alt="Generated asset" className="w-full object-contain max-h-[400px]" />
                  </div>
                )}
              </div>
            )}



            {generationResult.type === 'audio' && (
              <div className="max-w-md w-full p-6 border border-slate-200 bg-white rounded-2xl shadow-md text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-[#6366f1] flex items-center justify-center mx-auto shadow-sm">
                  <Play className="w-6 h-6 ml-0.5 fill-[#6366f1]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-805 block">{generationResult.name}</span>
                  <span className="text-xs text-slate-400 font-semibold mt-1 block">Voiceover Duration: {generationResult.duration}</span>
                </div>
                <button
                  onClick={handlePlayVoiceover}
                  className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-extrabold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm border-none cursor-pointer"
                >
                  <Volume2 size={13} /> Listen to Audio
                </button>
              </div>
            )}

            {generationResult.type === 'audio_upload' && audioResults && (
              <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left space-y-4 text-xs font-semibold text-slate-700">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block mb-1">AUDIO TRANSCRIPT</span>
                  <p className="whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed p-3 bg-slate-50 rounded-xl border border-slate-100 italic">
                    "{audioResults.transcript}"
                  </p>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block mb-1">CONCISE SUMMARY</span>
                  <p className="leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {audioResults.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block mb-1.5">KEY POINTS</span>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {audioResults.keyPoints?.map((pt, i) => <li key={i} className="leading-relaxed font-medium">{pt}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest block mb-1.5">ACTION ITEMS</span>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {audioResults.actionItems?.map((item, i) => <li key={i} className="leading-relaxed font-medium">{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">SOCIAL MEDIA COPIES</span>
                  <div className="space-y-2">
                    {audioResults.instagram && (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] font-extrabold text-pink-500 uppercase tracking-wider block mb-1">Instagram Caption</span>
                        <p className="leading-relaxed font-medium">{audioResults.instagram}</p>
                      </div>
                    )}
                    {audioResults.linkedin && (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-wider block mb-1">LinkedIn Post</span>
                        <p className="leading-relaxed font-medium">{audioResults.linkedin}</p>
                      </div>
                    )}
                    {audioResults.facebook && (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-wider block mb-1">Facebook Caption</span>
                        <p className="leading-relaxed font-medium">{audioResults.facebook}</p>
                      </div>
                    )}
                  </div>
                </div>

                {audioResults.hashtags && audioResults.hashtags.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">HASHTAGS</span>
                    <div className="flex flex-wrap gap-1.5">
                      {audioResults.hashtags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {generationResult.type === 'text' && (
              <div className="max-w-xl w-full p-6 border border-slate-200 bg-white rounded-2xl shadow-md whitespace-pre-wrap text-xs font-medium text-slate-700 leading-relaxed relative">
                {generationResult.caption}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generationResult.caption);
                    showToast('Copied to clipboard!', 'success');
                  }}
                  className="absolute right-4 bottom-4 text-slate-400 hover:text-slate-655 transition-colors border-none bg-transparent cursor-pointer"
                  title="Copy text"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Prompt info */}
          {generationResult.prompt && (
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Generated Prompt</span>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">"{generationResult.prompt}"</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setGenerationResult(null)}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all text-center cursor-pointer bg-white"
            >
              Back to Studio
            </button>

            {lastGenerationParams && (
              <button
                onClick={() => {
                  setGenerationResult(null);
                  handleModalGenerate(null, lastGenerationParams);
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 bg-white"
              >
                <Sparkles size={13} className="text-[#6366f1]" /> Regenerate
              </button>
            )}

            {generationResult.type === 'text' || generationResult.type === 'audio_upload' ? (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generationResult.caption);
                  showToast('Text copied to clipboard!', 'success');
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 bg-white"
              >
                <Copy size={13} /> Copy Text
              </button>
            ) : (
              <button
                onClick={() => triggerDownload(generationResult.url, `${generationResult.name || 'generation'}.${generationResult.type === 'image' ? 'jpg' : 'wav'}`)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 bg-white"
              >
                <Download size={13} /> Download File
              </button>
            )}

            {generationResult.type !== 'text' && (
              <button
                onClick={async () => {
                  try {
                    showToast('Saving directly into Media Library...', 'info');
                    await api.saveMediaFromUrl(
                      generationResult.url,
                      generationResult.type || 'image',
                      `fal_ai_${Date.now()}.${generationResult.type === 'audio' ? 'wav' : 'jpg'}`
                    );
                    showToast('Saved directly into Media Library!', 'success');
                  } catch (err) {
                    showToast('Failed to save to library: ' + err.message, 'error');
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 bg-white"
              >
                <FolderPlus size={13} /> Save to Library
              </button>
            )}

            <button
              onClick={() => {
                const payload = {
                  content: generationResult.type === 'text' ? generationResult.caption : (generatedText || ''),
                  platforms: [platform],
                };
                if (generationResult.type === 'image') {
                  payload.media_path = generationResult.url;
                  payload.media_type = 'image';
                }
                sessionStorage.setItem('scripta_draft_recovery', JSON.stringify(payload));
                navigate('/compose');
                showToast('Draft recovery payload saved! Navigating to Compose...', 'success');
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-bold shadow-md hover:shadow-lg hover:shadow-indigo-100 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 border-none"
            >
              <PenTool size={13} /> Post or Schedule Draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-left selection:bg-indigo-100 selection:text-indigo-900 font-sans">

      {/* Dynamic ambient overlays */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />

      {/* Mockup Header Row */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 items-start">
        <div className="space-y-2 max-w-xl">
          <span className="text-xs font-bold text-[#6366f1] uppercase tracking-widest block mb-1">AI CONTENT STUDIO</span>
          <h1 className="text-4xl md:text-[40px] font-extrabold text-slate-900 leading-tight tracking-tight">
            Create. Customize. Convert.<br />
            <span className="text-[#6366f1]">All with AI.</span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xl mt-3">
            Generate images, audio, and text tailored to your needs.<br />
            Upload content or start fresh—AI will handle the rest.
          </p>
        </div>
      </div>

      {/* Main Studio split grids */}
      <div className="grid grid-cols-1 gap-6 items-start">

        {/* LEFT WORKSPACE GRID */}
        <div className="w-full space-y-6">

          {/* Main Sub tabs selectors */}
          <div className="flex border-b border-slate-100 gap-8 text-sm font-semibold select-none mb-6">
            {[
              { id: 'create-new', label: 'Create New' },
              { id: 'from-upload', label: 'My Assets' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSubTab(st.id)}
                className={`pb-3 relative transition-all text-sm ${subTab === st.id
                    ? 'text-slate-950 font-bold'
                    : 'text-slate-450 font-medium hover:text-slate-700'
                  }`}
              >
                {st.label}
                {subTab === st.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#6366f1] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content rendering */}

          {subTab === 'create-new' && (
            <div className="space-y-6">
              {/* Row of 3 card tools — Audio first */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Audio generator tool — FIRST */}
                <div className="bg-white border border-[#f1f5f9] rounded-[24px] p-5 shadow-sm flex flex-col justify-between h-[270px] hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 text-center">
                  <div className="flex flex-col items-center space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#10b981] text-white shadow-sm">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">Audio Generator</span>
                      <span className="text-[11px] text-slate-400 leading-normal block font-medium mt-2">AI writes text for your prompt, then reads it aloud as audio.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setModalType('audio');
                      setModalPromptText('');
                      setModalTone(tone);
                      setShowModal(true);
                    }}
                    disabled={loading}
                    className="w-full py-2 border border-[#10b981]/20 hover:border-[#10b981]/60 hover:bg-[#10b981]/5 text-xs font-bold rounded-xl transition-all text-[#10b981] text-center cursor-pointer mt-4"
                  >
                    Generate Audio
                  </button>
                </div>

                {/* Image generator tool */}
                <div className="bg-white border border-[#f1f5f9] rounded-[24px] p-5 shadow-sm flex flex-col justify-between h-[270px] hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 text-center">
                  <div className="flex flex-col items-center space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#6366f1] text-white shadow-sm">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">Image Generator</span>
                      <span className="text-[11px] text-slate-400 leading-normal block font-medium mt-2">Generate stunning images from text prompts.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setModalType('image');
                      setModalPromptText('');
                      setShowModal(true);
                    }}
                    disabled={loading}
                    className="w-full py-2 border border-[#6366f1]/20 hover:border-[#6366f1]/60 hover:bg-[#6366f1]/5 text-xs font-bold rounded-xl transition-all text-[#6366f1] text-center cursor-pointer mt-4"
                  >
                    Generate Image
                  </button>
                </div>

                {/* Text generator tool */}
                <div className="bg-white border border-[#f1f5f9] rounded-[24px] p-5 shadow-sm flex flex-col justify-between h-[270px] hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 text-center">
                  <div className="flex flex-col items-center space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#f59e0b] text-white shadow-sm">
                      <Type className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">Text Generator</span>
                      <span className="text-[11px] text-slate-400 leading-normal block font-medium mt-2">Generate copy, captions, and content in seconds.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setModalType('text');
                      setModalPromptText('');
                      setModalTone(tone);
                      setModalPlatform(platform);
                      setShowModal(true);
                    }}
                    disabled={loading}
                    className="w-full py-2 border border-[#f59e0b]/20 hover:border-[#f59e0b]/60 hover:bg-[#f59e0b]/5 text-xs font-bold rounded-xl transition-all text-[#f59e0b] text-center cursor-pointer mt-4"
                  >
                    Generate Text
                  </button>
                </div>
              </div>
            </div>
          )}

          {subTab === 'from-upload' && (

            <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">Generated Assets Library</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{generatedImages.length + generatedAudios.length} items</span>
              </div>

              {generatedImages.length === 0 && generatedAudios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">No assets generated yet</p>
                  <p className="text-xs text-slate-400 mt-1">Go to Create New and generate images or audio — they'll appear here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Generated Images */}
                  {generatedImages.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5" /> Images ({generatedImages.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {generatedImages.map((img, i) => (
                          <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                onClick={() => triggerDownload(img.url, `image_${i + 1}.jpg`)}
                                className="p-2 bg-white rounded-lg text-slate-800 shadow cursor-pointer border-none flex items-center justify-center"
                                title="Download image"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <span className="text-[9px] font-bold text-white truncate block">{img.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated Audio */}
                  {generatedAudios.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5" /> Audio ({generatedAudios.length})
                      </h4>
                      <div className="space-y-2">
                        {generatedAudios.map((aud, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                              <Mic className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-700 block truncate">{aud.name}</span>
                              {aud.caption && <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{aud.caption}</p>}
                              <span className="text-[9px] text-slate-400 font-semibold">Duration: {aud.duration}</span>
                            </div>
                            <button
                              onClick={() => triggerDownload(aud.url, `audio_${i + 1}.wav`)}
                              className="text-emerald-600 hover:text-emerald-800 shrink-0 cursor-pointer border-none bg-transparent flex items-center justify-center"
                              title="Download audio"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog for individual generator prompt entry */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Generate {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 text-xl font-bold cursor-pointer border-none bg-transparent"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleModalGenerate} className="space-y-4">
              {!(modalType === 'audio' && modalAudioTab === 'upload') && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Describe what you want to generate:
                  </label>
                  <textarea
                    required={!(modalType === 'audio' && modalAudioTab === 'upload')}
                    rows="4"
                    placeholder={
                      modalType === 'image' ? "A beautiful sunset over mountain peaks..." :
                        modalType === 'audio' ? "Describe your topic — AI will write text and read it as audio..." :
                          "Describe the post topic or copy concept..."
                    }
                    value={modalPromptText}
                    onChange={(e) => setModalPromptText(e.target.value)}
                    style={{ resize: 'none' }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium bg-slate-50/20"
                  />
                </div>
              )}

              {/* Conditionally show fields for Image */}
              {modalType === 'image' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Style</label>
                    <select
                      value={modalImageStyle}
                      onChange={(e) => setModalImageStyle(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="Realistic">Realistic</option>
                      <option value="Illustration">Illustration</option>
                      <option value="Anime">Anime</option>
                      <option value="3D">3D</option>
                      <option value="Minimal">Minimal</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Poster">Poster</option>
                      <option value="Thumbnail">Thumbnail</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Conditionally show fields for Text */}
              {modalType === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tone</label>
                    <select
                      value={modalTone}
                      onChange={(e) => setModalTone(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold"
                    >
                      {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Conditionally show fields for Smart Creator package */}
              {modalType === 'smart' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Content Type</label>
                      <select
                        value={modalContentType}
                        onChange={(e) => setModalContentType(e.target.value)}
                        className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        {CONTENT_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Platform</label>
                      <select
                        value={modalPlatform}
                        onChange={(e) => setModalPlatform(e.target.value)}
                        className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tone</label>
                      <select
                        value={modalTone}
                        onChange={(e) => setModalTone(e.target.value)}
                        className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Language</label>
                      <select
                        value={modalLanguage}
                        onChange={(e) => setModalLanguage(e.target.value)}
                        className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                      </select>
                    </div>
                  </div>



                  <div className="flex items-center gap-2.5 select-none pt-1">
                    <input
                      type="checkbox"
                      id="modalAddAudio"
                      checked={addAudio}
                      onChange={(e) => setAddAudio(e.target.checked)}
                      className="text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="modalAddAudio" className="text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer">
                      Include AI voiceover translation (in chosen tone and language)
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-655 transition-all cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  {modalLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
