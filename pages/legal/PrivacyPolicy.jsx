import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const CONTACT_EMAIL = 'yamunak972006@gmail.com';
const LAST_UPDATED = 'July 30, 2026';

// ── Shared icon helpers ──────────────────────────────────────────────────────
const Icon = {
  Shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Database: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Users: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Globe: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Cookie: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01" />
      <path d="M16 15.5v.01" />
      <path d="M12 12v.01" />
    </svg>
  ),
  Mail: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  CheckCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  AlertCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ── Key Promises Banner ──────────────────────────────────────────────────────
const KEY_PROMISES = [
  { icon: Icon.Lock, text: 'We never store your social media passwords.' },
  { icon: Icon.Shield, text: 'All authentication is via secure OAuth 2.0.' },
  { icon: Icon.Users, text: 'Your data is never sold to third parties.' },
  { icon: Icon.CheckCircle, text: 'Revoke access anytime from your social accounts.' },
];

// ── Section component ────────────────────────────────────────────────────────
function Section({ id, icon: IconComp, title, accent = 'indigo', children }) {
  const accentMap = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', dot: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-500' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-500' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100', dot: 'bg-violet-500' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100', dot: 'bg-cyan-500' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-500' },
  };
  const c = accentMap[accent];
  return (
    <section id={id} className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className={`${c.bg} ${c.border} border-b px-6 py-5 flex items-center gap-3`}>
          <div className={`w-9 h-9 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center shrink-0`}>
            <IconComp className={`w-5 h-5 ${c.icon}`} />
          </div>
          <h2 className="text-base font-700 text-slate-800 font-bold">{title}</h2>
        </div>
        {/* Body */}
        <div className="px-6 py-6 prose prose-slate prose-sm max-w-none leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
}

// ── Platform pill ────────────────────────────────────────────────────────────
function PlatformChip({ name, color }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {name}
    </span>
  );
}

// ── List with checkmarks ─────────────────────────────────────────────────────
function CheckList({ items }) {
  return (
    <ul className="space-y-2 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
          <Icon.CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── TOC nav link ─────────────────────────────────────────────────────────────
function TocLink({ href, children }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
      {children}
    </a>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Helmet>
        <title>Privacy Policy — Scripta</title>
        <meta name="description" content="Scripta's Privacy Policy explains how we collect, use, and protect your personal data, including Google, Facebook, Instagram, LinkedIn, and YouTube OAuth data." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://sm.coptercode.co.in/privacy" />
        <meta property="og:title" content="Privacy Policy — Scripta" />
        <meta property="og:description" content="How Scripta collects, uses, and protects your data." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ── Top Nav Bar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-800 hover:text-indigo-600 transition-colors text-sm">
            <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Scripta
          </Link>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <Link to="/terms" className="hover:text-slate-800 transition-colors hidden sm:block">Terms</Link>
            <Link to="/data-deletion" className="hover:text-slate-800 transition-colors hidden sm:block">Data Deletion</Link>
            <span className="w-px h-4 bg-slate-200 hidden sm:block" />
            <Link to="/" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
              Back to App
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Page Header ── */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Icon.Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Privacy Policy</h1>
              <p className="mt-1 text-sm text-slate-500">
                Last updated: <span className="font-medium text-slate-700">{LAST_UPDATED}</span> · Effective immediately
              </p>
              <p className="mt-3 text-sm text-slate-600 max-w-2xl">
                At <strong>Scripta</strong>, your privacy is fundamental to everything we build. This policy explains what data we collect, why we collect it, and how we protect it.
              </p>
            </div>
          </div>

          {/* Key Promises */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {KEY_PROMISES.map(({ icon: Ic, text }, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
                <Ic className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <span className="text-xs font-medium text-slate-700">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-8">

        {/* Sidebar TOC */}
        <aside className="lg:w-64 shrink-0">
          <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Contents</p>
            <nav className="space-y-0.5" aria-label="Table of contents">
              <TocLink href="#information-we-collect">Information We Collect</TocLink>
              <TocLink href="#oauth-data">OAuth & Platform Data</TocLink>
              <TocLink href="#how-we-use">How We Use Your Data</TocLink>
              <TocLink href="#cookies">Cookies</TocLink>
              <TocLink href="#security">Security Measures</TocLink>
              <TocLink href="#retention">Data Retention</TocLink>
              <TocLink href="#third-parties">Third-Party Services</TocLink>
              <TocLink href="#your-rights">Your Rights</TocLink>
              <TocLink href="#contact">Contact Us</TocLink>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 space-y-6" role="main">

          {/* 1. Information We Collect */}
          <Section id="information-we-collect" icon={Icon.Database} title="1. Information We Collect" accent="indigo">
            <p className="text-sm text-slate-600 mb-4">
              We collect the following categories of information when you use Scripta:
            </p>

            <h3 className="font-semibold text-slate-800 text-sm mb-2">Account Information</h3>
            <CheckList items={[
              'Full name and display name',
              'Email address (used for login, notifications, and support)',
              'Profile picture (fetched from OAuth provider)',
              'Password hash (only for email/password accounts — never plain text)',
            ]} />

            <h3 className="font-semibold text-slate-800 text-sm mt-5 mb-2">Connected Social Account Information</h3>
            <CheckList items={[
              'OAuth access tokens and refresh tokens (encrypted at rest)',
              'Platform-issued user IDs and page/channel IDs',
              'Page names, profile names, and account handles',
              'Follower count and basic profile metadata from each platform',
            ]} />

            <h3 className="font-semibold text-slate-800 text-sm mt-5 mb-2">Content & Usage Data</h3>
            <CheckList items={[
              'Post content, captions, hashtags, and media (images, videos) you draft or schedule',
              'Scheduled post timestamps and publishing status',
              'Analytics data: impressions, reach, engagement, clicks, and follower growth fetched from platform APIs',
              'AI-generated content created using our AI Studio feature',
              'Draft content saved but not yet published',
            ]} />

            <h3 className="font-semibold text-slate-800 text-sm mt-5 mb-2">Technical Data</h3>
            <CheckList items={[
              'IP address and approximate geographic region',
              'Browser type, version, and operating system',
              'Session timestamps and feature interaction logs',
              'Error logs and crash reports (anonymized)',
            ]} />

            <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Icon.AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>Scripta never stores your social media passwords.</strong> Authentication is performed exclusively through OAuth 2.0 — the industry-standard secure protocol. We only ever receive an access token from the platform.
              </p>
            </div>
          </Section>

          {/* 2. OAuth & Platform Data */}
          <Section id="oauth-data" icon={Icon.Globe} title="2. OAuth & Connected Platform Data" accent="blue">
            <p className="text-sm text-slate-600 mb-4">
              When you connect a social media account, the respective platform shares limited data with us via OAuth 2.0. Below is a per-platform breakdown of what we access and why.
            </p>

            {/* Google */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <PlatformChip name="Google OAuth" color="bg-blue-100 text-blue-700" />
                <PlatformChip name="YouTube Data API v3" color="bg-red-100 text-red-700" />
              </div>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Permissions Requested</p>
              <CheckList items={[
                'openid, profile, email — to create/authenticate your Scripta account',
                'youtube.readonly — to fetch your channel list and analytics',
                'youtube.upload — to publish video content to your YouTube channel',
                'youtube.force-ssl — ensures all API calls use HTTPS',
                'yt-analytics.readonly — to retrieve YouTube analytics reports',
              ]} />
              <p className="text-xs text-slate-500 mt-3">
                We access only the channels and analytics you explicitly authorise. We do not access your personal Google Drive, Gmail, or any other Google service.
              </p>
            </div>

            {/* Facebook */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <PlatformChip name="Facebook Login" color="bg-blue-100 text-blue-700" />
                <PlatformChip name="Meta Graph API" color="bg-indigo-100 text-indigo-700" />
              </div>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Permissions Requested</p>
              <CheckList items={[
                'public_profile — your name and profile picture',
                'email — your primary Facebook email address',
                'pages_show_list — list of Facebook Pages you manage',
                'pages_read_engagement — read engagement metrics from your Pages',
                'pages_manage_posts — publish and schedule posts on your Pages',
                'pages_read_user_content — read posts on your Pages',
                'read_insights — access Page and post analytics insights',
              ]} />
              <p className="text-xs text-slate-500 mt-3">
                We only access Facebook Pages you manage and explicitly connect within Scripta. We never access your personal Facebook profile posts or friends list.
              </p>
            </div>

            {/* Instagram */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <PlatformChip name="Instagram Graph API" color="bg-pink-100 text-pink-700" />
              </div>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Permissions Requested</p>
              <CheckList items={[
                'instagram_basic — your Instagram Business/Creator account profile',
                'instagram_content_publish — publish feed posts, carousels, and Reels',
                'instagram_manage_insights — access post and account-level analytics',
                'instagram_manage_comments — read and manage post comments (optional)',
                'pages_show_list — required to retrieve your linked Instagram account',
              ]} />
              <p className="text-xs text-slate-500 mt-3">
                Instagram access requires a connected Facebook Page and a Business or Creator Instagram account. We do not access personal Instagram accounts or direct messages.
              </p>
            </div>

            {/* LinkedIn */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <PlatformChip name="LinkedIn OAuth 2.0" color="bg-sky-100 text-sky-700" />
              </div>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Permissions Requested</p>
              <CheckList items={[
                'openid, profile, email — to identify your LinkedIn account in Scripta',
                'w_member_social — publish posts on your personal LinkedIn profile',
                'w_organization_social — publish posts on LinkedIn Company Pages you admin',
                'r_organization_social — read engagement data from Company Pages',
                'rw_organization_admin — required to manage Company Page posts',
              ]} />
              <p className="text-xs text-slate-500 mt-3">
                We do not access your LinkedIn connections, messages, or InMail. We only publish content and read analytics for accounts you explicitly connect.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs text-emerald-800">
                <strong className="font-semibold">You can revoke access at any time</strong> by visiting the connected account settings page of the respective platform (e.g., Facebook Settings → Apps and Websites, Google Account → Third-party access). Revoking access on the platform will invalidate our stored token and stop all scheduled posts for that account.
              </p>
            </div>
          </Section>

          {/* 3. How We Use Your Data */}
          <Section id="how-we-use" icon={Icon.CheckCircle} title="3. How We Use Your Data" accent="emerald">
            <p className="text-sm text-slate-600 mb-3">
              Your data is used <strong>exclusively</strong> for the following purposes:
            </p>
            <CheckList items={[
              'Authentication — verifying your identity when you sign in',
              'Post Publishing — sending your scheduled content to connected social platforms on your behalf',
              'Scheduling — storing your post drafts and scheduling them for future publication',
              'Analytics — fetching engagement metrics from platforms and displaying them in your dashboard',
              'AI Content Generation — processing your prompts to generate captions and content via Google Gemini AI',
              'Service Improvement — anonymised usage patterns to improve features and fix bugs',
              'Email Notifications — sending alerts about scheduled posts, errors, and service updates',
            ]} />
            <div className="mt-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <Icon.Shield className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-800">
                <strong>We never sell your personal data</strong> to advertisers, data brokers, or any third party. Your data is never used for profiling or targeted advertising.
              </p>
            </div>
          </Section>

          {/* 4. Cookies */}
          <Section id="cookies" icon={Icon.Cookie} title="4. Cookies & Local Storage" accent="amber">
            <p className="text-sm text-slate-600 mb-3">
              Scripta uses minimal cookies and browser storage to operate the service:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs mt-3 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="text-left px-3 py-2 rounded-tl-lg font-semibold">Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Type</th>
                    <th className="text-left px-3 py-2 font-semibold">Purpose</th>
                    <th className="text-left px-3 py-2 rounded-tr-lg font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['scripta_token', 'localStorage', 'Stores your JWT authentication token', 'Until logout'],
                    ['Session Cookie', 'HTTP Cookie', 'Server-side session management', 'Session'],
                    ['oauth_state', 'sessionStorage', 'CSRF protection during OAuth flow', 'OAuth flow only'],
                    ['Preference', 'localStorage', 'UI preferences (e.g. sidebar state)', 'Persistent'],
                  ].map(([name, type, purpose, duration], i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-medium text-indigo-700">{name}</td>
                      <td className="px-3 py-2 text-slate-600">{type}</td>
                      <td className="px-3 py-2 text-slate-600">{purpose}</td>
                      <td className="px-3 py-2 text-slate-500">{duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              We do <strong>not</strong> use advertising cookies, cross-site tracking cookies, or any third-party analytics cookies (e.g., Google Analytics, Facebook Pixel).
            </p>
          </Section>

          {/* 5. Security */}
          <Section id="security" icon={Icon.Lock} title="5. Security Measures" accent="violet">
            <p className="text-sm text-slate-600 mb-3">
              We take the security of your data seriously and implement the following measures:
            </p>
            <CheckList items={[
              'All data in transit is encrypted using TLS 1.2 or higher (HTTPS only)',
              'OAuth access tokens are encrypted at rest using industry-standard encryption',
              'Passwords (for email accounts) are hashed using bcrypt with a high work factor — we never store plain-text passwords',
              'JWT tokens are signed with a strong secret and expire after a set period',
              'API endpoints are protected by rate limiting to prevent brute-force attacks',
              'HTTP security headers (Helmet.js) including Content-Security-Policy, X-Frame-Options, and HSTS',
              'MongoDB connection is secured via TLS and restricted IP allowlists',
              'Access tokens are scoped to the minimum permissions required for each platform',
              'Regular security reviews and dependency updates',
            ]} />
          </Section>

          {/* 6. Data Retention */}
          <Section id="retention" icon={Icon.Clock} title="6. Data Retention Policy" accent="cyan">
            <p className="text-sm text-slate-600 mb-3">
              We retain your data only as long as necessary to provide the service:
            </p>
            <div className="space-y-3 mt-3">
              {[
                { label: 'Account Data', detail: 'Retained until you delete your account. Permanently deleted within 30 days of account deletion request.' },
                { label: 'OAuth Tokens', detail: 'Stored only while the account is connected. Deleted immediately when you disconnect a platform or delete your account.' },
                { label: 'Scheduled Posts', detail: 'Retained until published or manually deleted. Deleted with your account.' },
                { label: 'Published Post Records', detail: 'Metadata (e.g., post ID, timestamp) retained for analytics for up to 12 months, then deleted.' },
                { label: 'Analytics Data', detail: 'Aggregated analytics data retained for up to 12 months to power your analytics dashboard.' },
                { label: 'Server Logs', detail: 'Anonymized technical logs retained for up to 90 days for debugging and security purposes.' },
              ].map(({ label, detail }, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-sm text-slate-800">{label}:</span>{' '}
                    <span className="text-sm text-slate-600">{detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 7. Third-Party Services */}
          <Section id="third-parties" icon={Icon.Globe} title="7. Third-Party Services" accent="slate">
            <p className="text-sm text-slate-600 mb-4">
              Scripta integrates with the following third-party services. Each service has its own privacy policy:
            </p>
            <div className="space-y-3">
              {[
                { name: 'Google (OAuth & YouTube)', purpose: 'Authentication and YouTube publishing', link: 'https://policies.google.com/privacy' },
                { name: 'Meta (Facebook & Instagram)', purpose: 'Facebook and Instagram publishing and analytics', link: 'https://www.facebook.com/privacy/policy/' },
                { name: 'LinkedIn', purpose: 'LinkedIn post publishing and analytics', link: 'https://www.linkedin.com/legal/privacy-policy' },
                { name: 'Cloudinary', purpose: 'Cloud storage and processing of media files you upload for posts', link: 'https://cloudinary.com/privacy' },
                { name: 'Google Gemini AI', purpose: 'AI content generation in AI Studio', link: 'https://ai.google.dev/terms' },
                { name: 'MongoDB Atlas', purpose: 'Secure cloud database hosting', link: 'https://www.mongodb.com/legal/privacy-policy' },
              ].map(({ name, purpose, link }, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800">{name}</span>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">Privacy Policy ↗</a>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 8. Your Rights */}
          <Section id="your-rights" icon={Icon.Users} title="8. Your Rights (GDPR & Privacy Rights)" accent="emerald">
            <p className="text-sm text-slate-600 mb-3">
              Depending on your jurisdiction (including EU/EEA under GDPR, California under CCPA), you have the following rights:
            </p>
            <CheckList items={[
              'Right to Access — request a copy of all personal data we hold about you',
              'Right to Rectification — correct inaccurate personal data',
              'Right to Erasure ("Right to be Forgotten") — request deletion of your account and all associated data',
              'Right to Restriction of Processing — request we stop processing your data in certain circumstances',
              'Right to Data Portability — receive your data in a structured, machine-readable format',
              'Right to Object — object to processing of your data for certain purposes',
              'Right to Withdraw Consent — withdraw OAuth consent at any time from the respective platform settings',
              'Right to Lodge a Complaint — with your local data protection authority (e.g., ICO in the UK, DPA in EU countries)',
            ]} />
            <p className="mt-4 text-sm text-slate-600">
              To exercise any of these rights, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 font-medium hover:underline">{CONTACT_EMAIL}</a>. We will respond within 30 days.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              To delete your account and all data, see our{' '}
              <Link to="/data-deletion" className="text-indigo-600 font-medium hover:underline">User Data Deletion</Link> page.
            </p>
          </Section>

          {/* 9. Contact */}
          <Section id="contact" icon={Icon.Mail} title="9. Contact Us" accent="indigo">
            <p className="text-sm text-slate-600 mb-4">
              For any privacy-related questions, data requests, or concerns, please contact us:
            </p>
            <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Icon.Mail className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Privacy Contact Email</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-700 font-semibold hover:underline text-sm">{CONTACT_EMAIL}</a>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              We may update this Privacy Policy from time to time. Material changes will be notified via email. Continued use of Scripta after changes constitutes acceptance of the revised policy.
            </p>
          </Section>

        </main>
      </div>

      {/* ── Footer ── */}
      <LegalFooter active="privacy" />
    </div>
  );
}

// ── Shared Legal Footer (exported for re-use) ────────────────────────────────
export function LegalFooter({ active }) {
  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-sm font-semibold text-slate-700">Scripta</span>
            <span className="text-xs text-slate-400">© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap justify-center" aria-label="Legal pages">
            {[
              { to: '/privacy', label: 'Privacy Policy' },
              { to: '/terms', label: 'Terms of Service' },
              { to: '/data-deletion', label: 'Data Deletion' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active === to.replace('/', '') || (active === 'privacy' && to === '/privacy') || (active === 'terms' && to === '/terms') || (active === 'data-deletion' && to === '/data-deletion')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
