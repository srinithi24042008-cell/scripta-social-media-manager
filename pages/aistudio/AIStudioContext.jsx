import React, { createContext, useContext, useState, useRef } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import { LANGUAGES, TONES } from './constants';
import { createMockWavBlob, formatDurationString } from './utils';

const AIStudioContext = createContext();

export const useAIStudio = () => {
  const context = useContext(AIStudioContext);
  if (!context) {
    throw new Error('useAIStudio must be used within an AIStudioProvider');
  }
  return context;
};

export const AIStudioProvider = ({ children }) => {
  const showToast = useToast();

  // Tabs & Views
  const [subTab, setSubTab] = useState('create-new'); // 'create-new' | 'from-upload' | 'saved-drafts'
  const [previewTab, setPreviewTab] = useState('images'); // 'images' | 'videos' | 'audio' | 'text'

  // Input states
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('post');
  const [platform, setPlatform] = useState('instagram');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('en-US');
  const [addAudio, setAddAudio] = useState(false);
  const [videoDuration, setVideoDuration] = useState(5);
  const [modalVideoDuration, setModalVideoDuration] = useState(5);

  // Staged uploads
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFileType, setUploadFileType] = useState('image'); // 'image' | 'video'

  // Generated outputs states
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [generatedAudios, setGeneratedAudios] = useState([]);
  const [generatedText, setGeneratedText] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState([]);
  const [generatedCTA, setGeneratedCTA] = useState('');
  const [generatedBestTime, setGeneratedBestTime] = useState([]);
  const [generatedPlatformVariants, setGeneratedPlatformVariants] = useState({});

  // Busy/Errors
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Modal states for single generators
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('image'); // 'image' | 'video' | 'audio' | 'text' | 'smart'
  const [modalPromptText, setModalPromptText] = useState('');
  const [modalContentType, setModalContentType] = useState('post');
  const [modalTone, setModalTone] = useState('professional');
  const [modalLanguage, setModalLanguage] = useState('en-US');
  const [modalPlatform, setModalPlatform] = useState('instagram');
  const [modalLoading, setModalLoading] = useState(false);

  const fileInputRef = useRef(null);
  const uploadAreaInputRef = useRef(null);

  // Actions
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

      setSubTab('from-upload');
      showToast('Media uploaded! Auto-generating platform contents...', 'info');

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

  const handlePlayVoiceover = () => {
    if (!generatedText) {
      showToast('Please generate some text/caption first to read.', 'error');
      return;
    }
    window.speechSynthesis.cancel();

    const cleanText = generatedText.replace(/#\w+/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;

    const activeTone = TONES.find((t) => t.id === tone) || TONES[0];
    utterance.pitch = activeTone.pitch;
    utterance.rate = activeTone.rate;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(language.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => showToast('Voiceover playback completed!', 'success');
    window.speechSynthesis.speak(utterance);
    showToast(`Playing voiceover in ${LANGUAGES.find(l => l.id === language)?.label || 'selected language'} (${activeTone.label} tone)`, 'info');
  };

  const handleGenerateAll = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!prompt.trim()) {
      showToast('Describe your content prompt first.', 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [packageRes, imgRes, vidRes] = await Promise.all([
        api.compilePackage(prompt.trim(), platform, tone, language),
        api.generateMedia(prompt.trim(), 'image'),
        api.generateMedia(prompt.trim(), 'video', videoDuration)
      ]);

      const mainCaption = packageRes.caption || `Enjoying the view! #Nature #Inspiration`;
      setGeneratedText(mainCaption);
      setGeneratedHashtags(packageRes.hashtags || []);

      const ctas = packageRes.ctas || [];
      const primaryCta = ctas.length > 0 ? ctas[0].text : '';
      setGeneratedCTA(primaryCta);

      setGeneratedBestTime(packageRes.bestTimes || []);
      setGeneratedPlatformVariants(packageRes.platformVariants || {});

      setGeneratedImages((prev) => [...prev, { url: imgRes.originalUrl || imgRes.url, name: prompt.substring(0, 20) }]);
      setImageIndex(generatedImages.length);

      setGeneratedVideos((prev) => [
        ...prev,
        { url: vidRes.originalUrl || vidRes.url, name: prompt.substring(0, 20), duration: formatDurationString(videoDuration) }
      ]);

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
      const payload = {
        platform,
        content: generatedText.trim(),
        status: 'draft',
      };
      if (generatedImages.length > 0) {
        payload.media_path = generatedImages[imageIndex]?.url;
        payload.media_type = 'image';
      } else if (generatedVideos.length > 0) {
        payload.media_path = generatedVideos[0]?.url;
        payload.media_type = 'video';
      }
      await api.createPost(payload);
      showToast('Staged as Draft to calendar!', 'success');
    } catch (err) {
      showToast('Staging draft failed', 'error');
    }
  };

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
        setGeneratedImages((prev) => [...prev, { url: res.originalUrl || res.url, name: prompt.substring(0, 20) }]);
        setImageIndex(generatedImages.length);
        setPreviewTab('images');
        showToast('Image generated!', 'success');
      } else if (type === 'video') {
        showToast('Generating video...', 'info');
        const res = await api.generateMedia(prompt.trim(), 'video', videoDuration);
        setGeneratedVideos((prev) => [
          ...prev,
          { url: res.originalUrl || res.url, name: prompt.substring(0, 20), duration: formatDurationString(videoDuration) }
        ]);
        setPreviewTab('videos');
        showToast('Widescreen video generated!', 'success');
      } else if (type === 'audio') {
        const mockBlob = createMockWavBlob();
        const url = URL.createObjectURL(mockBlob);
        const name = `Voiceover - ${TONES.find((t) => t.id === tone)?.label} (${LANGUAGES.find((l) => l.id === language)?.label})`;
        setGeneratedAudios((prev) => [...prev, { url, name, duration: '01:15' }]);
        setPreviewTab('audio');
        handlePlayVoiceover();
      } else if (type === 'text') {
        const generatedTexts = await api.generatePosts(prompt.trim(), [platform]);
        const caption = generatedTexts.posts?.[0]?.content || `Draft copy created! #Marketing`;
        setGeneratedText(caption);
        setPreviewTab('text');
        showToast('Custom post text generated successfully!', 'success');
      }
    } catch (err) {
      setError(err.message || 'Generation failed');
      showToast('Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleModalGenerate = async (e) => {
    e.preventDefault();
    if (!modalPromptText.trim()) {
      showToast('Please enter a description prompt.', 'error');
      return;
    }
    setModalLoading(true);
    try {
      if (modalType === 'image') {
        const res = await api.generateMedia(modalPromptText.trim(), 'image');
        setGeneratedImages((prev) => [...prev, { url: res.originalUrl || res.url, name: modalPromptText.substring(0, 20) }]);
        setImageIndex(generatedImages.length);
        setPreviewTab('images');
        showToast('Custom image generated successfully!', 'success');
        setShowModal(false);
      } else if (modalType === 'video') {
        showToast('Generating video...', 'info');
        const res = await api.generateMedia(modalPromptText.trim(), 'video', modalVideoDuration);
        setGeneratedVideos((prev) => [
          ...prev,
          { url: res.originalUrl || res.url, name: modalPromptText.substring(0, 20), duration: formatDurationString(modalVideoDuration) }
        ]);
        setPreviewTab('videos');
        showToast('Custom video generated!', 'success');
        setShowModal(false);
      } else if (modalType === 'audio') {
        const mockBlob = createMockWavBlob();
        const url = URL.createObjectURL(mockBlob);
        const name = `Voiceover - ${TONES.find((t) => t.id === modalTone)?.label} (${LANGUAGES.find((l) => l.id === modalLanguage)?.label})`;
        setGeneratedAudios((prev) => [...prev, { url, name, duration: '01:15' }]);
        setPreviewTab('audio');

        window.speechSynthesis.cancel();
        const cleanSpeechText = modalPromptText.trim().replace(/#\w+/g, '').trim();
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

        showToast('Custom voiceover generated and playing!', 'success');
        setShowModal(false);
      } else if (modalType === 'text') {
        const generatedTexts = await api.generatePosts(modalPromptText.trim(), [modalPlatform]);
        const caption = generatedTexts.posts?.[0]?.content || `Draft copy created! #Marketing`;
        setGeneratedText(caption);
        setPreviewTab('text');
        showToast('Custom post text generated successfully!', 'success');
        setShowModal(false);
      } else if (modalType === 'smart') {
        const [packageRes, imgRes, vidRes] = await Promise.all([
          api.compilePackage(modalPromptText.trim(), modalPlatform, modalTone, modalLanguage),
          api.generateMedia(modalPromptText.trim(), 'image'),
          api.generateMedia(modalPromptText.trim(), 'video', modalVideoDuration)
        ]);

        const mainCaption = packageRes.caption || `Enjoying the view! #Nature #Inspiration`;
        setGeneratedText(mainCaption);
        setGeneratedHashtags(packageRes.hashtags || []);

        const ctas = packageRes.ctas || [];
        const primaryCta = ctas.length > 0 ? ctas[0].text : '';
        setGeneratedCTA(primaryCta);

        setGeneratedBestTime(packageRes.bestTimes || []);
        setGeneratedPlatformVariants(packageRes.platformVariants || {});

        setGeneratedImages((prev) => [...prev, { url: imgRes.originalUrl || imgRes.url, name: modalPromptText.substring(0, 20) }]);
        setImageIndex(generatedImages.length);

        setGeneratedVideos((prev) => [
          ...prev,
          { url: vidRes.originalUrl || vidRes.url, name: modalPromptText.substring(0, 20), duration: formatDurationString(modalVideoDuration) }
        ]);

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
      }
    } catch (err) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const value = {
    subTab, setSubTab,
    previewTab, setPreviewTab,
    prompt, setPrompt,
    contentType, setContentType,
    platform, setPlatform,
    tone, setTone,
    language, setLanguage,
    addAudio, setAddAudio,
    videoDuration, setVideoDuration,
    modalVideoDuration, setModalVideoDuration,
    uploadFile, setUploadFile,
    uploadPreview, setUploadPreview,
    uploadFileType, setUploadFileType,
    generatedImages, setGeneratedImages,
    imageIndex, setImageIndex,
    generatedVideos, setGeneratedVideos,
    generatedAudios, setGeneratedAudios,
    generatedText, setGeneratedText,
    generatedHashtags, setGeneratedHashtags,
    generatedCTA, setGeneratedCTA,
    generatedBestTime, setGeneratedBestTime,
    generatedPlatformVariants, setGeneratedPlatformVariants,
    loading, setLoading,
    uploading, setUploading,
    error, setError,
    showModal, setShowModal,
    modalType, setModalType,
    modalPromptText, setModalPromptText,
    modalContentType, setModalContentType,
    modalTone, setModalTone,
    modalLanguage, setModalLanguage,
    modalPlatform, setModalPlatform,
    modalLoading, setModalLoading,
    fileInputRef, uploadAreaInputRef,
    handleUploadAreaSelect, handlePlayVoiceover, handleGenerateAll, handleStageToDraft,
    handleGenerateSingle, handleModalGenerate
  };

  return (
    <AIStudioContext.Provider value={value}>
      {children}
    </AIStudioContext.Provider>
  );
};
