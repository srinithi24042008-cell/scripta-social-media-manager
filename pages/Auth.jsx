import { useState, useEffect } from 'react';
import { api, setToken } from '../api';
import { useGoogleLogin } from "@react-oauth/google";
export default function Auth({ initialMode = 'login', onAuthed, onBack }) {
  const [mode, setMode] = useState(initialMode);

  // Dynamic sync when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTOS, setAgreeTOS] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showMailChooser, setShowMailChooser] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => {
    const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    return envId ? String(envId).trim().replace(/^["']|["']$/g, '') : null;
  });

  useEffect(() => {
    fetch('/api/auth/google/client-id')
      .then(res => res.json())
      .then(data => {
        if (data.client_id) {
          setGoogleClientId(String(data.client_id).trim().replace(/^["']|["']$/g, ''));
        }
      })
      .catch(err => console.error('Failed to load Google Client ID:', err));
  }, []);
  const availableEmails = [
    'jane.cooper@socially.com',
    'jane.personal@gmail.com',
    'cooper.marketing@outlook.com'
  ];

  async function handleGoogleAuth(email, name) {
    setBusy(true);
    setError('');
    const mockPassword = 'SociallyOAuthMockPassword123!';
    try {
      let data;
      // First try to login, fallback to register if user doesn't exist
      try {
        data = await api.login(email, mockPassword);
      } catch (err) {
        data = await api.register(email, mockPassword, name || 'Google User');
      }
      setToken(data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message || 'Connecting with Google account failed');
    } finally {
      setBusy(false);
    }
  }



  async function selectAndConnectMail(selectedEmail) {
    setShowMailChooser(false);
    setBusy(true);
    setError('');
    const mockPassword = 'SociallyOAuthMockPassword123!';
    try {
      let data;
      if (mode === 'login') {
        try {
          data = await api.login(selectedEmail, mockPassword);
        } catch (err) {
          data = await api.register(selectedEmail, mockPassword, 'Jane Cooper');
        }
      } else {
        try {
          data = await api.register(selectedEmail, mockPassword, 'Jane Cooper');
        } catch (err) {
          data = await api.login(selectedEmail, mockPassword);
        }
      }
      setToken(data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message || 'Connecting with email account failed');
    } finally {
      setBusy(false);
    }
  }

  // Dynamic Password Strength Calculator
  function getPasswordStrength(pwd) {
    if (!pwd) return { label: '', color: 'bg-slate-100', textClass: 'text-slate-400', percentage: '0%' };
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-rose-500', textClass: 'text-rose-500', percentage: '33%' };

    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSymbols = /[^a-zA-Z0-9]/.test(pwd);
    const score = [hasLetters, hasNumbers, hasSymbols].filter(Boolean).length;

    if (pwd.length >= 8 && score === 3) {
      return { label: 'Strong', color: 'bg-emerald-500', textClass: 'text-emerald-500', percentage: '100%' };
    } else if (pwd.length >= 8 || score >= 2) {
      return { label: 'Medium', color: 'bg-amber-500', textClass: 'text-amber-500', percentage: '66%' };
    } else {
      return { label: 'Weak', color: 'bg-rose-500', textClass: 'text-rose-500', percentage: '33%' };
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (mode === 'forgot') {
      setBusy(true);
      try {
        if (forgotStep === 1) {
          const res = await api.forgotPassword(email);
          setDemoCode(res.code || '');
          setForgotStep(2);
          setSuccessMessage(res.code ? 'Verification code generated! Check below.' : 'Verification code sent to your email address!');
        } else {
          if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
          }
          await api.resetPassword(email, verificationCode, password);
          setSuccessMessage('Password reset successfully! You can now log in.');
          setMode('login');
          setForgotStep(1);
          setVerificationCode('');
          setDemoCode('');
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (!agreeTOS) {
        setError('You must agree to the Terms of Service and Privacy Policy');
        return;
      }
    }

    setBusy(true);
    try {
      const combinedName = mode === 'register' ? `${firstName} ${lastName}`.trim() : '';
      const data = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password, combinedName);
      setToken(data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 relative font-sans selection:bg-indigo-100 selection:text-indigo-900 lg:grid lg:grid-cols-12 overflow-x-hidden">

      {/* LEFT COLUMN: BRANDING & MOCKUP */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between py-10 px-8 lg:px-12 bg-[#f8faff] border-r border-slate-100 relative">

        {/* Ambient background glow nodes on left */}
        <div className="w-80 h-80 rounded-full bg-indigo-100/40 absolute -top-20 -left-20 blur-[80px] pointer-events-none" />
        <div className="w-80 h-80 rounded-full bg-purple-100/30 absolute bottom-10 right-0 blur-[80px] pointer-events-none" />

        {/* Top Header Logo Row */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity" onClick={onBack}>
            <img src="/logo.png" alt="Scripta Logo" className="w-9 h-9 object-contain shrink-0" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">Scripta</span>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-400 hover:text-violet-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Home
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="my-auto py-10 relative z-10">
          <h1 className="text-3xl lg:text-[38px] font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-4">
            {mode === 'login' ? (
              <>
                Welcome Back.<br />
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-500 bg-clip-text text-transparent">Log into your account.</span>
              </>
            ) : (
              <>
                Create Your Account.<br />
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-500 bg-clip-text text-transparent">Grow Your Brand.</span>
              </>
            )}
          </h1>
          <p className="text-[14px] text-slate-600 mb-8 max-w-sm leading-relaxed">
            {mode === 'login'
              ? 'Manage, schedule, analyze, and grow your social media with ease.'
              : 'Join Socially and unlock powerful tools to manage, schedule, analyze, and grow all your social media in one place.'}
          </p>

          {/* Feature details */}
          <div className="space-y-6 max-w-sm">
            {mode === 'login' ? (
              <>
                {/* Centralized Dashboard */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Centralized Dashboard</h4>
                    <p className="text-xs text-slate-500 mt-0.5">View all your social metrics and tools.</p>
                  </div>
                </div>

                {/* Performance Reports */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 shadow-sm">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Performance Reports</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Generate detailed, insights-driven reports.</p>
                  </div>
                </div>

                {/* Audience Growth */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 shrink-0 shadow-sm">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Audience Growth</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Track and engage new followers.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Schedule & publish posts */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Schedule & publish posts</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Plan content across platforms</p>
                  </div>
                </div>

                {/* Track performance */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 shadow-sm">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Track performance</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Get real-time insights and analytics</p>
                  </div>
                </div>

                {/* Engage your audience */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 shrink-0 shadow-sm">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Engage your audience</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Build stronger connections and grow faster</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Miniature Mockup */}
        <div className="hidden lg:block relative mt-4">
          <style>{`
            @keyframes float-insta-mini {
              0% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-4px) rotate(2deg); }
              100% { transform: translateY(0px) rotate(0deg); }
            }
            @keyframes float-fb-mini {
              0% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-6px) rotate(-3deg); }
              100% { transform: translateY(0px) rotate(0deg); }
            }
            @keyframes float-tw-mini {
              0% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(4px) rotate(4deg); }
              100% { transform: translateY(0px) rotate(0deg); }
            }
            @keyframes float-in-mini {
              0% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(5px) rotate(-2deg); }
              100% { transform: translateY(0px) rotate(0deg); }
            }
            .animate-float-insta-mini { animation: float-insta-mini 5s ease-in-out infinite; }
            .animate-float-fb-mini { animation: float-fb-mini 4.5s ease-in-out infinite; }
            .animate-float-tw-mini { animation: float-tw-mini 6s ease-in-out infinite; }
            .animate-float-in-mini { animation: float-in-mini 5.5s ease-in-out infinite; }
          `}</style>

          {/* Mockup card */}
          <div className="w-[360px] bg-white rounded-2xl border border-slate-100 shadow-[0_10px_30px_rgba(99,102,241,0.04)] p-4 relative z-10 select-none overflow-hidden scale-[0.98] origin-bottom-left">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-bold text-slate-800">Dashboard</span>
              <div className="flex gap-1.5 items-center">
                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                <div className="w-4 h-4 rounded-full bg-slate-100"></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="p-1.5 border border-slate-50 rounded-lg bg-slate-50/20">
                <span className="text-[6px] font-semibold text-slate-400 block mb-0.5">Total Reach</span>
                <span className="text-[9px] font-bold text-slate-800">125.4K</span>
              </div>
              <div className="p-1.5 border border-slate-50 rounded-lg bg-slate-50/20">
                <span className="text-[6px] font-semibold text-slate-400 block mb-0.5">Engagement</span>
                <span className="text-[9px] font-bold text-slate-800">18.7K</span>
              </div>
              <div className="p-1.5 border border-slate-50 rounded-lg bg-slate-50/20">
                <span className="text-[6px] font-semibold text-slate-400 block mb-0.5">Followers</span>
                <span className="text-[9px] font-bold text-slate-800">2.4K</span>
              </div>
            </div>

            <div className="p-2 border border-slate-50 rounded-xl mb-1.5">
              <svg className="w-full h-14" viewBox="0 0 200 50">
                <path d="M 0 40 Q 15 48, 30 35 T 60 22 T 90 40 T 120 25 T 150 12 T 200 15" fill="none" stroke="#4f46e5" strokeWidth="1.8" />
                <path d="M 0 40 Q 15 48, 30 35 T 60 22 T 90 40 T 120 25 T 150 12 T 200 15 L 200 50 L 0 50 Z" fill="#4f46e5" fillOpacity="0.04" />
              </svg>
            </div>
          </div>

          {/* Social icons floating around */}
          <div className="absolute -top-3.5 left-[30%] w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-center shadow-md border border-white animate-float-insta-mini z-20">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            </svg>
          </div>
          <div className="absolute -right-3 top-1/4 w-7 h-7 rounded-full bg-[#1877f2] text-white flex items-center justify-center shadow-md border border-white animate-float-fb-mini z-20">
            <span className="text-[10px] font-bold">f</span>
          </div>
          <div className="absolute -left-4 top-1/2 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shadow-md border border-white animate-float-tw-mini z-20">
            <span className="text-[8px] font-bold">𝕏</span>
          </div>
          <div className="absolute -bottom-3 left-1/3 w-7 h-7 rounded-full bg-[#0a66c2] text-white flex items-center justify-center shadow-md border border-white animate-float-in-mini z-20">
            <span className="text-[8px] font-bold">in</span>
          </div>
          <div className="absolute -bottom-4 right-10 z-20 pointer-events-none">
            <svg viewBox="0 0 100 120" className="w-10 h-12 text-slate-800" fill="none">
              <path d="M35 85 L38 110 H62 L65 85 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
              <path d="M48 80 Q35 70 25 55 Q35 50 47 70 Z" fill="#a7f3d0" stroke="#34d399" strokeWidth="1.5" />
              <path d="M50 80 Q50 50 50 30 Q60 40 52 70 Z" fill="#059669" stroke="#047857" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: FORM SECTION */}
      <div className="lg:col-span-7 flex items-center justify-center bg-slate-50/50 p-4 sm:p-8 md:p-12 lg:p-16 relative min-h-screen">
        <div className="w-full max-w-[480px] bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-[0_20px_50px_rgba(99,102,241,0.04)] p-6 sm:p-8 md:p-10 z-10 relative">

          <form onSubmit={submit} className="flex flex-col gap-5">
            {/* Header Form Titles */}
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">
                {mode === 'login' ? 'Log In' : mode === 'register' ? 'Sign Up' : 'Reset Password'}
              </h2>

              <p className="text-sm text-slate-500 font-medium">
                {mode === 'login' ? (
                  <>
                    New here?{' '}
                    <span
                      className="text-violet-600 font-bold hover:text-violet-700 cursor-pointer transition-colors"
                      onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
                    >
                      Sign up
                    </span>
                  </>
                ) : mode === 'register' ? (
                  <>
                    Already have an account?{' '}
                    <span
                      className="text-violet-600 font-bold hover:text-violet-700 cursor-pointer transition-colors"
                      onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                    >
                      Log in
                    </span>
                  </>
                ) : (
                  <>
                    Remembered password?{' '}
                    <span
                      className="text-indigo-600 font-bold hover:text-indigo-700 cursor-pointer transition-colors"
                      onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); setForgotStep(1); setVerificationCode(''); setDemoCode(''); }}
                    >
                      Log in
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* ERROR DISPLAY */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold leading-normal">
                {error}
              </div>
            )}

            {/* SUCCESS DISPLAY */}
            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-semibold leading-normal">
                {successMessage}
              </div>
            )}

            {/* If mode is forgot and step is 1, show only email field */}
            {mode === 'forgot' && forgotStep === 1 && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                    />
                  </div>
                </div>

                <button type="submit"
                  disabled={busy}
                  className="w-full py-3.5 mt-2 rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-bold text-sm shadow-md hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Sending...' : 'Send Verification Code'}
                  {!busy && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {/* If mode is forgot and step is 2, show code, password and confirmPassword fields */}
            {mode === 'forgot' && forgotStep === 2 && (
              <div className="flex flex-col gap-5">
                {demoCode && (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-semibold leading-normal">
                    <p className="font-bold mb-1">🔑 Demo Verification Code:</p>
                    <p className="font-mono text-base tracking-widest bg-white/80 p-2 rounded border border-indigo-200 text-center select-all">{demoCode}</p>
                    <p className="text-[10px] text-indigo-500 mt-1">Please enter this code below to verify your request.</p>
                  </div>
                )}

                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Verification Code</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium tracking-wider"
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="New Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 mt-2 rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-bold text-sm shadow-md hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Resetting Password...' : 'Reset Password'}
                  {!busy && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>

                <div className="flex justify-between items-center mt-1">
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setError(''); setSuccessMessage(''); setDemoCode(''); }}
                    className="text-[11px] font-bold text-slate-400 hover:text-violet-600 transition-colors"
                  >
                    ← Back to Step 1
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const res = await api.forgotPassword(email);
                        setDemoCode(res.code || '');
                        setSuccessMessage(res.code ? 'A new verification code was generated!' : 'A new verification code has been sent to your email address!');
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="text-[11px] font-bold text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <>
                {/* Dynamic registration names row */}
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Last Name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Forgot Password link under password field, in login mode */}
                  {mode === 'login' && (
                    <div className="flex justify-end mt-2">
                      <span
                        onClick={() => { setMode('forgot'); setForgotStep(1); setError(''); setSuccessMessage(''); setVerificationCode(''); setDemoCode(''); }}
                        className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </span>
                    </div>
                  )}

                  {/* Password complexity indicator for register */}
                  {mode === 'register' && password && (
                    <div className="mt-2.5">
                      <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                        <span className="text-slate-400">Password must be at least 8 characters</span>
                        <span className={getPasswordStrength(password).textClass}>
                          Strength: {getPasswordStrength(password).label}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getPasswordStrength(password).color} transition-all duration-300`}
                          style={{ width: getPasswordStrength(password).percentage }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password (only for register) */}
                {mode === 'register' && (
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-850 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 font-medium"
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Checkbox agreement (only for register) */}
                {mode === 'register' && (
                  <div className="flex items-start gap-2.5 mt-1">
                    <input
                      id="agree-tos"
                      type="checkbox"
                      required
                      checked={agreeTOS}
                      onChange={(e) => setAgreeTOS(e.target.checked)}
                      className="w-4.5 h-4.5 rounded text-indigo-600 border-slate-350 focus:ring-indigo-500 mt-0.5 accent-indigo-600 cursor-pointer shrink-0"
                    />
                    <label htmlFor="agree-tos" className="text-[11px] text-slate-500 font-semibold cursor-pointer select-none leading-normal">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 font-bold transition-colors underline underline-offset-2">Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 font-bold transition-colors underline underline-offset-2">Privacy Policy</a>
                    </label>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 mt-2 rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-bold text-sm shadow-md hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Verifying...' : mode === 'login' ? 'Log In' : 'Create Account'}
                  {!busy && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>

                {/* Divider line */}
                <div className="flex items-center my-2">
                  <div className="flex-1 border-t border-slate-100"></div>
                  <span className="px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white">or {mode === 'login' ? 'log in' : 'sign up'} with</span>
                  <div className="flex-1 border-t border-slate-100"></div>
                </div>

                {/* Social options */}
                <div className="flex flex-col gap-2.5">
                  {(googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID) ? (
                    <GoogleLoginButton
                      onSuccess={async (tokenResponse) => {
                        try {
                          setBusy(true);
                          const data = await api.googleAuth(tokenResponse.access_token);
                          setToken(data.token);
                          onAuthed(data.user);
                        } catch (err) {
                          setError(err.message || 'Google authentication failed');
                        } finally {
                          setBusy(false);
                        }
                      }}
                      onError={(error) => {
                        setError('Google login failed or was closed');
                        console.error(error);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setError('Google login is unavailable because Client ID is not configured on backend or in frontend VITE_GOOGLE_CLIENT_ID.')}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed shadow-sm"
                    >
                      <span>Google Login (Credentials Missing)</span>
                    </button>
                  )}
                </div>

                {/* Bottom Security Disclaimer */}
                <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-bold text-slate-400 select-none">
                  <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  We'll never post on your behalf without permission.
                </div>
              </>
            )}

          </form>

        </div>
      </div>

      {/* Google Mail account selector modal overlay */}
      {showMailChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMailChooser(false)}>
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl relative text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Choose Google Account</h3>
              <button onClick={() => setShowMailChooser(false)} className="text-slate-450 hover:text-slate-650 text-xl font-bold cursor-pointer">×</button>
            </div>
            <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
              Socially detected multiple connected email profiles. Select one to connect immediately:
            </p>
            <div className="space-y-2.5">
              {availableEmails.map((mockEmail) => (
                <button
                  key={mockEmail}
                  onClick={() => selectAndConnectMail(mockEmail)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/5 text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span>{mockEmail}</span>
                  <span className="text-[10px] text-slate-400 font-bold">Connect ➜</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function GoogleLoginButton({ onSuccess, onError }) {
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess,
    onError
  });

  return (
    <button
      type="button"
      onClick={() => triggerGoogleLogin()}
      className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 hover:bg-slate-50 hover:border-slate-350 text-slate-700 text-xs font-extrabold rounded-xl transition-all shadow-sm cursor-pointer"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
      </svg>
      <span>Sign in with Google Mail</span>
    </button>
  );
}