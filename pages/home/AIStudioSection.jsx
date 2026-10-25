import { useState, useRef, useEffect } from 'react';

const Icon = {
  Sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  ),
  Image: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  Mic: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  Hash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <line x1="5" y1="9" x2="19" y2="9" /><line x1="5" y1="15" x2="19" y2="15" />
      <line x1="10" y1="4" x2="8" y2="20" /><line x1="16" y1="4" x2="14" y2="20" />
    </svg>
  ),
  Megaphone: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M3 11v2a2 2 0 002 2h1l3 5v-9" /><path d="M9 8l9-5v18l-9-5" />
      <path d="M18 11a3 3 0 010 2" />
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
    </svg>
  ),
  Type: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="9" y1="20" x2="15" y2="20" />
    </svg>
  ),
  Send: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Calendar: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

const compileOutputs = [
  { label: 'Post Caption', icon: 'Type' },
  { label: 'Creative Image', icon: 'Image' },
  { label: 'Hashtags', icon: 'Hash' },
  { label: 'Call-to-Action', icon: 'Megaphone' },
  { label: 'Best Post Time', icon: 'Clock' },
];

const studioTabs = [
  {
    id: 'compiler',
    label: 'Smart Creator',
    kicker: 'Batch Campaign Compiler',
    blurb: 'Type a campaign idea once. AI Studio works in parallel to generate everything you need to post — copy, visuals, and strategy — in a single compile.',
  },
  {
    id: 'generators',
    label: 'Generators',
    kicker: 'Standalone Generators',
    blurb: "Don't need the full package? Run any generator on its own — image, audio, or copy — whenever inspiration strikes.",
  },
  {
    id: 'dashboard',
    label: 'Preview Dashboard',
    kicker: 'Interactive Preview',
    blurb: 'Every compiled package lands on a live control board — edit copy, tap in hashtags, compare platform variants, and check the numbers before you post.',
  },
  {
    id: 'compose',
    label: 'Compose & Calendar',
    kicker: 'One-Click Handoff',
    blurb: 'Send a finished package straight to Compose for a phone-mockup preview, or drop it on the Calendar as a scheduled draft — no copy-pasting required.',
  },
];

const generatorCards = [
  { title: 'Image Generator', desc: 'Instantly generate high-fidelity visuals from a text prompt.', icon: 'Image' },
  { title: 'Audio Generator', desc: 'Turn any script into a natural spoken voiceover.', icon: 'Mic' },
  { title: 'Text Generator', desc: 'Generate on-brand captions and post copy alone.', icon: 'Type' },
];

export default function AIStudioSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiled, setCompiled] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => () => timeoutRef.current && clearTimeout(timeoutRef.current), []);

  const runCompile = () => {
    setCompiled(false);
    setIsCompiling(true);
    timeoutRef.current = setTimeout(() => {
      setIsCompiling(false);
      setCompiled(true);
    }, 1600);
  };

  return (
    <section id="studio" className="mt-32 scroll-mt-24">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase mb-5 border border-blue-200/70">
          <Icon.Sparkles className="w-3.5 h-3.5 text-blue-600" />
          AI Studio
        </span>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-4">
          Your personal AI marketing team
        </h2>
        <p className="text-slate-700 text-[16px] leading-relaxed">
          One idea in. A full campaign out — caption, image, hashtags, and a posting plan, compiled in parallel.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Tab list */}
        <div className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {studioTabs.map((tab, i) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(i)}
              aria-label={`Select AI Studio tab: ${tab.label}`}
              className={`text-left shrink-0 lg:shrink px-4 py-3.5 rounded-xl border transition-all duration-200 ${activeTab === i
                ? 'bg-gradient-to-br from-blue-600 to-sky-500 border-transparent text-white shadow-md shadow-blue-200'
                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">
                0{i + 1}
              </span>
              <span className="block text-sm font-bold whitespace-nowrap lg:whitespace-normal">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab panel */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_rgba(37,99,235,0.06)] p-6 sm:p-8 min-h-[420px]">
          <div key={activeTab}>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">{studioTabs[activeTab].kicker}</span>
            <p className="text-slate-700 mt-2 mb-6 max-w-xl leading-relaxed">{studioTabs[activeTab].blurb}</p>

            {/* Panel 1: Smart Creator */}
            {activeTab === 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-slate-200 bg-blue-50/30 flex flex-col gap-4">
                  <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                    "Launch our summer iced-coffee line…"
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Professional', 'Funny', 'Luxury'].map((tone, i) => (
                      <span key={tone} className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${i === 2 ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300'}`}>
                        {tone}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={runCompile}
                    disabled={isCompiling}
                    aria-label="Compile AI Content Package"
                    className="mt-1 relative overflow-hidden px-5 py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-sky-500 font-semibold text-sm shadow-md shadow-blue-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-80 disabled:translate-y-0"
                  >
                    {isCompiling ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" strokeDasharray="42" strokeDashoffset="14" /></svg>
                        Compiling package…
                      </>
                    ) : (
                      <>
                        <Icon.Sparkles className="w-4 h-4" />
                        Compile AI Content Package
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-600">Runs image, copy, hashtags, CTA, and scheduling in parallel.</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 content-start">
                  {compileOutputs.map((item) => {
                    const IconCmp = Icon[item.icon];
                    return (
                      <div
                        key={item.label}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all duration-300 ${isCompiling ? 'bg-blue-50/50 border-transparent' : 'bg-white border-slate-200'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCompiling ? 'text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                          {!isCompiling && <IconCmp className="w-3.5 h-3.5" />}
                        </div>
                        {!isCompiling && (
                          <span className="text-[11px] font-bold text-slate-800 leading-tight">{item.label}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Panel 2: Standalone Generators */}
            {activeTab === 1 && (
              <div className="grid sm:grid-cols-3 gap-4">
                {generatorCards.map((g) => {
                  const IconCmp = Icon[g.icon];
                  return (
                    <div key={g.title} className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-50 transition-all duration-200 flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <IconCmp className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm font-display">{g.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{g.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Panel 3: Preview Dashboard */}
            {activeTab === 2 && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50/70 border-b border-slate-200">
                  {['Facebook', 'Instagram', 'LinkedIn', 'YouTube'].map((p, i) => (
                    <span key={p} className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${i === 1 ? 'bg-blue-700 text-white' : 'text-slate-600'}`}>{p}</span>
                  ))}
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 leading-relaxed">
                    Cool down this summer ☀️ our iced coffee line is finally here — bold, bright, and brewed for the heat.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['#SummerSips', '#IcedCoffee', '#NewDrop'].map((h) => (
                      <span key={h} className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1 border border-blue-200">
                        {h} <Icon.Check className="w-3 h-3 text-blue-700" />
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Icon.Clock className="w-4 h-4 text-blue-700" />
                      Best time: <span className="font-bold text-slate-900">Today, 5:30 PM</span>
                      <span className="text-emerald-800 font-bold">92% engagement</span>
                    </div>
                    <button type="button" aria-label="Download generated media asset" className="text-xs font-bold text-blue-700 flex items-center gap-1 hover:underline">
                      <Icon.Download className="w-3.5 h-3.5" /> Download media
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Panel 4: Compose & Calendar */}
            {activeTab === 3 && (
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="p-6 rounded-2xl border border-slate-200 flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Icon.Send className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 font-display text-base">Attach to Compose</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Bundles your caption, hashtags, and media, then drops you into the editor with a phone-mockup preview.</p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-200 flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Icon.Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 font-display text-base">Save Calendar Draft</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Adds the whole campaign as a draft straight onto your social media planning calendar.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
