import { lazy, Suspense, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// AIStudioSection is below the fold — only import it when it's about to
// enter the viewport. This removes it from the initial network chain entirely.
const AIStudioSection = lazy(() => import('./home/AIStudioSection'));

const Icon = {
  Sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  ),
};

export default function Home({ onGetStarted, onSignIn, onSignUp }) {
  // ── IntersectionObserver: defer AIStudioSection until near viewport ─────────
  // Avoids adding it to the initial network dependency chain (was 1,036ms deep).
  const studioRef = useRef(null);
  const [studioReady, setStudioReady] = useState(false);

  useEffect(() => {
    const el = studioRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStudioReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' } // Start loading 300px before it enters viewport
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800 relative overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      <Helmet>
        <title>Scripta — AI-Powered Social Media Management Platform</title>
        <meta name="description" content="Scripta is an AI-powered social media management platform. Generate captions, schedule posts, analyze performance, and collaborate with your team across Instagram, Facebook, LinkedIn, and YouTube." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://sm.coptercode.co.in/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Scripta" />
        <meta property="og:url" content="https://sm.coptercode.co.in/" />
        <meta property="og:title" content="Scripta — AI-Powered Social Media Management" />
        <meta property="og:description" content="Plan, write, design, and schedule your social presence with an AI Studio that turns one idea into a full campaign in seconds." />
        <meta property="og:image" content="https://sm.coptercode.co.in/og-image.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Scripta — AI-Powered Social Media Management" />
        <meta name="twitter:description" content="Plan, write, design, and schedule your social presence with an AI Studio that turns one idea into a full campaign in seconds." />
        <meta name="twitter:image" content="https://sm.coptercode.co.in/og-image.png" />
      </Helmet>

      {/* Ambient background glows */}
      <div className="w-[520px] h-[520px] rounded-full bg-blue-100/50 absolute -top-40 -left-40 blur-[110px] pointer-events-none" aria-hidden="true" />
      <div className="w-[600px] h-[600px] rounded-full bg-sky-100/50 absolute -top-20 -right-60 blur-[130px] pointer-events-none" aria-hidden="true" />

      {/* Header */}
      <header role="banner" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Scripta Logo" width="36" height="36" fetchpriority="high" loading="eager" className="w-9 h-9 object-contain shrink-0" />
          <span className="text-xl font-bold tracking-tight font-display bg-gradient-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent">Scripta</span>
        </div>

        <nav role="navigation" aria-label="Main site navigation">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onSignIn}
              aria-label="Log in to your Scripta account"
              className="px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50/60 hover:border-blue-300 transition-all duration-200"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onSignUp || onGetStarted}
              aria-label="Sign up for a free Scripta account"
              className="px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-500 rounded-xl hover:from-blue-700 hover:to-sky-600 shadow-md shadow-blue-100 hover:shadow-lg hover:shadow-blue-200 transition-all duration-200"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content (Immediate Hero Render) */}
      <main role="main" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24 z-10 relative">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase mb-6 border border-blue-200/70">
              <Icon.Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Your AI marketing team
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-[54px] font-display font-extrabold tracking-tight text-slate-900 leading-[1.12] mb-5 sm:mb-6">
              Create Smarter.<br />
              Post Better.<br />
              <span className="bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 bg-clip-text text-transparent">Grow Faster.</span>
            </h1>
            <p className="text-base sm:text-[17px] text-slate-700 mb-6 sm:mb-8 max-w-md leading-relaxed">
              Scripta plans, writes, designs, and schedules your social presence — with an AI Studio that turns one idea into a full campaign in seconds.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-10 sm:mb-12 w-full">
              <button
                type="button"
                onClick={onGetStarted}
                aria-label="Get started free with Scripta"
                className="w-full sm:w-auto px-7 py-4 rounded-xl text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 font-semibold shadow-lg shadow-blue-200/60 hover:shadow-blue-300/60 transition-all duration-200 flex items-center justify-center gap-2 group text-base"
              >
                Get Started Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
              <a
                href="#studio"
                aria-label="Explore AI Studio features"
                className="w-full sm:w-auto px-7 py-4 rounded-xl text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 font-semibold shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2.5 text-base"
              >
                Explore AI Studio
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" className="text-blue-600" /></svg>
              </a>
            </div>

            {/* Feature Sub-cards */}
            {/* sr-only h2 bridges the heading gap: h1 (hero) → h2 (features) → h3 (each card) */}
            <h2 className="sr-only">Key Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-slate-200 w-full">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shadow-sm shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Schedule Posts</h3>
                <p className="text-xs text-slate-600 leading-normal">Plan and publish across platforms</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700 shadow-sm shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Analytics</h3>
                <p className="text-xs text-slate-600 leading-normal">Track performance in real-time</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 shadow-sm shrink-0">
                  <Icon.Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">AI Studio</h3>
                <p className="text-xs text-slate-600 leading-normal">Compile a full campaign in one go</p>
              </div>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end relative">
            <div className="relative">
              <div className="w-[580px] max-w-full bg-white rounded-3xl border border-slate-200 shadow-[0_20px_60px_rgba(37,99,235,0.08)] overflow-hidden flex flex-row shrink-0 relative z-10">
                <div className="w-14 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center py-5 gap-6">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-100">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                  <div className="text-slate-600 flex flex-col gap-5 pt-2">
                    <button type="button" aria-label="AI Studio tool" className="hover:text-blue-700 transition-colors">
                      <Icon.Sparkles className="w-4 h-4" />
                    </button>
                    <button type="button" aria-label="Calendar tool" className="hover:text-slate-900 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </button>
                    <button type="button" aria-label="Drafts tool" className="hover:text-slate-900 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </button>
                    <button type="button" aria-label="Analytics tool" className="hover:text-slate-900 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-[15px] font-display">Dashboard Preview</h3>
                    <div className="flex items-center gap-2.5">
                      <button type="button" aria-label="Select date filter range" className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 bg-slate-50/50 flex items-center gap-1.5 hover:bg-slate-100 transition-colors">
                        May 12 – May 18, 2024
                        <svg className="w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-300">
                        <svg viewBox="0 0 32 32" className="w-full h-full fill-slate-400 bg-slate-100" aria-label="User avatar placeholder"><path d="M16 4a6 6 0 1 1-6 6 6 6 0 0 1 6-6zm0 16c-7.33 0-11 4.67-11 7v1h22v-1c0-2.33-3.67-7-11-7z" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      ['Total Reach', '125.4K', '12.5%'],
                      ['Engagement', '18.7K', '8.3%'],
                      ['New Followers', '2.4K', '15.7%'],
                      ['Link Clicks', '3.6K', '11.2%'],
                    ].map(([label, val, pct]) => (
                      <div key={label} className="p-3 border border-slate-200 rounded-xl bg-blue-50/30">
                        <span className="text-[9px] font-semibold text-slate-600 block mb-1">{label}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-900">{val}</span>
                          <span className="text-[8px] font-bold text-emerald-800">▲ {pct}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-12 gap-3.5">
                    <div className="col-span-8 p-3.5 border border-slate-200 rounded-2xl flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-800">Performance Overview</span>
                        <button type="button" aria-label="Select performance time duration" className="px-2 py-1 border border-slate-200 rounded-md text-[8px] font-bold text-slate-700 bg-slate-50 flex items-center gap-1 hover:bg-slate-100 transition-colors">
                          Last 7 Days
                          <svg className="w-2.5 h-2.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                      </div>
                      <div className="w-full flex-1 min-h-[110px] flex items-center">
                        <svg className="w-full h-[110px]" viewBox="0 0 350 110" aria-label="Performance overview area chart">
                          <defs>
                            <linearGradient id="chart-grad-mock" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="15" x2="350" y2="15" stroke="#f8fafc" strokeDasharray="3 3" />
                          <line x1="0" y1="45" x2="350" y2="45" stroke="#f8fafc" strokeDasharray="3 3" />
                          <line x1="0" y1="75" x2="350" y2="75" stroke="#f8fafc" strokeDasharray="3 3" />
                          <line x1="0" y1="100" x2="350" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                          <path d="M 0 80 Q 30 95, 60 70 T 120 50 T 180 85 T 240 60 T 300 35 T 350 40 L 350 100 L 0 100 Z" fill="url(#chart-grad-mock)" />
                          <path d="M 0 80 Q 30 95, 60 70 T 120 50 T 180 85 T 240 60 T 300 35 T 350 40" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="120" cy="50" r="3.5" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                          <circle cx="300" cy="35" r="3.5" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[8px] font-bold text-slate-600 px-1">
                        <span>May 12</span><span>May 13</span><span>May 14</span><span>May 15</span><span>May 16</span><span>May 17</span><span>May 18</span>
                      </div>
                    </div>

                    <div className="col-span-4 p-3.5 border border-slate-200 rounded-2xl flex flex-col items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 w-full text-left mb-1">Top Platforms</span>
                      <div className="relative my-1">
                        <svg className="w-24 h-24" viewBox="0 0 36 36" aria-label="Platform distribution donut chart">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f0f6ff" strokeWidth="3.2" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ec4899" strokeWidth="3.2" strokeDasharray="45 55" strokeDashoffset="25" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563eb" strokeWidth="3.2" strokeDasharray="30 70" strokeDashoffset="-20" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3.2" strokeDasharray="15 85" strokeDashoffset="-50" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#06b6d4" strokeWidth="3.2" strokeDasharray="10 90" strokeDashoffset="-65" />
                          <text x="18" y="16.5" textAnchor="middle" fontSize="3" fontWeight="bold" fill="#475569">Total</text>
                          <text x="18" y="21.5" textAnchor="middle" fontSize="3.8" fontWeight="bold" fill="#0f172a">125.4K</text>
                        </svg>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full text-[8px] font-bold text-slate-700">
                        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0"></span>Instagram<span className="ml-auto text-slate-600">45%</span></div>
                        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>Facebook<span className="ml-auto text-slate-600">30%</span></div>
                        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>YouTube<span className="ml-auto text-slate-600">15%</span></div>
                        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0"></span>LinkedIn<span className="ml-auto text-slate-600">10%</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Below-the-fold AI Studio Section — deferred until near viewport */}
        {/* studioRef triggers the IntersectionObserver above.              */}
        {/* min-h-[400px] holds layout space so the page doesn't jump.      */}
        <div ref={studioRef} className="min-h-[400px]">
          {studioReady && (
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading AI Studio...</div>}>
              <AIStudioSection />
            </Suspense>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-4 z-20 relative">
        <span>© {new Date().getFullYear()} Scripta by Copter Code. All rights reserved.</span>
        <nav className="flex items-center gap-1 flex-wrap justify-center" aria-label="Legal links">
          <Link to="/privacy" className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">Terms of Service</Link>
          <Link to="/data-deletion" className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">Data Deletion</Link>
        </nav>
      </footer>
    </div>
  );
}