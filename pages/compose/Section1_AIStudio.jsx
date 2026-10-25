// Section1_AIStudio.jsx — AI Content Studio: Caption Generator, Hashtags, Improvement, Scoring
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, Copy, Check, RefreshCw, Hash, Clock, Wand2,
  ChevronDown, ChevronUp, Target, Globe, Mic, MicOff,
  Smile, Scissors, FileText, TrendingUp, Activity, Rocket, Eye
} from 'lucide-react';
import PlatformSelector from './components/PlatformSelector';
import MediaUpload from './components/MediaUpload';
import {
  generateCaption, generateHashtags, improveCaption, getBestPostingTime, generatePlatformContent,
} from './composeApi';

const TONES = ['Friendly', 'Professional', 'Marketing', 'Casual', 'Educational', 'Funny'];
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Portuguese', 'Japanese'];
const LENGTHS = [
  { id: 'short', label: 'Short', desc: '~80 chars' },
  { id: 'medium', label: 'Medium', desc: '~200 chars' },
  { id: 'long', label: 'Long', desc: '~500 chars' },
];
const IMPROVE_ACTIONS = [
  { id: 'improve', label: 'Improve', icon: Wand2, color: '#f97316', action: 'improve' },
  { id: 'rewrite', label: 'Rewrite', icon: FileText, color: '#3b82f6', action: 'rewrite' },
  { id: 'shorten', label: 'Shorten', icon: Scissors, color: '#ec4899', action: 'shorten' },
  { id: 'expand', label: 'Expand', icon: TrendingUp, color: '#06b6d4', action: 'expand' },
  { id: 'cta', label: 'Add CTA', icon: Target, color: '#ef4444', action: 'cta' },
  { id: 'emoji', label: 'Add Emojis', icon: Smile, color: '#f59e0b', action: 'emoji' },
  { id: 'grammar', label: 'SEO Optimize', icon: Activity, color: '#2563eb', action: 'grammar' },
  { id: 'quality', label: 'Viral Version', icon: Rocket, color: '#d946ef', action: 'quality' },
];
const HASHTAG_CATEGORIES = ['trending', 'niche', 'local', 'brand', 'all'];

function useSpeech(onResult) {
  const [listening, setListening] = useState(false);
  const supported = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggle = useCallback(() => {
    if (!supported) return;
    if (listening) { window.currentRecognition?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.continuous = false;
    r.onresult = (e) => onResult(Array.from(e.results).map(x => x[0].transcript).join(' '));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    window.currentRecognition = r;
    r.start(); setListening(true);
  }, [listening, supported, onResult]);
  return { listening, supported, toggle };
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} className="text-slate-400" />}
    </button>
  );
}

export default function Section1_AIStudio({
  caption, setCaption,
  selectedPlatforms, togglePlatform, connectedPlatforms,
  aiTone, setAiTone,
  aiLanguage, setAiLanguage,
  aiLength, setAiLength,
  aiAudience, setAiAudience,
  brandVoice, setBrandVoice,
  generatedCaptions, setGeneratedCaptions,
  generatedHashtags, setGeneratedHashtags,
  hashtags, setHashtags,
  contentScore, aiScoreBusy,
  bestTimes, setBestTimes,
  platformContent, setPlatformContent,
  media, mediaBusy, mediaError, uploadProgress,
  handleMediaUpload, clearMedia,
  imageAnalysis, imageAnalysisBusy,
  aiCaptionBusy, setAiCaptionBusy,
  aiHashtagBusy, setAiHashtagBusy,
  aiImproveBusy, setAiImproveBusy,
  aiTimeBusy, setAiTimeBusy,
  aiPlatformBusy, setAiPlatformBusy,
  showToast,
  aiTopic, setAiTopic,
  scoreComponent,
  onNext,
}) {
  const [hashtagTab, setHashtagTab] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeImprove, setActiveImprove] = useState('');
  const [showLengths, setShowLengths] = useState(false);
  const [showTones, setShowTones] = useState(false);

  const speech = useSpeech((t) => setAiTopic && setAiTopic(prev => prev ? `${prev} ${t}` : t));

  // ── Generate Caption ───────────────────────────────────────────────────
  const handleGenerateCaption = async () => {
    const topic = aiTopic?.trim() || caption.trim();
    if (!topic) { showToast('Enter a topic or write something first', 'error'); return; }
    setAiCaptionBusy(true);
    try {
      const result = await generateCaption({
        topic, tone: aiTone, language: aiLanguage, length: aiLength,
        platform: selectedPlatforms[0] || 'instagram',
        audience: aiAudience, brandVoice,
      });
      setGeneratedCaptions(result);
      setShowLengths(true);
      showToast('Caption generated! Click "Use" below to add to box.', 'success');
    } catch (err) {
      showToast(`AI error: ${err.message}`, 'error');
    } finally {
      setAiCaptionBusy(false);
    }
  };

  // ── Improve Caption ────────────────────────────────────────────────────
  const handleImprove = async (actionItem) => {
    if (!caption.trim()) { showToast('Write a caption first', 'error'); return; }
    setAiImproveBusy(true);
    setActiveImprove(actionItem.id);
    try {
      const result = await improveCaption(actionItem.action, caption, aiTone, selectedPlatforms[0]);
      const improved = result.improved || result.rewritten || result.shortened || result.expanded
        || result.caption || result.corrected || result.summary || result.raw;
      if (improved) {
        setGeneratedCaptions(prev => ({
          ...(typeof prev === 'object' && prev !== null ? prev : {}),
          primary: improved,
          improvedAction: actionItem.label,
          short: result.short || prev?.short || '',
          medium: result.medium || prev?.medium || '',
          long: result.long || prev?.long || '',
          tones: result.tones || prev?.tones || {}
        }));
        showToast(`Caption ${actionItem.label.toLowerCase()} ready! Click 'Use' below to add to box.`, 'success');
      }
    } catch (err) {
      showToast(`AI error: ${err.message}`, 'error');
    } finally {
      setAiImproveBusy(false);
      setActiveImprove('');
    }
  };

  // ── Generate Hashtags ──────────────────────────────────────────────────
  const handleGenerateHashtags = async () => {
    const topic = aiTopic?.trim() || caption.trim();
    if (!topic) { showToast('Enter a topic first', 'error'); return; }
    setAiHashtagBusy(true);
    try {
      const result = await generateHashtags({ topic, platform: selectedPlatforms[0] || 'instagram', caption });
      setGeneratedHashtags(result);
      if (result.all?.length) setHashtags(result.all.slice(0, 10));
      showToast('Hashtags generated!', 'success');
    } catch (err) {
      showToast(`AI error: ${err.message}`, 'error');
    } finally {
      setAiHashtagBusy(false);
    }
  };

  const handleUseHashtags = () => {
    if (hashtags.length === 0) {
      showToast('Select one or more hashtags first', 'error');
      return;
    }
    const tagsStr = hashtags.join(' ');
    setCaption(c => {
      const trimmed = (c || '').trim();
      if (!trimmed) return tagsStr;
      return trimmed + '\n\n' + tagsStr;
    });
    showToast('Hashtags appended to caption box!', 'success');
  };

  // ── Best Posting Time ──────────────────────────────────────────────────
  const handleBestTime = async () => {
    if (selectedPlatforms.length === 0) { showToast('Select platforms first', 'error'); return; }
    setAiTimeBusy(true);
    try {
      const result = await getBestPostingTime({
        platforms: selectedPlatforms, audience: aiAudience,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setBestTimes(result.suggestions || []);
      showToast('Best times suggested!', 'success');
    } catch (err) {
      showToast(`AI error: ${err.message}`, 'error');
    } finally {
      setAiTimeBusy(false);
    }
  };

  // ── Platform Content Variants ──────────────────────────────────────────
  const handlePlatformContent = async () => {
    if (!caption.trim()) { showToast('Write a caption first', 'error'); return; }
    if (selectedPlatforms.length < 2) { showToast('Select 2+ platforms for variants', 'error'); return; }
    setAiPlatformBusy(true);
    try {
      const result = await generatePlatformContent({ content: caption, platforms: selectedPlatforms });
      if (result.variants) { setPlatformContent(result.variants); showToast('Platform variants generated!', 'success'); }
    } catch (err) {
      showToast(`AI error: ${err.message}`, 'error');
    } finally {
      setAiPlatformBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column - Main Editor */}
      <div className="lg:col-span-8 space-y-6">
        {/* Section Header */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[#4F46E5] rounded-md flex items-center justify-center shadow-sm">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">AI Content Studio</h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Generate, improve, and optimize content with Gemini AI</p>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 shadow-sm">
          <p className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">Target Platforms</p>
          <PlatformSelector
            selected={selectedPlatforms}
            connectedPlatforms={connectedPlatforms}
            onChange={togglePlatform}
          />
        </div>

        {/* Media Upload */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[#4F46E5]" />
            <p className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">Media</p>
          </div>
          <MediaUpload
            media={media} mediaBusy={mediaBusy} mediaError={mediaError}
            uploadProgress={uploadProgress} onUpload={handleMediaUpload} onClear={clearMedia}
            imageAnalysis={imageAnalysis} imageAnalysisBusy={imageAnalysisBusy}
            onApplyCaption={(c) => setCaption(c)}
          />
        </div>

        {/* Main Caption Area + AI Controls */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Topic / Idea Input */}
          <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase block">Topic / Idea</label>
              <textarea
                value={aiTopic || ''}
                onChange={(e) => setAiTopic && setAiTopic(e.target.value)}
                placeholder="Describe your post idea, product, event, or topic..."
                rows={2}
                className="w-full text-xs text-slate-700 placeholder:text-slate-400 border-0 resize-none outline-none leading-relaxed font-semibold bg-transparent"
              />
            </div>

          </div>

          {/* Caption Editor */}
          <div className="p-5 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase block">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your caption here, or let AI generate one below..."
                rows={5}
                className="w-full text-xs text-slate-700 placeholder:text-slate-400 border-0 resize-none outline-none leading-relaxed font-semibold bg-transparent"
              />
            </div>
            <button
              className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 shrink-0 bg-slate-50/50"
              title="Add emojis"
            >
              <Smile size={14} />
            </button>
          </div>

          {/* AI Controls Row */}
          <div className="p-5 bg-[#f4f3ff]/50 border-t border-slate-100 space-y-4">
            {/* Tone, Length, Language */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5">Tone</label>
                <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-650 outline-none focus:border-indigo-400 font-semibold cursor-pointer">
                  {TONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5">Length</label>
                <select value={aiLength} onChange={(e) => setAiLength(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-655 outline-none focus:border-indigo-400 font-semibold cursor-pointer">
                  {LENGTHS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5">Language</label>
                <select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-655 outline-none focus:border-indigo-400 font-semibold cursor-pointer">
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={handleGenerateCaption}
                disabled={aiCaptionBusy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold disabled:opacity-60 transition-all shadow-sm"
              >
                {aiCaptionBusy ? (
                  <><Loader2 size={13} className="animate-spin text-white" />Generating...</>
                ) : (
                  <><Sparkles size={13} />Generate Caption with AI</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Caption Variants */}
        <AnimatePresence>
          {generatedCaptions && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-violet-50/50 border-b border-violet-100 flex items-center gap-2">
                <Sparkles size={13} className="text-violet-600" />
                <span className="text-xs font-bold text-violet-800">Generated Captions</span>
              </div>
              <div className="p-5 space-y-3.5">
                {/* Primary / Recommended variant */}
                {(generatedCaptions.primary || typeof generatedCaptions === 'string') && (
                  <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded-xl p-4 group hover:border-indigo-400 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-600" /> {generatedCaptions.improvedAction ? `Improved Caption (${generatedCaptions.improvedAction})` : 'Recommended Caption'}
                      </span>
                      <div className="flex gap-1.5 items-center">
                        <CopyButton text={generatedCaptions.primary || generatedCaptions} />
                        <button onClick={() => {
                          setCaption(generatedCaptions.primary || generatedCaptions);
                          showToast('Added to caption box!', 'success');
                        }}
                          className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors">
                          <Check size={13} /> Use & Add to Box
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-semibold break-words">{generatedCaptions.primary || generatedCaptions}</p>
                  </div>
                )}

                {/* Length variants */}
                {LENGTHS.map(({ id, label, desc }) => generatedCaptions[id] && (
                  <div key={id} className="border border-slate-100 rounded-xl p-3.5 group hover:border-violet-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600">{label} <span className="text-slate-400 font-normal">({desc})</span></span>
                      <div className="flex gap-1.5 items-center">
                        <CopyButton text={generatedCaptions[id]} />
                        <button onClick={() => {
                          setCaption(generatedCaptions[id]);
                          showToast(`${label} caption added to box!`, 'success');
                        }}
                          className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm transition-colors">
                          Use in Box
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold break-words">{generatedCaptions[id]}</p>
                  </div>
                ))}
                {/* Tone variants */}
                {generatedCaptions.tones && Object.entries(generatedCaptions.tones).length > 0 && (
                  <div>
                    <button onClick={() => setShowTones(p => !p)}
                      className="flex items-center gap-1 text-xs text-indigo-650 font-bold mb-2">
                      {showTones ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      Tone variations
                    </button>
                    <AnimatePresence>
                      {showTones && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {Object.entries(generatedCaptions.tones).map(([tone, text]) => text && (
                              <div key={tone} className="border border-slate-100 rounded-xl p-3 group hover:border-violet-300 transition-colors flex flex-col justify-between gap-2">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-slate-500 capitalize">{tone}</span>
                                    <button onClick={() => {
                                      setCaption(text);
                                      showToast(`${tone} caption added to box!`, 'success');
                                    }}
                                      className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-1 rounded-lg shadow-sm transition-colors">
                                      Use in Box
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-600 line-clamp-3 font-semibold leading-relaxed break-words">{text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {/* CTA */}
                {generatedCaptions.cta && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700">💡 Suggested CTA</span>
                      <button onClick={() => {
                        setCaption(c => c ? c + '\n\n' + generatedCaptions.cta : generatedCaptions.cta);
                        showToast('CTA appended to caption box!', 'success');
                      }}
                        className="flex items-center gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm transition-colors">
                        + Append to Box
                      </button>
                    </div>
                    <p className="text-xs text-amber-800 mt-1 font-semibold leading-relaxed break-words">{generatedCaptions.cta}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column - AI Tools */}
      <div className="lg:col-span-4 space-y-6">
        {/* Score widget */}
        {scoreComponent}

        {/* AI Improvement */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wand2 size={15} className="text-[#4F46E5]" />
            <p className="text-xs font-extrabold text-slate-700">AI Improvement</p>
            {aiImproveBusy && <Loader2 size={12} className="animate-spin text-[#4F46E5]" />}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {IMPROVE_ACTIONS.map(item => {
              const ActionIcon = item.icon;
              const isAct = activeImprove === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleImprove(item)}
                  disabled={aiImproveBusy}
                  className={`flex flex-col items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-md border text-[10px] font-bold transition-all ${isAct
                    ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                    : 'bg-white text-slate-650 border-slate-200 hover:border-indigo-300 hover:text-indigo-650 shadow-sm'
                    } disabled:opacity-50`}
                >
                  {isAct ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ActionIcon size={14} style={{ color: item.color }} />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Platform specific variants button */}
          <button
            onClick={handlePlatformContent}
            disabled={aiPlatformBusy || selectedPlatforms.length < 2}
            className="w-full py-2.5 border border-[#4F46E5] text-[#4F46E5] text-[10px] font-extrabold rounded-md hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {aiPlatformBusy ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
            Generate Platform-specific Variants
          </button>

          {/* Show platform variants */}
          {Object.keys(platformContent).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {Object.entries(platformContent).map(([platform, text]) => (
                <div key={platform} className="border border-slate-150 rounded-xl p-3 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider capitalize">{platform}</span>
                    <button onClick={() => {
                      setCaption(text);
                      showToast(`${platform} caption added to box!`, 'success');
                    }}
                      className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm transition-colors">
                      Use in Box
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 font-medium leading-relaxed break-words">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Hashtag Generator Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="text-[#4F46E5]">
                <Hash size={18} />
              </div>
              <p className="text-xs font-bold text-slate-700">AI Hashtag Generator</p>
            </div>

            <button
              onClick={handleGenerateHashtags}
              disabled={aiHashtagBusy}
              className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-sm"
            >
              {aiHashtagBusy ? <Loader2 size={12} className="animate-spin text-white" /> : <RefreshCw size={12} />}
              Generate
            </button>
          </div>

          {/* Content list if hashtags are generated */}
          {generatedHashtags && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 select-none">
                {HASHTAG_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setHashtagTab(cat)}
                    className={`text-[10px] px-2.5 py-1 rounded-md flex-shrink-0 font-bold transition-colors ${hashtagTab === cat ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(generatedHashtags[hashtagTab] || []).map((tag, i) => {
                  const t = tag.startsWith('#') ? tag : `#${tag}`;
                  const isSel = hashtags.includes(t);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setHashtags(prev => prev.includes(t) ? prev.filter(h => h !== t) : [...prev, t]);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-md border transition-all font-bold ${isSel
                        ? 'bg-indigo-50 border-indigo-200 text-[#4F46E5]'
                        : 'bg-white border-slate-200 text-slate-650 hover:border-indigo-200 hover:text-indigo-600'
                        }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              {generatedHashtags && (
                <div className="space-y-2">
                  <div className="bg-slate-50 rounded-xl p-2.5 text-[10px] text-slate-600 break-words font-semibold leading-relaxed">
                    <span className="font-extrabold text-slate-700">Selected ({hashtags.length}):</span> {hashtags.join(' ')}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUseHashtags}
                      className="flex-1 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[10px] font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check size={12} />
                      Use & Add to Caption Box
                    </button>
                    <button
                      onClick={() => {
                        const allTags = (generatedHashtags[hashtagTab] || []).map(t => t.startsWith('#') ? t : `#${t}`);
                        setHashtags(allTags);
                        showToast('All category hashtags selected!', 'info');
                      }}
                      className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Select All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Best Posting Time Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="text-[#4F46E5]">
                <Clock size={18} />
              </div>
              <p className="text-xs font-bold text-slate-700">AI Best Posting Time</p>
            </div>

            <button
              onClick={handleBestTime}
              disabled={aiTimeBusy}
              className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-sm"
            >
              {aiTimeBusy ? <Loader2 size={12} className="animate-spin text-white" /> : <Sparkles size={12} />}
              Suggest
            </button>
          </div>

          {/* Best times suggestions */}
          {bestTimes && bestTimes.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              {bestTimes.map((s, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-3 bg-slate-50/20">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{s.platform}</p>
                  <div className="space-y-1.5">
                    {(s.bestTimes || []).map((bt, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                        <span className="font-mono font-bold text-[#6366f1] bg-indigo-50 rounded px-1.5 py-0.5">{bt.time}</span>
                        <span>{bt.label}</span>
                        {bt.engagementScore && (
                          <span className="ml-auto text-green-600 font-bold">{bt.engagementScore}% engagement</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            Next: Preview <span className="font-extrabold text-sm">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
