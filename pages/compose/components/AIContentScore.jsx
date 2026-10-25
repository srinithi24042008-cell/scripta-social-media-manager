// AIContentScore.jsx — Visual content quality score dashboard
import { motion } from 'framer-motion';
import { Zap, Loader2, TrendingUp } from 'lucide-react';

function ScoreRing({ value, size = 56, stroke = 5, color = '#7c3aed' }) {
  const radius = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (value / 100);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
}

function ScoreBar({ label, value, color }) {
  const getColor = (v) => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
  const c = color || getColor(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span className="text-xs font-bold" style={{ color: c }}>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: c }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function AIContentScore({ score, busy, caption }) {
  if (!caption) return null;

  if (busy) {
    return (
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-violet-500" />
        <span className="text-sm text-violet-700 font-medium">Scoring your content...</span>
      </div>
    );
  }

  if (!score) return null;

  const overall = score.overall || 0;
  const overallColor = overall >= 80 ? '#10b981' : overall >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 border border-violet-100 rounded-2xl p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Zap size={13} className="text-violet-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">AI Content Score</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <TrendingUp size={11} />
          <span>Live analysis</span>
        </div>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <ScoreRing value={overall} size={64} stroke={5} color={overallColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: overallColor }}>{overall}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {overall >= 80 ? '🔥 Excellent!' : overall >= 60 ? '👍 Good' : '⚠️ Needs work'}
          </p>
          {score.feedback && (
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{score.feedback}</p>
          )}
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-2.5">
        <ScoreBar label="Quality" value={score.quality || 0} />
        <ScoreBar label="Readability" value={score.readability || 0} />
        <ScoreBar label="Engagement" value={score.engagement || 0} />
        <ScoreBar label="CTA" value={score.cta || 0} />
        <ScoreBar label="Emojis" value={score.emoji || 0} />
        <ScoreBar label="Hashtags" value={score.hashtag || 0} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-violet-100">
        {[
          { label: 'Words', value: score.wordCount || 0 },
          { label: 'Chars', value: score.charCount || 0 },
          { label: 'Read time', value: score.readingTime || '—' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
