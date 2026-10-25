import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Key,
  Bell,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';



export default function Settings({ onUserUpdate }) {
  const showToast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Social API Credentials
  const [configDetails, setConfigDetails] = useState([]);
  const [platformInputs, setPlatformInputs] = useState({});
  const [savingConfigFor, setSavingConfigFor] = useState(null);
  const [testingConfigFor, setTestingConfigFor] = useState(null);

  const PLATFORMS = [
    { id: 'instagram', name: 'Instagram Business', icon: '📸', color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'facebook', name: 'Facebook Page', icon: '📘', color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'text-red-600', bg: 'bg-red-50' },
  ];



  function loadAll() {
    setLoading(true);
    Promise.all([
      api.me(),
      api.getAccountsConfigDetails(),
    ])
      .then(([meData, detailsData]) => {
        const u = meData.user;
        setUser(u);
        setProfileName(u.name || '');
        setProfileEmail(u.email || '');

        setConfigDetails(detailsData || []);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    if (window.location.hash === '#social-credentials') {
      setTimeout(() => {
        const el = document.getElementById('social-credentials');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          const targetInput = document.querySelector('[placeholder*="Meta App ID"]');
          if (targetInput) targetInput.focus();
        }
      }, 500);
    }
  }, []);

  // ── Profile ──────────────────────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Name is required.', 'error');
      return;
    }
    if (!profileEmail.includes('@') || !profileEmail.includes('.')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const data = await api.updateProfile({ name: profileName.trim(), email: profileEmail.trim() });
      setUser((u) => ({ ...u, ...data.user }));
      if (onUserUpdate) onUserUpdate(data.user);
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Password ─────────────────────────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      showToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  // ── Social API Credentials ───────────────────────────────────────────
  function handlePlatformInputChange(platform, field, value) {
    setPlatformInputs((cur) => ({
      ...cur,
      [platform]: { ...cur[platform], [field]: value }
    }));
  }

  async function handleSavePlatformConfig(e, platform) {
    e.preventDefault();
    const creds = platformInputs[platform] || {};
    if (!creds.id?.trim() || !creds.secret?.trim()) {
      showToast('Client ID and Client Secret are required.', 'error');
      return;
    }
    setSavingConfigFor(platform);
    try {
      await api.saveAccountsConfig(
        platform, 
        creds.id.trim(), 
        creds.secret.trim(), 
        creds.meta_app_id?.trim() || '', 
        creds.app_id?.trim() || ''
      );
      showToast(`${platform} API credentials saved.`, 'success');
      setPlatformInputs(cur => ({ ...cur, [platform]: { id: '', secret: '', meta_app_id: '', app_id: '' } }));
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingConfigFor(null);
    }
  }

  async function handleDeletePlatformConfig(platform) {
    try {
      await api.deleteAccountsConfig(platform);
      showToast(`${platform} API credentials removed.`, 'info');
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleTestPlatformConfig(platform) {
    const creds = platformInputs[platform] || {};
    setTestingConfigFor(platform);
    try {
      const res = await api.testAccountsConfig(
        platform,
        creds.id?.trim() || creds.meta_app_id?.trim() || creds.app_id?.trim() || '',
        creds.secret?.trim() || '••••••••',
        creds.meta_app_id?.trim() || '',
        creds.app_id?.trim() || ''
      );
      if (res.success) {
        showToast(res.message || `${platform} configuration test successful!`, 'success');
      } else {
        showToast(res.error || `${platform} configuration test failed.`, 'error');
      }
    } catch (err) {
      showToast(err.message || 'Configuration test failed.', 'error');
    } finally {
      setTestingConfigFor(null);
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={28} className="text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="min-h-screen bg-slate-50 -m-6 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account, API credentials, and preferences.</p>
      </div>

      <div className="space-y-5 max-w-3xl">
        {/* ── Profile ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-md bg-indigo-50 flex items-center justify-center">
              <User size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Profile</h2>
              <p className="text-xs text-slate-400">Update your name and email address.</p>
            </div>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name" className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email Address</label>
                <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="your@email.com" className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all" />
              </div>
            </div>
            <button type="submit" disabled={savingProfile}
              className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors">
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* ── Password ─────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
              <Lock size={18} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Password</h2>
              <p className="text-xs text-slate-400">Change your account password.</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Current Password</label>
              <input type={showPasswords ? 'text' : 'password'} value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password" className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password</label>
                <input type={showPasswords ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters" className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm New Password</label>
                <input type={showPasswords ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password" className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={savingPassword}
                className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors">
                {savingPassword ? 'Updating…' : 'Change Password'}
              </button>
              <button type="button" onClick={() => setShowPasswords(!showPasswords)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1.5 transition-colors">
                {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPasswords ? 'Hide' : 'Show'} passwords
              </button>
            </div>
          </form>
        </div>

        {/* ── Social API Credentials ────────────────────────── */}
        <div id="social-credentials" className="bg-white rounded-lg border border-slate-100 shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
              <Key size={18} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Social API Credentials</h2>
              <p className="text-xs text-slate-400">Store developer application credentials for each social platform. Accounts will automatically use these to perform OAuth.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Facebook Card */}
            {(() => {
              const savedConfig = configDetails.find(d => d.platform === 'facebook');
              const inputs = platformInputs['facebook'] || { id: '', secret: '', meta_app_id: '', app_id: '' };
              const isSaving = savingConfigFor === 'facebook';
              const isTesting = testingConfigFor === 'facebook';
              const isConfigured = !!savedConfig?.client_id;

              return (
                <div key="facebook" className="border border-slate-150 rounded-lg p-6 bg-slate-50/30 flex flex-col justify-between shadow-sm hover:border-indigo-200 transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-base shadow-sm">📘</div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Facebook</h3>
                          <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-[#4338CA] font-semibold inline-flex items-center gap-1 mt-0.5">
                            Developer Console ↗
                          </a>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {isConfigured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>

                    <form onSubmit={(e) => handleSavePlatformConfig(e, 'facebook')} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Meta App ID</label>
                        <input
                          type="text"
                          value={inputs.id || inputs.meta_app_id || ''}
                          onChange={(e) => {
                            handlePlatformInputChange('facebook', 'id', e.target.value);
                            handlePlatformInputChange('facebook', 'meta_app_id', e.target.value);
                          }}
                          autoComplete="off"
                          placeholder={savedConfig?.client_id ? `Saved: ${savedConfig.client_id}` : "Enter Meta App ID"}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Meta App Secret</label>
                        <input
                          type="password"
                          value={inputs.secret || ''}
                          onChange={(e) => handlePlatformInputChange('facebook', 'secret', e.target.value)}
                          autoComplete="new-password"
                          placeholder={savedConfig?.client_secret ? "•••••••• (Saved)" : "Enter Meta App Secret"}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all font-mono"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white text-xs font-bold rounded-md transition-all shadow-sm cursor-pointer border-none"
                        >
                          {isSaving ? 'Saving…' : 'Save Credentials'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestPlatformConfig('facebook')}
                          disabled={isTesting}
                          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-md transition-all cursor-pointer"
                        >
                          {isTesting ? 'Testing…' : 'Test Configuration'}
                        </button>
                        {isConfigured && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlatformConfig('facebook')}
                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-xs font-bold rounded-md transition-all ml-auto cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              );
            })()}

            {/* 2. Instagram Business Card */}
            {(() => {
              const savedMeta = configDetails.find(d => ['facebook', 'instagram'].includes(d.platform));
              const isConfigured = !!savedMeta?.client_id;

              return (
                <div key="instagram" className="border border-slate-150 rounded-lg p-6 bg-slate-50/30 flex flex-col justify-between shadow-sm hover:border-indigo-200 transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center text-base shadow-sm">📸</div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Instagram Business</h3>
                          <span className="text-xs text-slate-400 block mt-0.5 font-medium">Graph API via Meta</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {isConfigured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>

                    <div className="bg-white border border-slate-150 rounded-lg p-4 my-4 space-y-3">
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Instagram uses the same Meta App as Facebook. Do NOT ask for another Client ID or Client Secret.
                      </p>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-150 font-mono text-xs text-slate-700">
                        <span>Uses Facebook (Meta) App</span>
                        <span className="font-bold text-indigo-600">{isConfigured ? 'Active' : 'Missing'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 font-semibold">
                      Status: <strong className={isConfigured ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>{isConfigured ? 'Configured' : 'Not Configured'}</strong>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 italic font-semibold">
                      Only allow Instagram connection if the Meta credentials are configured.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 3. LinkedIn Card */}
            {(() => {
              const savedConfig = configDetails.find(d => d.platform === 'linkedin');
              const inputs = platformInputs['linkedin'] || { id: '', secret: '' };
              const isSaving = savingConfigFor === 'linkedin';
              const isTesting = testingConfigFor === 'linkedin';
              const isConfigured = !!savedConfig?.client_id;

              return (
                <div key="linkedin" className="border border-slate-150 rounded-lg p-6 bg-slate-50/30 flex flex-col justify-between shadow-sm hover:border-indigo-200 transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center text-base shadow-sm">💼</div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">LinkedIn</h3>
                          <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-[#4338CA] font-semibold inline-flex items-center gap-1 mt-0.5">
                            Developer Console ↗
                          </a>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {isConfigured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>

                    <form onSubmit={(e) => handleSavePlatformConfig(e, 'linkedin')} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client ID</label>
                        <input
                          type="text"
                          value={inputs.id || ''}
                          onChange={(e) => handlePlatformInputChange('linkedin', 'id', e.target.value)}
                          autoComplete="off"
                          placeholder={savedConfig?.client_id ? `Saved: ${savedConfig.client_id}` : "Enter Client ID"}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client Secret</label>
                        <input
                          type="password"
                          value={inputs.secret || ''}
                          onChange={(e) => handlePlatformInputChange('linkedin', 'secret', e.target.value)}
                          autoComplete="new-password"
                          placeholder={savedConfig?.client_secret ? "•••••••• (Saved)" : "Enter Client Secret"}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all font-mono"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white text-xs font-bold rounded-md transition-all shadow-sm cursor-pointer border-none"
                        >
                          {isSaving ? 'Saving…' : 'Save Credentials'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestPlatformConfig('linkedin')}
                          disabled={isTesting}
                          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-md transition-all cursor-pointer"
                        >
                          {isTesting ? 'Testing…' : 'Test Configuration'}
                        </button>
                        {isConfigured && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlatformConfig('linkedin')}
                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-xs font-bold rounded-md transition-all ml-auto cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              );
            })()}

            {/* 4. YouTube Card */}
            {(() => {
              const savedConfig = configDetails.find(d => d.platform === 'youtube');
              const inputs = platformInputs['youtube'] || { id: '', secret: '' };
              const isSaving = savingConfigFor === 'youtube';
              const isTesting = testingConfigFor === 'youtube';
              const isConfigured = !!savedConfig?.client_id;

              return (
                <div key="youtube" className="border border-slate-150 rounded-lg p-6 bg-slate-50/30 flex flex-col justify-between shadow-sm hover:border-indigo-200 transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-red-50 border border-red-100 text-red-600 flex items-center justify-center text-base shadow-sm">▶️</div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">YouTube</h3>
                          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-[#4338CA] font-semibold inline-flex items-center gap-1 mt-0.5">
                            Developer Console ↗
                          </a>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {isConfigured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>

                    <form onSubmit={(e) => handleSavePlatformConfig(e, 'youtube')} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client ID</label>
                        <input
                          type="text"
                          value={inputs.id || ''}
                          onChange={(e) => handlePlatformInputChange('youtube', 'id', e.target.value)}
                          autoComplete="off"
                          placeholder={savedConfig?.client_id ? `Saved: ${savedConfig.client_id}` : "Enter Client ID"}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client Secret</label>
                        <input
                          type="password"
                          value={inputs.secret || ''}
                          onChange={(e) => handlePlatformInputChange('youtube', 'secret', e.target.value)}
                          autoComplete="new-password"
                          placeholder={savedConfig?.client_secret ? "•••••••• (Saved)" : "Enter Client Secret"}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all font-mono"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white text-xs font-bold rounded-md transition-all shadow-sm cursor-pointer border-none"
                        >
                          {isSaving ? 'Saving…' : 'Save Credentials'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestPlatformConfig('youtube')}
                          disabled={isTesting}
                          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-md transition-all cursor-pointer"
                        >
                          {isTesting ? 'Testing…' : 'Test Configuration'}
                        </button>
                        {isConfigured && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlatformConfig('youtube')}
                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-xs font-bold rounded-md transition-all ml-auto cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>


      </div>
    </motion.div>
  );
}
