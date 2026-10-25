import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, Clock, FileText, PenSquare, CheckCircle2, Lock } from 'lucide-react';
import { useCompose } from './useCompose';
import Section1_AIStudio from './Section1_AIStudio';
import Section2_Preview from './Section2_Preview';
import Section3_Schedule from './Section3_Schedule';
import AIContentScore from './components/AIContentScore';
import { useToast } from '../../components/Toast';
import { useWorkspaceStore } from '../../store/workspaceStore';

const SECTIONS = [
  { id: 1, label: 'AI Studio', icon: Sparkles, color: 'from-violet-500 to-indigo-600', accent: 'text-violet-600', bg: 'bg-violet-50' },
  { id: 2, label: 'Preview', icon: Eye, color: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 3, label: 'Schedule', icon: Clock, color: 'from-blue-500 to-cyan-600', accent: 'text-blue-600', bg: 'bg-blue-50' },
];

// ── Auto-save status pill ───────────────────────────────────────────────────
function AutoSavePill({ status, lastSaved }) {
  return (
    <AnimatePresence mode="wait">
      {status && (
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium ${status === 'saved' ? 'bg-green-50 text-green-700 border border-green-200'
              : status === 'saving' ? 'bg-slate-100 text-slate-600'
                : 'bg-red-50 text-red-600'
            }`}
        >
          {status === 'saved' && <CheckCircle2 size={10} />}
          {status === 'saved' && lastSaved
            ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : status === 'saving' ? 'Saving...'
              : 'Save failed'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Section Navigation ──────────────────────────────────────────────────────
function SectionNav({ active, setActive }) {
  return (
    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
      {SECTIONS.map(s => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            aria-label={s.label}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md transition-all duration-200 text-xs font-bold ${
              isActive
                ? 'bg-[#4F46E5] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Compose Component ──────────────────────────────────────────────────
export default function Compose({ onSaved }) {
  const { activeWorkspaceRole } = useWorkspaceStore();
  const showToast = useToast();
  const [aiTopic, setAiTopic] = useState('');

  if (activeWorkspaceRole === 'viewer') {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center max-w-md mx-auto space-y-4 my-12">
        <Lock size={48} className="text-slate-400 mx-auto" />
        <h3 className="font-bold text-slate-800 text-lg">Access Denied</h3>
        <p className="text-sm text-slate-500">
          Viewers do not have permission to compose, edit, or schedule posts in this workspace.
        </p>
      </div>
    );
  }

  const compose = useCompose();

  const {
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
    contentScore, setContentScore,
    imageAnalysis, setImageAnalysis,
    bestTimes, setBestTimes,
    platformContent, setPlatformContent,
    aiCaptionBusy, setAiCaptionBusy,
    aiHashtagBusy, setAiHashtagBusy,
    aiScoreBusy,
    aiImproveBusy, setAiImproveBusy,
    aiPlatformBusy, setAiPlatformBusy,
    aiTimeBusy, setAiTimeBusy,
    imageAnalysisBusy,
    media, mediaBusy, mediaError, uploadProgress,
    handleMediaUpload, clearMedia,
    publishMode, setPublishMode,
    scheduleDate, setScheduleDate,
    scheduleTime, setScheduleTime,
    timezone, setTimezone,
    publishStatus, setPublishStatus,
    publishResults, setPublishResults,
    publishBusy, setPublishBusy,
    draftId, setDraftId,
    autoSaveStatus, lastSaved,
    loadDraftForEditing,
    resetCompose, autoSave,
    previewPlatform, setPreviewPlatform,
    previewMode, setPreviewMode,
    previewTheme, setPreviewTheme,
    getCharCount, getEffectiveCaption,
    PLATFORM_CHAR_LIMITS,
    activeSection, setActiveSection,
    dataLoading,
  } = compose;

  // Shared toast wrapper with consistent API
  const toast = (msg, type = 'success') => showToast(msg, type);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-[#4F46E5] rounded-lg shadow-sm">
            <Sparkles size={24} className="text-white animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">Loading AI Content Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] -m-6 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#4F46E5] rounded-lg flex items-center justify-center shadow-sm">
            <PenSquare size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Compose</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              {selectedPlatforms.length > 0
                ? `${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''} selected`
                : 'Select platforms to get started'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AutoSavePill status={autoSaveStatus} lastSaved={lastSaved} />
          <SectionNav
            active={activeSection}
            setActive={setActiveSection}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 1 && (
              <div className="w-full">
                <Section1_AIStudio
                  caption={caption} setCaption={setCaption}
                  selectedPlatforms={selectedPlatforms}
                  togglePlatform={togglePlatform}
                  connectedPlatforms={connectedPlatforms}
                  aiTone={aiTone} setAiTone={setAiTone}
                  aiLanguage={aiLanguage} setAiLanguage={setAiLanguage}
                  aiLength={aiLength} setAiLength={setAiLength}
                  aiAudience={aiAudience} setAiAudience={setAiAudience}
                  brandVoice={brandVoice} setBrandVoice={setBrandVoice}
                  generatedCaptions={generatedCaptions} setGeneratedCaptions={setGeneratedCaptions}
                  generatedHashtags={generatedHashtags} setGeneratedHashtags={setGeneratedHashtags}
                  hashtags={hashtags} setHashtags={setHashtags}
                  contentScore={contentScore} aiScoreBusy={aiScoreBusy}
                  bestTimes={bestTimes} setBestTimes={setBestTimes}
                  platformContent={platformContent} setPlatformContent={setPlatformContent}
                  media={media} mediaBusy={mediaBusy} mediaError={mediaError}
                  uploadProgress={uploadProgress}
                  handleMediaUpload={handleMediaUpload} clearMedia={clearMedia}
                  imageAnalysis={imageAnalysis} imageAnalysisBusy={imageAnalysisBusy}
                  aiCaptionBusy={aiCaptionBusy} setAiCaptionBusy={setAiCaptionBusy}
                  aiHashtagBusy={aiHashtagBusy} setAiHashtagBusy={setAiHashtagBusy}
                  aiImproveBusy={aiImproveBusy} setAiImproveBusy={setAiImproveBusy}
                  aiTimeBusy={aiTimeBusy} setAiTimeBusy={setAiTimeBusy}
                  aiPlatformBusy={aiPlatformBusy} setAiPlatformBusy={setAiPlatformBusy}
                  showToast={toast}
                  aiTopic={aiTopic} setAiTopic={setAiTopic}
                  scoreComponent={<AIContentScore score={contentScore} busy={aiScoreBusy} caption={caption} />}
                  onNext={() => setActiveSection(2)}
                />
              </div>
            )}

            {activeSection === 2 && (
              <div className="max-w-2xl mx-auto">
                <Section2_Preview
                  caption={caption}
                  platformContent={platformContent}
                  hashtags={hashtags}
                  media={media}
                  selectedPlatforms={selectedPlatforms}
                  previewPlatform={previewPlatform}
                  setPreviewPlatform={setPreviewPlatform}
                  previewMode={previewMode}
                  setPreviewMode={setPreviewMode}
                  previewTheme={previewTheme}
                  setPreviewTheme={setPreviewTheme}
                  getEffectiveCaption={getEffectiveCaption}
                  PLATFORM_CHAR_LIMITS={PLATFORM_CHAR_LIMITS}
                  onNext={() => setActiveSection(3)}
                />
              </div>
            )}

            {activeSection === 3 && (
              <div className="max-w-4xl mx-auto">
                <Section3_Schedule
                  caption={caption}
                  selectedPlatforms={selectedPlatforms}
                  media={media}
                  hashtags={hashtags}
                  publishMode={publishMode} setPublishMode={setPublishMode}
                  scheduleDate={scheduleDate} setScheduleDate={setScheduleDate}
                  scheduleTime={scheduleTime} setScheduleTime={setScheduleTime}
                  timezone={timezone} setTimezone={setTimezone}
                  publishStatus={publishStatus} setPublishStatus={setPublishStatus}
                  publishResults={publishResults} setPublishResults={setPublishResults}
                  publishBusy={publishBusy} setPublishBusy={setPublishBusy}
                  draftId={draftId} setDraftId={setDraftId}
                  bestTimes={bestTimes}
                  showToast={toast}
                  onSuccess={onSaved}
                />
              </div>
            )}


          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
