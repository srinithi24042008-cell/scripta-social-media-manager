import React from 'react';
import { Download, Mic, Play, Volume2 } from 'lucide-react';
import { triggerDownload } from '../utils';
import { useAIStudio } from '../AIStudioContext';

export default function AudioPreview({ audios }) {
  const { handlePlayVoiceover } = useAIStudio();

  if (!audios || audios.length === 0) {
    return (
      <div className="py-20 border border-slate-100 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center">
        <Mic className="w-12 h-12 text-slate-300 stroke-[1.2] mb-3" />
        <h4 className="text-sm font-bold text-slate-600">No voiceovers generated yet</h4>
        <p className="text-xs text-slate-400 mt-1 font-medium">Your generated audio will appear here.</p>
      </div>
    );
  }

  const latestAudio = audios[audios.length - 1];

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center group shadow-sm">
        
        {/* Mock Waveform */}
        <div className="w-full flex items-center justify-center gap-1 h-20 mb-6 px-4">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i} 
              className="w-1.5 bg-emerald-300 rounded-full animate-pulse" 
              style={{ 
                height: `${Math.max(20, Math.random() * 100)}%`,
                animationDelay: `${i * 0.05}s`
              }} 
            />
          ))}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handlePlayVoiceover}
            className="w-12 h-12 rounded-full bg-emerald-600 text-white shadow-md flex items-center justify-center hover:bg-emerald-700 transition-colors hover:scale-105"
          >
            <Play size={20} className="ml-1" />
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center px-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
            {latestAudio?.name || 'Generated Audio'}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            Duration: {latestAudio?.duration || '01:05'}
          </span>
        </div>
        
        <button
          onClick={() => triggerDownload(latestAudio?.url, `${latestAudio?.name || 'audio'}.wav`)}
          className="text-[11px] text-emerald-600 hover:text-white hover:bg-emerald-600 font-extrabold flex items-center gap-1.5 border border-emerald-100 rounded-xl px-3 py-1.5 shadow-sm bg-emerald-50 transition-colors"
        >
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  );
}
