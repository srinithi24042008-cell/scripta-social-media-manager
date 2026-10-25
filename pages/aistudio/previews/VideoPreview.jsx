import React from 'react';
import { Download, Video } from 'lucide-react';
import { triggerDownload } from '../utils';

export default function VideoPreview({ videos }) {
  if (!videos || videos.length === 0) {
    return (
      <div className="py-20 border border-slate-100 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center">
        <Video className="w-12 h-12 text-slate-300 stroke-[1.2] mb-3" />
        <h4 className="text-sm font-bold text-slate-600">No videos generated yet</h4>
        <p className="text-xs text-slate-400 mt-1 font-medium">Your generated clips will appear here.</p>
      </div>
    );
  }

  const latestVideo = videos[videos.length - 1];

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center aspect-video group shadow-inner">
        <video 
          src={latestVideo?.url} 
          controls 
          className="w-full h-full object-cover" 
        />
      </div>

      <div className="flex justify-between items-center px-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
            {latestVideo?.name || 'Generated Video'}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            Duration: {latestVideo?.duration || '00:15'}
          </span>
        </div>
        
        <button
          onClick={() => triggerDownload(latestVideo?.url, `${latestVideo?.name || 'video'}.mp4`)}
          className="text-[11px] text-pink-600 hover:text-white hover:bg-pink-600 font-extrabold flex items-center gap-1.5 border border-pink-100 rounded-xl px-3 py-1.5 shadow-sm bg-pink-50 transition-colors"
        >
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  );
}
