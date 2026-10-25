import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LegalFooter } from './PrivacyPolicy';

const CONTACT_EMAIL = 'yamunak972006@gmail.com';
const LAST_UPDATED = 'July 30, 2026';

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
  Mail: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  ExternalLink: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Link: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

// ── Step component ───────────────────────────────────────────────────────────
function Step({ number, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        <div className="w-0.5 flex-1 bg-indigo-100 mt-2" />
      </div>
      <div className="pb-6 flex-1">
        <h3 className="font-semibold text-slate-800 text-sm mb-2">{title}</h3>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

// ── Platform revocation card ─────────────────────────────────────────────────
function PlatformCard({ name, color, icon, steps, url, urlLabel }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-xl border ${color.border} bg-white overflow-hidden`}>
      <button
        id={`platform-${name.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-5 py-4 ${color.headerBg} hover:opacity-90 transition-opacity text-left`}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <span className={`text-xl`} aria-hidden="true">{icon}</span>
          <span className={`font-semibold text-sm ${color.text}`}>{name}</span>
        </div>
        <svg
          className={`w-4 h-4 ${color.text} transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="px-5 py-4 border-t border-slate-100 space-y-3">
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-xs font-medium ${color.text} hover:underline mt-2`}
            >
              <Icon.ExternalLink className="w-3 h-3" />
              {urlLabel || 'Revoke Access Here'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataDeletion() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Helmet>
        <title>User Data Deletion — Scripta</title>
        <meta name="description" content="Learn how to delete your Scripta account, remove connected social media accounts, and revoke OAuth permissions from Facebook, Instagram, LinkedIn, and YouTube." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://sm.coptercode.co.in/data-deletion" />
        <meta property="og:title" content="User Data Deletion — Scripta" />
        <meta property="og:description" content="How to request deletion of your Scripta account and revoke access from connected social media platforms." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-800 hover:text-indigo-600 transition-colors text-sm">
            <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Scripta
          </Link>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <Link to="/privacy" className="hover:text-slate-800 transition-colors hidden sm:block">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-800 transition-colors hidden sm:block">Terms</Link>
            <span className="w-px h-4 bg-slate-200 hidden sm:block" />
            <Link to="/" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
              Back to App
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <Icon.Trash className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">User Data Deletion</h1>
              <p className="mt-1 text-sm text-slate-500">
                Last updated: <span className="font-medium text-slate-700">{LAST_UPDATED}</span>
              </p>
              <p className="mt-3 text-sm text-slate-600 max-w-2xl">
                This page explains how to delete your <strong>Scripta</strong> account, remove connected social media accounts, and revoke OAuth permissions from each platform. We are committed to making data deletion straightforward and transparent.
              </p>
            </div>
          </div>

          {/* Quick info cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Icon.Shield, label: 'Secure deletion', desc: 'Data permanently deleted after verification' },
              { icon: Icon.Clock, label: 'Within 30 days', desc: 'Processing completed within 30 days of request' },
              { icon: Icon.Mail, label: 'Contact us', desc: CONTACT_EMAIL },
            ].map(({ icon: Ic, label, desc }, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
                <Ic className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-8">

        {/* Sidebar TOC */}
        <aside className="lg:w-64 shrink-0">
          <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Quick Nav</p>
            <nav className="space-y-0.5" aria-label="Table of contents">
              {[
                ['#delete-account', 'Delete Your Account'],
                ['#disconnect-platforms', 'Disconnect Platforms'],
                ['#revoke-oauth', 'Revoke OAuth Permissions'],
                ['#what-gets-deleted', 'What Gets Deleted'],
                ['#contact-deletion', 'Contact Us'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0" />
                  {label}
                </a>
              ))}
            </nav>

            {/* Emergency contact */}
            <div className="mt-6 p-3 bg-rose-50 rounded-xl border border-rose-100">
              <p className="text-xs font-semibold text-rose-700 mb-1">Request Account Deletion</p>
              <a href={`mailto:${CONTACT_EMAIL}?subject=Account Deletion Request`} className="text-xs text-rose-600 hover:underline break-all">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 space-y-8" role="main">

          {/* Section 1: Delete Account */}
          <section id="delete-account" className="scroll-mt-24">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-rose-50 border-b border-rose-100 px-6 py-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <Icon.Trash className="w-5 h-5 text-rose-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">1. How to Delete Your Scripta Account</h2>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm text-slate-600 mb-6">
                  You can request deletion of your Scripta account using either of the following methods:
                </p>

                {/* Method A: In-app */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Method A — Via the App (Recommended)</p>
                  <div className="space-y-0">
                    <Step number="1" title="Sign in to Scripta">
                      Log in to your account at <Link to="/" className="text-indigo-600 hover:underline">Scripta.app</Link>.
                    </Step>
                    <Step number="2" title="Go to Settings">
                      Navigate to <strong>Settings</strong> from the sidebar or navigation menu.
                    </Step>
                    <Step number="3" title="Find the Account section">
                      Scroll to the <strong>Account & Security</strong> section within Settings.
                    </Step>
                    <Step number="4" title="Click 'Delete Account'">
                      Click the <strong>Delete Account</strong> button. You will be asked to confirm your decision.
                    </Step>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm shrink-0">
                          <Icon.CheckCircle className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="pb-2 flex-1">
                        <p className="text-sm text-slate-600">Your account and all associated data will be permanently deleted within <strong>30 days</strong> after verification.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Method B: Email */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Method B — Via Email Request</p>
                  <p className="text-sm text-slate-600 mb-3">
                    Send an email to <a href={`mailto:${CONTACT_EMAIL}?subject=Account Deletion Request`} className="text-indigo-600 font-medium hover:underline">{CONTACT_EMAIL}</a> with the subject line <strong>"Account Deletion Request"</strong>.
                  </p>
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Include in your email:</p>
                  <ul className="space-y-1.5">
                    {[
                      'Your registered email address',
                      'Full name on the account',
                      'Confirmation that you want to permanently delete your account and all data',
                      'Any specific connected accounts you want removed',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <Icon.CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <Icon.AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">
                      We will verify your identity before processing the deletion request. You may be asked to confirm ownership of the email address. Deletion is <strong>permanent and irreversible</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Disconnect Platforms */}
          <section id="disconnect-platforms" className="scroll-mt-24">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <Icon.Link className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">2. Disconnect Connected Social Media Accounts</h2>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm text-slate-600 mb-5">
                  You can disconnect any connected social media account from within Scripta at any time. Disconnecting removes Scripta's stored access token for that account and stops all scheduled publishing for it.
                </p>

                <div className="mb-5 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm font-semibold text-indigo-800 mb-2">In the Scripta App:</p>
                  <ol className="space-y-1.5">
                    {[
                      'Navigate to Accounts (Connected Accounts section in the sidebar)',
                      'Find the account you wish to disconnect',
                      'Click the disconnect / remove button next to the account',
                      'Confirm the disconnection in the dialog',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="text-sm text-slate-600 mb-4">
                  Disconnecting from within Scripta deletes our stored token. To also remove Scripta's permissions from the platform side, see the <a href="#revoke-oauth" className="text-indigo-600 hover:underline">Revoke OAuth Permissions</a> section below.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Revoke OAuth */}
          <section id="revoke-oauth" className="scroll-mt-24">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Icon.Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">3. Revoke OAuth Permissions from Each Platform</h2>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm text-slate-600 mb-4">
                  Even after disconnecting in Scripta, we recommend revoking Scripta's access directly from each platform's settings for full control. Click on each platform below for step-by-step instructions:
                </p>

                <div className="space-y-3">
                  <PlatformCard
                    name="Facebook & Instagram"
                    color={{
                      border: 'border-blue-200',
                      headerBg: 'bg-blue-50',
                      text: 'text-blue-700',
                    }}
                    icon="📘"
                    steps={[
                      'Go to Facebook.com and log in to your account',
                      'Click your profile picture → Settings & Privacy → Settings',
                      'Select "Apps and Websites" from the left sidebar',
                      'Find "Scripta" in the Active Apps list',
                      'Click "Remove" and confirm the removal',
                      'This also revokes Instagram access connected through that Facebook account',
                    ]}
                    url="https://www.facebook.com/settings?tab=applications"
                    urlLabel="Open Facebook Apps & Websites Settings"
                  />

                  <PlatformCard
                    name="Google (including YouTube)"
                    color={{
                      border: 'border-red-200',
                      headerBg: 'bg-red-50',
                      text: 'text-red-700',
                    }}
                    icon="🔴"
                    steps={[
                      'Go to myaccount.google.com and sign in',
                      'Click "Security" in the left navigation',
                      'Scroll to "Third-party apps & services" and click "Manage third-party access"',
                      'Find "Scripta" in the list of apps',
                      'Click on Scripta → "Remove Access"',
                      'This revokes both Google OAuth and YouTube Data API access',
                    ]}
                    url="https://myaccount.google.com/permissions"
                    urlLabel="Open Google Account Permissions"
                  />

                  <PlatformCard
                    name="LinkedIn"
                    color={{
                      border: 'border-sky-200',
                      headerBg: 'bg-sky-50',
                      text: 'text-sky-700',
                    }}
                    icon="💼"
                    steps={[
                      'Go to LinkedIn.com and sign in',
                      'Click your profile icon → Settings & Privacy',
                      'Select "Data Privacy" from the left menu',
                      'Click "Other Applications" → "Permitted Services"',
                      'Find Scripta in the list and click "Remove"',
                    ]}
                    url="https://www.linkedin.com/psettings/permitted-services"
                    urlLabel="Open LinkedIn Permitted Services"
                  />

                  <PlatformCard
                    name="YouTube (via Google)"
                    color={{
                      border: 'border-rose-200',
                      headerBg: 'bg-rose-50',
                      text: 'text-rose-700',
                    }}
                    icon="▶️"
                    steps={[
                      'YouTube permissions are managed through your Google Account',
                      'Go to myaccount.google.com/permissions',
                      'Find Scripta (listed under your Google account)',
                      'Click on it and select "Remove Access"',
                      'This will revoke all YouTube Data API access granted to Scripta',
                    ]}
                    url="https://myaccount.google.com/permissions"
                    urlLabel="Open Google Account Permissions"
                  />
                </div>

                <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs text-emerald-800">
                    <strong>Important:</strong> Revoking access on the platform side immediately invalidates Scripta's access token. Any pending scheduled posts for that platform will fail. We recommend disconnecting within Scripta first, then revoking from the platform for a clean process.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: What Gets Deleted */}
          <section id="what-gets-deleted" className="scroll-mt-24">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Icon.CheckCircle className="w-5 h-5 text-slate-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">4. What Gets Permanently Deleted</h2>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm text-slate-600 mb-4">
                  Upon successful account deletion, the following data is <strong>permanently and irreversibly deleted</strong> from Scripta's systems within 30 days:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {[
                    { title: 'Account Data', items: ['Email address', 'Name and profile picture', 'Hashed password (if applicable)', 'Account creation date and settings'] },
                    { title: 'OAuth Tokens', items: ['All stored access tokens', 'All stored refresh tokens', 'Platform user IDs and page IDs', 'Connected account metadata'] },
                    { title: 'Content Data', items: ['All scheduled posts and drafts', 'Published post records', 'Media files uploaded for posts', 'AI-generated content drafts'] },
                    { title: 'Analytics Data', items: ['All fetched analytics reports', 'Engagement metrics and insights', 'Follower growth data', 'Performance history'] },
                  ].map(({ title, items }, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{title}</p>
                      <ul className="space-y-1.5">
                        {items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-slate-600">
                            <Icon.CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <Icon.AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-1">Note on Retention for Legal Compliance</p>
                    <p>
                      We may retain anonymized server logs for up to 90 days after deletion for security and legal compliance purposes. These logs contain no personally identifiable information. Content already published to social media platforms <strong>is not deleted</strong> by Scripta — you must manage published posts directly within each social media platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Contact */}
          <section id="contact-deletion" className="scroll-mt-24">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <Icon.Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">5. Contact Us</h2>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm text-slate-600 mb-4">
                  For account deletion requests, questions about your data, or any privacy-related concerns, contact us:
                </p>

                <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                  <Icon.Mail className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Data Deletion & Privacy</p>
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=Account Deletion Request`}
                      className="text-indigo-700 font-semibold hover:underline text-sm"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  We will acknowledge your request within <strong>72 hours</strong> and complete the deletion within <strong>30 days</strong> following identity verification. For more information about how we handle your data, please read our{' '}
                  <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
                </p>

                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs text-emerald-800">
                    <strong>This page satisfies the data deletion requirements</strong> for Meta App Review (Facebook & Instagram), Google OAuth Verification, LinkedIn OAuth Review, and YouTube Data API compliance. The URL for this page (<code className="bg-emerald-100 px-1 rounded">https://Scripta.app/data-deletion</code>) can be used as the Data Deletion Callback URL or Data Deletion Instructions URL when required by platform review processes.
                  </p>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>

      <LegalFooter active="data-deletion" />
    </div>
  );
}
