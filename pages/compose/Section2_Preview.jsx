// Section2_Preview.jsx — Live multi-platform post preview with desktop/mobile/dark/light modes
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Sun, Moon, Eye } from 'lucide-react';
import PlatformPreviewCard from './components/PlatformPreviewCard';
import PlatformSelector from './components/PlatformSelector';

const PLATFORM_TABS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'facebook', label: 'Facebook', emoji: '📘' },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
];

export default function Section2_Preview({
  caption, platformContent, hashtags, media,
  selectedPlatforms,
  previewPlatform, setPreviewPlatform,
  previewMode, setPreviewMode,
  previewTheme, setPreviewTheme,
  getEffectiveCaption,
  PLATFORM_CHAR_LIMITS,
  onNext,
}) {
  const mediaUrl = media?.url || media?.originalUrl || media?.secure_url;
  const effectiveCaption = getEffectiveCaption ? getEffectiveCaption(previewPlatform) : (platformContent?.[previewPlatform] || caption);

  const charLimit = PLATFORM_CHAR_LIMITS?.[previewPlatform] || 2200;
  const charCount = effectiveCaption.length;
  const isOverLimit = charCount > charLimit;
  const charPercent = Math.min(100, (charCount / charLimit) * 100);

  const availablePlatforms = PLATFORM_TABS.filter(p => selectedPlatforms.length === 0 || selectedPlatforms.includes(p.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#4F46E5] rounded-md shadow-sm">
          <Eye size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Live Preview</h2>
          <p className="text-sm text-slate-500">See exactly how your post will look on each platform</p>
        </div>
      </div>

      {/* Preview controls card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Platform tabs */}
        <div className="border-b border-slate-100 px-4 pt-4 pb-0">
          <div className="flex gap-1 overflow-x-auto">
            {availablePlatforms.map(p => (
              <button
                key={p.id}
                onClick={() => setPreviewPlatform(p.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md flex-shrink-0 border-b-2 transition-all ${
                  previewPlatform === p.id
                    ? 'border-[#4F46E5] text-[#4F46E5] bg-indigo-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
                {selectedPlatforms.includes(p.id) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Mode/theme controls */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-white rounded-md p-1 border border-slate-200">
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-indigo-100 text-[#4F46E5]' : 'text-slate-400 hover:text-slate-600'}`}
              title="Mobile preview"
            >
              <Smartphone size={13} />
            </button>
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-indigo-100 text-[#4F46E5]' : 'text-slate-400 hover:text-slate-600'}`}
              title="Desktop preview"
            >
              <Monitor size={13} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white rounded-md p-1 border border-slate-200">
            <button
              onClick={() => setPreviewTheme('light')}
              className={`p-1.5 rounded-md transition-colors ${previewTheme === 'light' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
              title="Light theme"
            >
              <Sun size={13} />
            </button>
            <button
              onClick={() => setPreviewTheme('dark')}
              className={`p-1.5 rounded-md transition-colors ${previewTheme === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="Dark theme"
            >
              <Moon size={13} />
            </button>
          </div>

          {platformContent?.[previewPlatform] && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-2.5 py-1">
              🎯 Platform-optimized
            </span>
          )}
        </div>

        {/* Preview area */}
        <div className={`p-6 transition-all duration-300 ${previewTheme === 'dark' ? 'bg-zinc-950' : 'bg-slate-50'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${previewPlatform}-${previewTheme}-${previewMode}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className={`transition-all duration-200 ${previewMode === 'mobile' ? 'max-w-xs mx-auto' : 'max-w-lg mx-auto'}`}
            >
              <PlatformPreviewCard
                platform={previewPlatform}
                caption={effectiveCaption}
                mediaUrl={mediaUrl}
                hashtags={hashtags}
                theme={previewTheme}
                mode={previewMode}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Character counter */}
        <div className={`px-4 py-3 border-t border-slate-100 ${previewTheme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${isOverLimit ? 'text-red-600' : 'text-slate-600'}`}>
                {isOverLimit ? '⚠️ Over character limit' : '✓ Character count'}
              </span>
            </div>
            <span className={`text-xs font-mono font-semibold ${isOverLimit ? 'text-red-500' : 'text-slate-500'}`}>
              {charCount.toLocaleString()} / {charLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors duration-300 ${
                charPercent > 90 ? 'bg-red-500' : charPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              animate={{ width: `${charPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {isOverLimit && (
            <p className="text-xs text-red-500 mt-1.5">
              Remove {charCount - charLimit} characters to fit within {previewPlatform}'s limit.
            </p>
          )}
        </div>
      </div>

      {/* All platforms overview */}
      {selectedPlatforms.filter(p => PLATFORM_TABS.some(t => t.id === p.toLowerCase())).length > 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Platforms Overview</span>
          </div>
          <div className="space-y-2">
            {selectedPlatforms.filter(p => PLATFORM_TABS.some(t => t.id === p.toLowerCase())).map(platform => {
              const text = platformContent?.[platform] || caption;
              const limit = PLATFORM_CHAR_LIMITS?.[platform] || 2200;
              const count = text.length;
              const over = count > limit;
              return (
                <div
                  key={platform}
                  onClick={() => setPreviewPlatform(platform)}
                  className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all hover:border-indigo-300 ${
                    previewPlatform === platform ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm capitalize font-medium text-slate-700 w-20 flex-shrink-0">{platform}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, (count / limit) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono flex-shrink-0 ${over ? 'text-red-500' : 'text-slate-400'}`}>
                    {count}/{limit}
                  </span>
                  {over && <span className="text-xs text-red-500 flex-shrink-0">⚠️</span>}
                  {platformContent?.[platform] && <span className="text-xs text-indigo-500 flex-shrink-0">🎯</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!caption && !mediaUrl && (
        <div className="bg-slate-50 rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <div className="text-4xl mb-3">✍️</div>
          <p className="text-sm font-semibold text-slate-600">Nothing to preview yet</p>
          <p className="text-xs text-slate-400 mt-1">Start writing a caption or generate one with AI</p>
        </div>
      )}

      {/* Next Button */}
      {onNext && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all animate-pulse"
          >
            Next: Schedule <span className="font-extrabold text-sm">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
