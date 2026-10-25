import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Save, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function BrandVoice() {
  const [profile, setProfile] = useState({ tone: '', audience: '', rules: '', sample_posts: '' });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBrand().then((d) => {
      setProfile(d.profile || profile);
      setLoading(false);
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      const d = await api.updateBrand(profile);
      setProfile(d.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="skeleton w-64 h-8" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
          <Mic size={24} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Brand Voice</h1>
          <p className="text-sm text-slate-500">Define your tone and audience so AI-generated drafts match your messaging.</p>
        </div>
      </div>

      <form onSubmit={save} className="glass-card-solid rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tone of Voice</label>
          <input
            value={profile.tone}
            onChange={(e) => setProfile({ ...profile, tone: e.target.value })}
            placeholder="e.g. conversational, professional, warm and educational"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Target Audience</label>
          <input
            value={profile.audience}
            onChange={(e) => setProfile({ ...profile, audience: e.target.value })}
            placeholder="e.g. tech developers, content creators, business leaders"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Style Guidelines</label>
          <textarea
            value={profile.rules}
            onChange={(e) => setProfile({ ...profile, rules: e.target.value })}
            placeholder="e.g. always include hashtags, keep sentences short, avoid jargon"
            rows={3}
            className="input-field resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sample Posts</label>
          <textarea
            value={profile.sample_posts}
            onChange={(e) => setProfile({ ...profile, sample_posts: e.target.value })}
            placeholder="Paste 1-3 examples of posts you like as a baseline."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
          <button type="submit" disabled={busy} className="btn-primary text-sm">
            <Save size={16} />
            {busy ? 'Saving...' : 'Save Voice Profile'}
          </button>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium"
            >
              <CheckCircle2 size={16} />
              Profile saved
            </motion.span>
          )}
        </div>
      </form>
    </motion.div>
  );
}
