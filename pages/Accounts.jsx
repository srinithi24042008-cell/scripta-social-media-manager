import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Settings, Link2, Unlink, Lock, Clock, Sparkles, AlertCircle,
  CheckCircle2, X, RefreshCw, ChevronDown, FileText, ChevronUp, Check, Info, Plus,
} from 'lucide-react';
import { api } from '../api';
import ConfirmButton from '../components/ConfirmButton';
import { useToast } from '../components/Toast';
import { useWorkspaceStore } from '../store/workspaceStore';


const fmtNum = (n) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n || 0);

// ── Platform definitions ──────────────────────────────────────────────────────
// comingSoon: false = fully active with OAuth connect flow
const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: 'from-violet-600 to-indigo-600',
    comingSoon: false,
    description: 'Connect your Instagram Business account via Meta OAuth. Schedule posts with images and videos.',
    credentialGroup: 'meta',
  },
  {
    id: 'facebook',
    name: 'Facebook Pages',
    icon: '🔵',
    color: 'from-blue-600 to-blue-800',
    comingSoon: false,
    description: 'Connect your Facebook Pages via Meta OAuth. Schedule posts with text, images, and videos.',
    credentialGroup: 'meta',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '🔴',
    color: 'from-red-500 to-red-700',
    comingSoon: false,
    description: 'Connect your YouTube channel via Google OAuth. Upload videos and YouTube Shorts from your Compose editor.',
    credentialGroup: 'youtube',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '👔',
    color: 'from-blue-500 to-indigo-600',
    comingSoon: false,
    description: 'Connect your LinkedIn account via OAuth. Share professional content.',
    credentialGroup: 'linkedin',
  },
];

// Credential groups — which platforms share one set of API credentials
const CREDENTIAL_GROUPS = {
  meta: {
    label: 'Meta (Instagram + Facebook)',
    platforms: ['instagram', 'facebook'],
    clientIdPlaceholder: 'Meta App ID',
    clientSecretPlaceholder: 'Meta App Secret',
    helpUrl: 'https://developers.facebook.com/apps/',
    instructions: 'Create a Meta App at developers.facebook.com. One set of credentials enables Instagram and Facebook Pages.',
  },
  youtube: {
    label: 'YouTube (Google)',
    platforms: ['youtube'],
    clientIdPlaceholder: 'Google OAuth 2.0 Client ID',
    clientSecretPlaceholder: 'Google OAuth 2.0 Client Secret',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    instructions: 'Create an OAuth 2.0 Client ID in Google Cloud Console. Enable YouTube Data API v3. Add callback: /api/accounts/oauth/callback/youtube',
  },
  linkedin: {
    label: 'LinkedIn',
    platforms: ['linkedin'],
    clientIdPlaceholder: 'LinkedIn App Client ID',
    clientSecretPlaceholder: 'LinkedIn App Client Secret',
    helpUrl: 'https://www.linkedin.com/developers/apps',
    instructions: 'Create a LinkedIn Developer App and add the r_liteprofile and w_member_social scopes.',
  },
};

// ── Diagnostic Item ───────────────────────────────────────────────────────────
function DiagnosticItem({ label, status, detail }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-slate-800/50 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">{label}</span>
        {status ? (
          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><Check size={14} /> PASS</span>
        ) : (
          <span className="flex items-center gap-1 text-rose-400 text-xs font-bold"><X size={14} /> FAIL</span>
        )}
      </div>
      <span className="text-xs text-slate-500 truncate">{detail}</span>
    </div>
  );
}

// ── Main Accounts Page ────────────────────────────────────────────────────────
export default function Accounts() {
  const { activeWorkspaceRole, activeWorkspaceId } = useWorkspaceStore();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState({});
  const [configDetails, setConfigDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [oauthBanner, setOauthBanner] = useState(null);
  const [ytChannelStats, setYtChannelStats] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([api.getAccounts(), api.getAccountsConfig(), api.getAccountsConfigDetails()])
      .then(([accountsData, configData, detailsData]) => {
        setAccounts(accountsData.accounts || []);
        setConfig(configData || {});
        setConfigDetails(detailsData || []);
        
        // Fetch YT stats if there's a connected YT account
        if (accountsData.accounts?.some(a => a.platform === 'youtube')) {
          api.getYtChannel().then(setYtChannelStats).catch(() => setYtChannelStats(null));
        }
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Handle OAuth redirect results stored in sessionStorage
    const error = sessionStorage.getItem('oauth_error');
    const connected = sessionStorage.getItem('oauth_connected');
    if (error) {
      setOauthBanner({ type: 'error', message: error });
      sessionStorage.removeItem('oauth_error');
    } else if (connected) {
      setOauthBanner({ type: 'success', message: 'Account connected successfully!' });
      sessionStorage.removeItem('oauth_connected');
    }

    // Also handle URL params (OAuth redirects back with ?tab=accounts&connected=true or &error=...)
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    const urlConnected = params.get('connected');
    if (urlError) {
      setOauthBanner({ type: 'error', message: decodeURIComponent(urlError) });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlConnected) {
      setOauthBanner({ type: 'success', message: 'Account connected successfully!' });
      window.history.replaceState({}, '', window.location.pathname);
    }

    refresh();
  }, []);

  async function connectPlatform(platformId) {
    const platformObj = PLATFORMS.find(p => p.id === platformId);
    if (!isPlatformConfigured(platformObj || { id: platformId })) {
      showToast('Please configure this platform in Settings → Social API Credentials first.', 'error');
      return;
    }

    try {
      const res = await api.getOAuthConnectUrl(platformId, activeWorkspaceId);
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err) {
      showToast(err.message || 'Failed to initiate platform connection.', 'error');
    }
  }

  async function disconnect(id) {
    try {
      await api.disconnectAccount(id);
      showToast('Account disconnected.', 'info');
      refresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Get accounts for a platform
  function getPlatformAccounts(platformId) {
    return accounts.filter(a => a.platform === platformId);
  }

  // Determine if a platform is configured (has credentials)
  function isPlatformConfigured(platform) {
    if (platform.credentialGroup === 'meta') {
      return !!(config.instagram || config.facebook || config.threads);
    }
    return !!config[platform.id];
  }

  const activePlatforms = PLATFORMS.filter(p => !p.comingSoon);
  const comingSoonPlatforms = PLATFORMS.filter(p => p.comingSoon);

  // Instagram diagnostic helpers
  const instagramAccount = accounts.find(a => a.platform === 'instagram');
  const instagramConfig = configDetails.find(d => d.platform === 'instagram');
  const isMetaConfigured = !!(instagramConfig || configDetails.find(d => ['facebook', 'threads'].includes(d.platform)));


  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center border border-violet-200">
            <Users size={24} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Accounts</h1>
            <p className="text-sm text-slate-500">Connect and manage your social profiles.</p>
          </div>
        </div>
        {activeWorkspaceRole === 'admin' && (
          <button onClick={() => navigate('/settings#social-credentials')} className="btn-secondary text-sm px-4">
            <Settings size={16} />
            <span>API Settings</span>
          </button>
        )}
      </div>

      {/* OAuth Result Banner */}
      <AnimatePresence>
        {oauthBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl px-5 py-4 border flex items-start gap-3 overflow-hidden mb-6 ${oauthBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
            {oauthBanner.type === 'error' ? <AlertCircle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {oauthBanner.type === 'error' ? 'OAuth Connection Failed' : 'Connection Successful'}
              </p>
              <p className="text-sm mt-0.5 opacity-90">{oauthBanner.message}</p>
            </div>
            <button onClick={() => setOauthBanner(null)} className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Active Platform Cards */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500 animate-pulse" /> Active Connections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePlatforms.map((platform) => {
              const platformAccounts = getPlatformAccounts(platform.id);
              const isConfigured = isPlatformConfigured(platform);

              return (
                <motion.div key={platform.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-6 bg-white border border-slate-100 hover:border-violet-200 shadow-soft-lg flex flex-col justify-between relative overflow-hidden transition-all duration-300">
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-violet-100/20 to-indigo-100/20 blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col gap-4 h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${platform.color} flex items-center justify-center text-2xl shadow-md text-white`}>
                            {platform.icon}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-800 leading-tight">{platform.name}</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Official OAuth</p>
                          </div>
                        </div>

                        {platformAccounts.length > 0 ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 tracking-wider">
                            ✓ Connected
                          </span>
                        ) : isConfigured ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 tracking-wider">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 tracking-wider">
                            Setup Needed
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        {platform.description}
                      </p>
                    </div>

                    {/* Connected Accounts */}
                    {platformAccounts.length > 0 ? (
                      <div className="space-y-4">
                        {platformAccounts.map((account) => {
                          const isExpired = account.status === 'expired' || account.status === 'reconnect_required';
                          const hasPublishingId = account.instagram_business_id || account.page_id;

                          return (
                            <div key={account._id} className="space-y-3 mt-2 first:mt-0">
                              <div className={`flex items-center gap-3 p-3 rounded-xl border ${isExpired ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'
                                }`}>
                                {account.avatar_url ? (
                                  <img src={account.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 ring-2 ring-slate-100" />
                                ) : (
                                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center font-bold text-white text-sm shrink-0`}>
                                    {account.handle?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{account.profile_name || account.handle}</p>
                                  <p className="text-[10px] text-slate-400 truncate">@{account.handle}</p>
                                  {isExpired && (
                                    <p className="text-[9px] text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                                      <AlertCircle size={10} /> Reconnect required
                                    </p>
                                  )}
                                  
                                  {/* YouTube Stats Block */}
                                  {platform.id === 'youtube' && ytChannelStats && ytChannelStats.id === account.page_id && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Subscribers</p>
                                        <p className="text-xs font-black text-slate-800">{fmtNum(ytChannelStats.subscribers_count)}</p>
                                      </div>
                                      <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Total Views</p>
                                        <p className="text-xs font-black text-slate-800">{fmtNum(ytChannelStats.total_views)}</p>
                                      </div>
                                      <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm col-span-2 flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Videos</span>
                                        <span className="text-xs font-black text-slate-800">{fmtNum(ytChannelStats.total_videos)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {activeWorkspaceRole === 'admin' && (
                                <div className="flex gap-2">
                                  {isExpired && (
                                    <button
                                      onClick={() => connectPlatform(platform.id)}
                                      className="text-xs text-amber-600 hover:text-amber-700 font-semibold py-2 px-3 rounded-xl border border-amber-200 hover:border-amber-300 bg-amber-50 transition-all flex items-center justify-center gap-1"
                                    >
                                      <RefreshCw size={12} /> Reconnect
                                    </button>
                                  )}
                                  <ConfirmButton onConfirm={() => disconnect(account._id)}
                                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold py-2 px-3 rounded-xl border border-rose-200 hover:border-rose-300 bg-white transition-all flex items-center justify-center gap-1"
                                    confirmLabel="Confirm?">
                                    <Unlink size={12} /> Disconnect
                                  </ConfirmButton>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      activeWorkspaceRole === 'admin' ? (
                        <div className="space-y-2 mt-4">
                          {isConfigured ? (
                            <button 
                              onClick={() => connectPlatform(platform.id)} 
                              className="w-full text-xs py-2.5 px-4 bg-violet-600 border border-violet-700 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                              <Sparkles size={14} className="animate-pulse" /> Connect {platform.name}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <button 
                                disabled
                                className="w-full text-xs py-2.5 px-4 bg-slate-100 border border-slate-200 text-slate-400 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                              >
                                <Lock size={12} /> Connect {platform.name}
                              </button>
                              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl">
                                <p className="text-[11px] text-amber-800 font-semibold leading-tight flex items-center gap-1.5">
                                  <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                  <span>Configure this platform in <button onClick={() => navigate('/settings#social-credentials')} className="underline hover:text-amber-900 font-bold">Settings → Social API Credentials</button> first.</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-slate-500 text-[10px] font-medium">
                          <Lock size={12} className="text-slate-400 shrink-0" />
                          <span>Only workspace administrators can connect accounts.</span>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>


      </div>
    </motion.div>
  );
}
