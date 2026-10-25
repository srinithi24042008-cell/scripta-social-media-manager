import React from 'react';
import { Download, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { triggerDownload } from '../utils';

export default function ImagePreview({ images, imageIndex, setImageIndex }) {
  if (!images || images.length === 0) {
    return (
      <div className="py-20 border border-slate-100 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center">
        <ImageIcon className="w-12 h-12 text-slate-300 stroke-[1.2] mb-3" />
        <h4 className="text-sm font-bold text-slate-600">No images generated yet</h4>
        <p className="text-xs text-slate-400 mt-1 font-medium">Your generated visuals will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center aspect-square md:aspect-video group">
        <img 
          src={images[imageIndex]?.url} 
          alt={images[imageIndex]?.name} 
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
        />
        
        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setImageIndex((idx) => (idx - 1 + images.length) % images.length)}
              className="absolute left-4 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-800 shadow-lg transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setImageIndex((idx) => (idx + 1) % images.length)}
              className="absolute right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-800 shadow-lg transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
            {imageIndex + 1} / {images.length}
          </span>
          <span className="text-xs font-semibold text-slate-500 truncate max-w-[150px]">
            {images[imageIndex]?.name || 'Generated Image'}
          </span>
        </div>
        
        <button
          onClick={() => triggerDownload(images[imageIndex]?.url, `${images[imageIndex]?.name || 'image'}.jpg`)}
          className="text-[11px] text-indigo-600 hover:text-white hover:bg-indigo-600 font-extrabold flex items-center gap-1.5 border border-indigo-100 rounded-xl px-3 py-1.5 shadow-sm bg-indigo-50 transition-colors"
        >
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  );
}
