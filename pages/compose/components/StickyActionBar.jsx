// StickyActionBar.jsx — Fixed bottom action bar for publish/schedule/draft actions
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Clock, Save, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function StickyActionBar({
  publishMode, setPublishMode,
  onPublishNow, onSchedule, onSaveDraft,
  publishBusy, publishStatus, publishResults,
  autoSaveStatus, lastSaved,
  selectedPlatforms, caption,
}) {
  const hasContent = caption?.trim().length > 0;
  const hasTargets = selectedPlatforms?.length > 0;
  const canPublish = hasContent && hasTargets && !publishBusy;

  const allSuccess = Object.values(publishStatus).every(s => s === 'success');
  const anyFailed = Object.values(publishStatus).some(s => s === 'failed');
  const publishing = Object.values(publishStatus).some(s => s === 'publishing');

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="fixed bottom-0 left-0 right-0 z-50 ml-64"
      style={{ left: 256 }}
    >
      <div className="bg-white border-t border-slate-200 shadow-2xl shadow-slate-900/10 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          {/* Auto-save status */}
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
            {autoSaveStatus === 'saving' && (
              <><Loader2 size={11} className="animate-spin" /><span>Saving...</span></>
            )}
            {autoSaveStatus === 'saved' && lastSaved && (
              <><CheckCircle size={11} className="text-green-500" /><span className="text-green-600">Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
            )}
            {autoSaveStatus === 'error' && (
              <><AlertCircle size={11} className="text-red-500" /><span className="text-red-500">Save failed</span></>
            )}
            {!autoSaveStatus && <span>Auto-save active</span>}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mode tabs */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {[
              { id: 'now', label: 'Publish Now', icon: Send },
              { id: 'schedule', label: 'Schedule', icon: Clock },
              { id: 'draft', label: 'Save Draft', icon: Save },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPublishMode(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  publishMode === id
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Validation hints */}
          {!hasContent && (
            <span className="text-xs text-amber-600 hidden md:inline">Write a caption first</span>
          )}
          {!hasTargets && hasContent && (
            <span className="text-xs text-amber-600 hidden md:inline">Select platforms</span>
          )}

          {/* Primary action button */}
          <motion.button
            whileHover={{ scale: canPublish ? 1.02 : 1 }}
            whileTap={{ scale: canPublish ? 0.98 : 1 }}
            onClick={() => {
              if (!canPublish) return;
              if (publishMode === 'now') onPublishNow();
              else if (publishMode === 'schedule') onSchedule();
              else onSaveDraft();
            }}
            disabled={!canPublish}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              canPublish
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {publishBusy || publishing ? (
              <><Loader2 size={15} className="animate-spin" /><span>Publishing...</span></>
            ) : publishMode === 'now' ? (
              <><Send size={15} /><span>Publish Now</span></>
            ) : publishMode === 'schedule' ? (
              <><Clock size={15} /><span>Schedule</span></>
            ) : (
              <><Save size={15} /><span>Save Draft</span></>
            )}
          </motion.button>
        </div>

        {/* Publish results */}
        <AnimatePresence>
          {(allSuccess || anyFailed) && Object.keys(publishResults).length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-w-6xl mx-auto pt-2 flex flex-wrap gap-2"
            >
              {Object.entries(publishResults).map(([platform, result]) => (
                <div
                  key={platform}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                    result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {result.success ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                  <span className="capitalize font-medium">{platform}</span>
                  <span>— {result.success ? 'Published!' : result.message?.slice(0, 40)}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
