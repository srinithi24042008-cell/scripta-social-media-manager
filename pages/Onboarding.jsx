import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Sparkles } from 'lucide-react';
import { api } from '../api';
import { PLATFORM_LABELS, ACTIVE_PLATFORMS, COMING_SOON_PLATFORMS } from '../platformStyles';

export default function Onboarding({ onDone }) {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  function toggle(p) {
    setSelected((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function finish() {
    setBusy(true);
    try {
      await api.savePlatforms(selected);
      onDone(selected);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-violet-200 mx-auto mb-4">
            S
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to Scripta</h1>
          <p className="text-slate-500">Instagram is fully supported. Select it to get started with scheduling posts.</p>
        </div>

        <div className="glass-card-solid rounded-2xl p-8">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-violet-500" />
              Available Now
            </h3>
            <div className="flex flex-wrap gap-3">
              {ACTIVE_PLATFORMS.map((p) => {
                const isSelected = selected.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggle(p)}
                    className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${isSelected
                        ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                      }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    📸 {PLATFORM_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lock size={14} className="text-slate-400" />
              Coming Soon
            </h3>
            <div className="flex flex-wrap gap-2">
              {COMING_SOON_PLATFORMS.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-300 text-sm font-medium cursor-not-allowed"
                >
                  <Lock size={12} /> {PLATFORM_LABELS[p]}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">More platforms coming soon. Stay tuned!</p>
          </div>

          <button
            onClick={finish}
            disabled={busy || selected.length === 0}
            className="w-full py-3 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50"
          >
            {busy ? 'Saving...' : 'Continue with Instagram'}
          </button>
          {selected.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-3">Select Instagram to continue</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
