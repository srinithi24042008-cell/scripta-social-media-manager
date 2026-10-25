import React from 'react';
import { Sparkles, Image as ImageIcon, Video, Mic, Type, Loader2, UploadCloud, ChevronDown, CheckCircle2, LayoutGrid, ShieldCheck, Zap, Briefcase, Settings } from 'lucide-react';
import { useAIStudio } from './AIStudioContext';
import { PLATFORMS, TONES, LANGUAGES } from './constants';

export default function MainWorkspace() {
  const {
    prompt, setPrompt,
    platform, setPlatform,
    tone, setTone,
    language, setLanguage,
    videoDuration, setVideoDuration,
    addAudio, setAddAudio,
    loading, handleGenerateAll, handleGenerateSingle,
    uploadFile, uploadPreview, uploadFileType,
    uploading, handleUploadAreaSelect, uploadAreaInputRef,
    subTab, setSubTab
  } = useAIStudio();

  return (
    <div className="flex-1 overflow-y-auto px-10 pt-4 pb-10 relative bg-slate-50">
      <div className="max-w-[900px] mx-auto space-y-10">
        
        {/* Header */}
        <div className="space-y-3">
          <span className="text-[10px] font-extrabold text-indigo-600 tracking-widest uppercase block">AI Content Studio</span>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Create. Customize. Convert.<br/>
            <span className="text-indigo-500">All with AI.</span>
          </h1>
          <p className="text-[13px] text-slate-500 font-medium max-w-lg leading-relaxed">
            Generate images, videos, audio, and text tailored to your needs.<br/>
            Upload content or start fresh—AI will handle the rest.
          </p>
        </div>

        {/* Generator Cards */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { id: 'image', icon: ImageIcon, title: 'Image Generator', desc: 'Generate stunning images from text prompts.', color: 'text-indigo-600', bg: 'bg-indigo-500', btnStr: 'Generate Image', btnColor: 'text-indigo-500 border-indigo-100 hover:bg-indigo-50' },
            { id: 'video', icon: Video, title: 'Video Generator', desc: 'Create engaging videos from text or visuals.', color: 'text-pink-600', bg: 'bg-pink-500', btnStr: 'Generate Video', btnColor: 'text-pink-500 border-pink-100 hover:bg-pink-50' },
            { id: 'audio', icon: Mic, title: 'Audio Generator', desc: 'Generate natural sounding voiceovers & audio.', color: 'text-emerald-600', bg: 'bg-emerald-500', btnStr: 'Generate Audio', btnColor: 'text-emerald-500 border-emerald-100 hover:bg-emerald-50' },
            { id: 'text', icon: Type, title: 'Text Generator', desc: 'Generate copy, captions, and content in seconds.', color: 'text-amber-500', bg: 'bg-amber-500', btnStr: 'Generate Text', btnColor: 'text-amber-500 border-amber-100 hover:bg-amber-50' },
            { id: 'smart', icon: Sparkles, title: 'Smart Creator', desc: 'Combine your content into a complete media package.', color: 'text-violet-600', bg: 'bg-violet-500', btnStr: 'Compile Package', btnColor: 'text-violet-500 border-violet-100 hover:bg-violet-50' }
          ].map(tool => (
            <div key={tool.id} className="bg-white rounded-[24px] border border-slate-100 p-5 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all group">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white mb-4 ${tool.bg} shadow-md group-hover:scale-110 transition-transform`}>
                <tool.icon size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-[12px] font-bold text-slate-800 mb-2 leading-tight">{tool.title}</h3>
              <p className="text-[10px] text-slate-400 font-medium mb-5 flex-1 leading-relaxed px-1">{tool.desc}</p>
              <button
                onClick={() => handleGenerateSingle(tool.id)}
                disabled={loading || !prompt.trim()}
                className={`px-4 py-1.5 rounded-full border text-[10px] font-bold w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tool.btnColor}`}
              >
                {tool.btnStr}
              </button>
            </div>
          ))}
        </div>

        {/* AI Creative Console */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 space-y-8">
          
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-slate-800">AI Creative Console</h3>
                <p className="text-[11px] text-slate-400 font-medium">Prompt and fine-tune your campaign generation parameters</p>
              </div>
            </div>
            <span className="text-[9px] font-bold tracking-widest uppercase bg-indigo-50 text-indigo-500 px-3 py-1.5 rounded-md">Console Ready</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {/* Left Col: Prompt & Platforms */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Describe your creative campaign idea</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Explain what you want to create (e.g., 'A modern aesthetic workstation layout with pastel tones for Instagram grid design'...)"
                  rows="4"
                  className="w-full px-4 py-3 text-[13px] font-medium text-slate-700 placeholder-slate-400 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-300 transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Social Platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all ${platform === p.id ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Dropdowns */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tone of Voice</label>
                <div className="relative">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-4 py-2.5 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:border-indigo-300 transition-all cursor-pointer"
                  >
                    {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Language Output</label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:border-indigo-300 transition-all cursor-pointer"
                  >
                    {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Video Clip Duration</label>
                <div className="relative">
                  <select
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(Number(e.target.value))}
                    className="w-full px-4 py-2.5 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:border-indigo-300 transition-all cursor-pointer"
                  >
                    <option value="5">5 seconds</option>
                    <option value="8">8 seconds</option>
                    <option value="10">10 seconds</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer group w-max">
                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${addAudio ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                    {addAudio && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" checked={addAudio} onChange={(e) => setAddAudio(e.target.checked)} className="hidden" />
                  <span className="text-[12px] font-semibold text-slate-600">Add voiceover translation</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => handleGenerateAll({ preventDefault: () => {} })}
              disabled={loading || !prompt.trim()}
              className="flex-1 py-3 bg-indigo-300 hover:bg-indigo-400 text-white text-[13px] font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Compile AI Content Package
            </button>
            <button className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all">Bulk Draft</button>
            <button onClick={() => setPrompt('')} className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all">Reset</button>
          </div>
        </div>

        {/* Feature Tags */}
        <div className="flex flex-wrap items-center justify-between px-2 pt-2 pb-6 border-t border-slate-100/50 opacity-80">
          {[
            { icon: Sparkles, text: 'AI Powered', c: 'text-indigo-400' },
            { icon: LayoutGrid, text: 'Multi-Format Support', c: 'text-blue-400' },
            { icon: Zap, text: 'High Quality Output', c: 'text-amber-400 fill-amber-400' },
            { icon: ShieldCheck, text: 'Fast & Secure', c: 'text-emerald-400' },
            { icon: Briefcase, text: 'Commercial Use', c: 'text-purple-400' }
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400">
              <feat.icon size={16} className={feat.c} />
              <span className="text-[11px] font-bold text-slate-500">{feat.text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
