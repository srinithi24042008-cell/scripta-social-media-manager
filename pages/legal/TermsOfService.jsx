import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LegalFooter } from './PrivacyPolicy';

const CONTACT_EMAIL = 'yamunak972006@gmail.com';
const LAST_UPDATED = 'July 30, 2026';

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  FileText: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
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
  Sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
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
  XCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Globe: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Zap: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Scale: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  ),
};

// ── Section component ────────────────────────────────────────────────────────
function Section({ id, icon: IconComp, title, accent = 'indigo', children }) {
  const accentMap = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-200' },
  };
  const c = accentMap[accent];
  return (
    <section id={id} className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`${c.bg} ${c.border} border-b px-6 py-5 flex items-center gap-3`}>
          <div className={`w-9 h-9 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center shrink-0`}>
            <IconComp className={`w-5 h-5 ${c.icon}`} />
          </div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
        </div>
        <div className="px-6 py-6 prose prose-slate prose-sm max-w-none leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
}

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

// ── Section number badge ─────────────────────────────────────────────────────
function SNum({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">{n}</span>
  );
}

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Helmet>
        <title>Terms of Service — Scripta</title>
        <meta name="description" content="Scripta Terms of Service — read our terms covering account usage, OAuth authentication, content ownership, AI-generated content, and liability." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://sm.coptercode.co.in/terms" />
        <meta property="og:title" content="Terms of Service — Scripta" />
        <meta property="og:description" content="Terms and conditions for using Scripta, the AI-powered social media management platform." />
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
            <Link to="/data-deletion" className="hover:text-slate-800 transition-colors hidden sm:block">Data Deletion</Link>
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
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
              <Icon.FileText className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Terms of Service</h1>
              <p className="mt-1 text-sm text-slate-500">
                Last updated: <span className="font-medium text-slate-700">{LAST_UPDATED}</span>
              </p>
              <p className="mt-3 text-sm text-slate-600 max-w-2xl">
                Please read these Terms of Service carefully before using <strong>Scripta</strong>. By accessing or using the service, you agree to be bound by these terms.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-8">

        {/* Sidebar TOC */}
        <aside className="lg:w-64 shrink-0">
          <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Contents</p>
            <nav className="space-y-0.5" aria-label="Table of contents">
              <TocLink href="#acceptance">Acceptance of Terms</TocLink>
              <TocLink href="#responsibilities">User Responsibilities</TocLink>
              <TocLink href="#account-security">Account Security</TocLink>
              <TocLink href="#oauth">OAuth Authentication</TocLink>
              <TocLink href="#connected-accounts">Connected Social Accounts</TocLink>
              <TocLink href="#acceptable-use">Acceptable Use</TocLink>
              <TocLink href="#content-ownership">Content Ownership</TocLink>
              <TocLink href="#ai-content">AI-Generated Content</TocLink>
              <TocLink href="#availability">Service Availability</TocLink>
              <TocLink href="#intellectual-property">Intellectual Property</TocLink>
              <TocLink href="#liability">Limitation of Liability</TocLink>
              <TocLink href="#termination">Termination</TocLink>
              <TocLink href="#governing-law">Governing Law</TocLink>
              <TocLink href="#contact-terms">Contact Information</TocLink>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 space-y-6" role="main">

          {/* 1. Acceptance */}
          <Section id="acceptance" icon={Icon.CheckCircle} title="1. Acceptance of Terms" accent="indigo">
            <p className="text-sm text-slate-600">
              By creating an account, accessing, or using <strong>Scripta</strong> (the "Service"), you agree to comply with and be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not access or use the Service.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              These Terms apply to all users, including individuals, teams, and organisations. If you are using the Service on behalf of an organisation, you represent that you have the authority to bind that organisation to these Terms.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              We reserve the right to update these Terms at any time. Material changes will be communicated via email or an in-app notice. Continued use of the Service after any changes constitutes your acceptance of the new Terms.
            </p>
          </Section>

          {/* 2. User Responsibilities */}
          <Section id="responsibilities" icon={Icon.Users} title="2. User Responsibilities" accent="blue">
            <p className="text-sm text-slate-600 mb-2">As a user of Scripta, you agree to:</p>
            <CheckList items={[
              'Provide accurate, current, and complete information during registration and keep it up to date',
              'Use the Service only for lawful purposes and in compliance with all applicable laws and regulations',
              'Comply with the terms of service of each connected social media platform (Facebook, Instagram, LinkedIn, YouTube, Google)',
              'Not use the Service to publish content that is illegal, defamatory, harassing, abusive, obscene, or infringes on third-party rights',
              'Not attempt to circumvent, disable, or otherwise interfere with security-related features of the Service',
              'Be solely responsible for the content you publish through the Service',
              'Maintain the confidentiality of your account credentials',
              'Notify us immediately of any unauthorised use of your account at ' + CONTACT_EMAIL,
            ]} />
          </Section>

          {/* 3. Account Security */}
          <Section id="account-security" icon={Icon.Lock} title="3. Account Security" accent="violet">
            <p className="text-sm text-slate-600 mb-3">
              You are responsible for maintaining the security of your Scripta account. Specifically:
            </p>
            <CheckList items={[
              'Keep your password strong, unique, and confidential — do not share it with anyone',
              'Enable two-factor authentication if and when available',
              'Log out of your account after using shared or public devices',
              'Promptly notify Scripta of any suspected security breach or unauthorised account access',
              'You are liable for all activity that occurs under your account, whether or not authorised by you',
            ]} />
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Icon.AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Scripta will never ask for your social media passwords via email or any channel. If you receive such a request claiming to be from Scripta, it is fraudulent — please report it immediately.
              </p>
            </div>
          </Section>

          {/* 4. OAuth */}
          <Section id="oauth" icon={Icon.Shield} title="4. OAuth Authentication" accent="emerald">
            <p className="text-sm text-slate-600 mb-3">
              Scripta uses <strong>OAuth 2.0</strong> — the industry-standard secure authorisation protocol — to connect to social media platforms. By connecting a platform, you understand and agree that:
            </p>
            <CheckList items={[
              'Scripta never stores or receives your social media passwords under any circumstances',
              'You authorise Scripta to act on your behalf, within the permissions you explicitly grant during the OAuth flow',
              'OAuth access tokens are stored encrypted and are used solely to publish, read analytics, and manage content on your behalf',
              'You can revoke Scripta\'s access at any time from your social media platform\'s account settings — doing so will immediately stop all scheduled activity for that account',
              'Scripta is not responsible for changes to platform OAuth policies that affect service functionality',
            ]} />
          </Section>

          {/* 5. Connected Social Accounts */}
          <Section id="connected-accounts" icon={Icon.Globe} title="5. Connected Social Media Accounts" accent="cyan">
            <p className="text-sm text-slate-600 mb-3">
              When you connect a social media account to Scripta, you acknowledge the following:
            </p>
            <CheckList items={[
              'You must be the authorised owner or administrator of any account you connect',
              'You are responsible for ensuring your use of Scripta complies with the terms and policies of each respective platform',
              'Scripta cannot guarantee uninterrupted access to social media platforms — APIs may change, be deprecated, or become unavailable at any time',
              'You are responsible for reviewing and approving all content before scheduling; Scripta is a tool, not an autonomous publisher',
              'Scripta will not be liable for failed posts, API rate limit issues, or changes in platform publishing policies',
              'Connecting a Facebook Page also enables connection to the associated Instagram Business account, subject to Meta\'s platform policies',
            ]} />
          </Section>

          {/* 6. Acceptable Use */}
          <Section id="acceptable-use" icon={Icon.XCircle} title="6. Acceptable Use Policy" accent="rose">
            <p className="text-sm text-slate-600 mb-3">
              You must not use Scripta to:
            </p>
            <ul className="space-y-2 mt-3">
              {[
                'Publish spam, misleading content, phishing links, or malware',
                'Violate any applicable local, national, or international laws or regulations',
                'Infringe the intellectual property rights, privacy, or other rights of any third party',
                'Engage in any activity that violates the Community Standards or Terms of Service of Facebook, Instagram, LinkedIn, YouTube, or Google',
                'Use automated scripts or bots to abuse the Service beyond its intended use',
                'Attempt to gain unauthorised access to Scripta\'s systems, data, or infrastructure',
                'Conduct any form of load testing, vulnerability scanning, or penetration testing without prior written consent',
                'Resell, sublicense, or commercialise the Service without authorisation',
                'Publish content that promotes illegal activities, hate speech, or violence',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <Icon.XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              Violation of this Acceptable Use Policy may result in immediate suspension or termination of your account, without refund.
            </p>
          </Section>

          {/* 7. Content Ownership */}
          <Section id="content-ownership" icon={Icon.FileText} title="7. Content Ownership" accent="indigo">
            <p className="text-sm text-slate-600">
              <strong>You retain full ownership</strong> of all content you create, upload, draft, or publish through Scripta. Scripta does not claim any ownership rights over your content.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              By using the Service, you grant Scripta a limited, non-exclusive, royalty-free licence to store, process, and transmit your content solely for the purpose of providing the Service — specifically, to schedule and publish content on your behalf, and to display analytics.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              This licence is revoked immediately upon account deletion. You are solely responsible for ensuring that any content you publish does not violate third-party intellectual property rights, applicable laws, or platform community guidelines.
            </p>
          </Section>

          {/* 8. AI Content */}
          <Section id="ai-content" icon={Icon.Sparkles} title="8. AI-Generated Content Disclaimer" accent="amber">
            <p className="text-sm text-slate-600">
              Scripta's AI Studio feature uses <strong>Google Gemini AI</strong> to generate suggested captions, hashtags, post drafts, and other content.
            </p>
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-800 font-semibold mb-1">Important Disclaimer</p>
                <p className="text-xs text-amber-800">
                  AI-generated content is a <strong>suggestion only</strong>. You must review all AI-generated content before publishing. Scripta and its AI provider cannot guarantee the accuracy, completeness, legality, or appropriateness of AI-generated content.
                </p>
              </div>
            </div>
            <CheckList items={[
              'You are solely responsible for reviewing and approving all AI-generated content before publishing',
              'AI-generated content may occasionally contain factual inaccuracies, biased language, or inappropriate suggestions',
              'Scripta disclaims all liability for consequences arising from publishing unreviewed AI-generated content',
              'Your prompts may be processed by Google Gemini AI — do not include sensitive personal data in AI prompts',
              'AI-generated content does not constitute professional, legal, medical, or financial advice',
            ]} />
          </Section>

          {/* 9. Service Availability */}
          <Section id="availability" icon={Icon.Zap} title="9. Service Availability" accent="slate">
            <p className="text-sm text-slate-600 mb-3">
              Scripta strives to maintain high availability but does not guarantee uninterrupted service. You acknowledge that:
            </p>
            <CheckList items={[
              'The Service may be temporarily unavailable due to scheduled maintenance, updates, or unforeseen technical issues',
              'Scripta is not liable for any losses caused by service downtime or unavailability',
              'Scheduled posts may fail to publish due to social media API outages, rate limits, or changes in platform policies',
              'We will make reasonable efforts to notify users of planned downtime in advance',
              'Features and functionality may change, be updated, or be discontinued at any time with reasonable notice',
            ]} />
          </Section>

          {/* 10. Intellectual Property */}
          <Section id="intellectual-property" icon={Icon.Shield} title="10. Intellectual Property" accent="violet">
            <p className="text-sm text-slate-600">
              The Scripta name, logo, product design, user interface, features, and all associated software are the exclusive intellectual property of Scripta and are protected by applicable copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              You may not reproduce, distribute, modify, create derivative works of, or commercially exploit any part of the Service without express written permission from Scripta.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              Feedback, suggestions, or ideas you submit to us may be used to improve the Service without any obligation to compensate you.
            </p>
          </Section>

          {/* 11. Limitation of Liability */}
          <Section id="liability" icon={Icon.Scale} title="11. Limitation of Liability" accent="rose">
            <p className="text-sm text-slate-600 mb-3">
              To the fullest extent permitted by applicable law:
            </p>
            <CheckList items={[
              'Scripta is provided "as is" and "as available" without warranties of any kind, express or implied',
              'Scripta disclaims all implied warranties of merchantability, fitness for a particular purpose, and non-infringement',
              'Scripta shall not be liable for any indirect, incidental, special, consequential, or punitive damages',
              'Our total aggregate liability to you for any claims arising from the use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim',
              'We are not responsible for the actions or policies of third-party platforms (Facebook, Instagram, LinkedIn, YouTube, Google)',
              'We are not liable for any content published by users through the Service',
            ]} />
          </Section>

          {/* 12. Termination */}
          <Section id="termination" icon={Icon.XCircle} title="12. Termination" accent="rose">
            <p className="text-sm text-slate-600 mb-3">
              <strong>By You:</strong> You may terminate your account at any time from the account settings page or by contacting us. Upon termination, your data will be permanently deleted in accordance with our <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> and <Link to="/data-deletion" className="text-indigo-600 hover:underline">Data Deletion Policy</Link>.
            </p>
            <p className="text-sm text-slate-600 mb-3">
              <strong>By Scripta:</strong> We reserve the right to suspend or terminate your account, with or without notice, if you:
            </p>
            <CheckList items={[
              'Violate these Terms of Service or our Acceptable Use Policy',
              'Engage in fraudulent, abusive, or illegal activity',
              'Repeatedly violate the terms of connected social media platforms',
              'Fail to pay any applicable fees (if a paid plan is introduced)',
            ]} />
            <p className="text-sm text-slate-600 mt-3">
              Upon termination for cause, Scripta may retain logs for legal, compliance, or dispute resolution purposes for a limited period.
            </p>
          </Section>

          {/* 13. Governing Law */}
          <Section id="governing-law" icon={Icon.Scale} title="13. Governing Law" accent="slate">
            <p className="text-sm text-slate-600">
              These Terms shall be governed by and construed in accordance with the laws of <strong>India</strong>, without regard to its conflict of law provisions.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              Any disputes arising out of or relating to these Terms or the use of the Service shall be subject to the exclusive jurisdiction of the courts located in India.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will continue to be valid and enforceable.
            </p>
          </Section>

          {/* 14. Contact */}
          <Section id="contact-terms" icon={Icon.Mail} title="14. Contact Information" accent="indigo">
            <p className="text-sm text-slate-600 mb-4">
              If you have any questions, concerns, or requests related to these Terms of Service, please contact us:
            </p>
            <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Icon.Mail className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Legal & Support Email</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-700 font-semibold hover:underline text-sm">{CONTACT_EMAIL}</a>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              For privacy-specific requests, please visit our{' '}
              <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> page. For account deletion requests, visit our{' '}
              <Link to="/data-deletion" className="text-indigo-600 hover:underline">Data Deletion</Link> page.
            </p>
          </Section>

        </main>
      </div>

      <LegalFooter active="terms" />
    </div>
  );
}
