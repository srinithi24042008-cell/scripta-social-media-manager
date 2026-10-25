import React, { useState } from 'react';
import { Type, Copy, PenTool, Clock } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { useAIStudio } from '../AIStudioContext';

export default function TextPreview({ text, setText }) {
  const showToast = useToast();
  const {
    generatedHashtags,
    generatedCTA,
    generatedBestTime,
    generatedPlatformVariants,
    handleStageToDraft,
  } = useAIStudio();

  const [activeVariantTab, setActiveVariantTab] = useState('instagram');

  if (!text) {
    return (
      <div className="py-20 border border-slate-100 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center">
        <Type className="w-12 h-12 text-slate-300 stroke-[1.2] mb-3" />
        <h4 className="text-sm font-bold text-slate-600">No text generated yet</h4>
        <p className="text-xs text-slate-400 mt-1 font-medium">Your copy and captions will appear here.</p>
      </div>
    );
  }

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    showToast('Copied content to clipboard!', 'success');
  };

  const handleApplyVariant = (variantText) => {
    setText(variantText);
    showToast('Applied platform variant as main caption!', 'success');
  };

  // Helper to safely read platform variants
  const getVariantsArray = () => {
    if (!generatedPlatformVariants) return [];
    if (typeof generatedPlatformVariants === 'object' && !Array.isArray(generatedPlatformVariants)) {
      return Object.entries(generatedPlatformVariants).map(([key, val]) => ({
        platform: key,
        content: val
      }));
    }
    return [];
  };

  const variants = getVariantsArray();

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Main Caption Textarea */}
      <div className="relative rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Main Caption</span>
          <div className="flex gap-2">
            <button 
              onClick={() => handleCopy(text)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 p-4 text-xs font-semibold text-slate-700 bg-transparent resize-none focus:outline-none leading-relaxed"
          placeholder="AI generated post content..."
        />
      </div>

      {/* 2. Hashtags Section */}
      {generatedHashtags && generatedHashtags.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Recommended Hashtags</span>
            <button 
              onClick={() => handleCopy(generatedHashtags.join(' '))}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-1 border-none bg-transparent cursor-pointer"
            >
              <Copy size={11} /> Copy All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {generatedHashtags.map((tag, idx) => (
              <span 
                key={idx} 
                onClick={() => {
                  if (!text.includes(tag)) {
                    setText(prev => `${prev.trim()}\n\n${tag}`);
                    showToast(`Added ${tag} to caption!`, 'success');
                  }
                }}
                className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer transition-all border border-slate-100"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Call to Action (CTA) */}
      {generatedCTA && (
        <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 shadow-sm space-y-2">
          <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider block">Suggested Call to Action</span>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold text-slate-700 italic">"{generatedCTA}"</p>
            <button 
              onClick={() => {
                if (!text.includes(generatedCTA)) {
                  setText(prev => `${prev.trim()}\n\n${generatedCTA}`);
                  showToast('Added CTA tagline to caption!', 'success');
                }
              }}
              className="px-2.5 py-1 bg-white hover:bg-indigo-500 hover:text-white rounded-lg text-[10px] font-extrabold text-indigo-600 shadow-sm border border-indigo-100 cursor-pointer transition-colors"
            >
              Add to Post
            </button>
          </div>
        </div>
      )}

      {/* 4. Platform Variants */}
      {variants.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Platform-Specific Copies</span>
          
          <div className="flex bg-slate-100/60 p-0.5 rounded-lg select-none text-[10px] font-extrabold gap-0.5 border border-slate-100">
            {variants.map(v => (
              <button
                key={v.platform}
                onClick={() => setActiveVariantTab(v.platform)}
                className={`flex-1 py-1 rounded-md text-center transition-all border-none cursor-pointer ${
                  activeVariantTab === v.platform
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {v.platform.charAt(0).toUpperCase() + v.platform.slice(1)}
              </button>
            ))}
          </div>

          {variants.map(v => v.platform === activeVariantTab && (
            <div key={v.platform} className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl text-[11px] font-semibold text-slate-600 leading-relaxed border border-slate-100 whitespace-pre-wrap max-h-36 overflow-y-auto">
                {v.content}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(v.content)}
                  className="flex-1 py-1 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 bg-white transition-colors cursor-pointer"
                >
                  Copy Variant
                </button>
                <button
                  onClick={() => handleApplyVariant(v.content)}
                  className="flex-1 py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-600 border-none transition-colors cursor-pointer"
                >
                  Apply as Main
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Best Posting Times */}
      {generatedBestTime && generatedBestTime.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Suggested Best Posting Times</span>
          <div className="space-y-2">
            {generatedBestTime.map((item, idx) => (
              <div key={idx} className="flex flex-col p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 gap-1">
                <div className="flex justify-between items-center text-[10px] font-extrabold">
                  <span className="text-slate-800 uppercase tracking-wide">{item.platform}</span>
                  {item.bestTimes?.[0] && (
                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Score: {item.bestTimes[0].engagementScore || 90}%</span>
                  )}
                </div>
                {item.bestTimes?.map((timeObj, tIdx) => (
                  <div key={tIdx} className="text-left space-y-0.5">
                    <span className="text-[11px] font-bold text-indigo-600 block flex items-center gap-1">
                      <Clock size={11} /> {timeObj.time} - {timeObj.label || 'Optimal'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 block italic leading-relaxed">
                      {timeObj.reason}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action triggers */}
      <div className="flex gap-2">
        <button
          onClick={handleStageToDraft}
          className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-100 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <PenTool size={13} /> Save Calendar Draft
        </button>
      </div>
    </div>
  );
}
