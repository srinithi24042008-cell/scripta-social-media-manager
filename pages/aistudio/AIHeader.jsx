import React from 'react';

export default function AIHeader() {
  return (
    <div className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">AI Content Studio</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Generate, refine, and deploy AI-driven content</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 z-30">AI</div>
          <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 z-20">GP</div>
          <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 z-10">MD</div>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
          Share Project
        </button>
      </div>
    </div>
  );
}
