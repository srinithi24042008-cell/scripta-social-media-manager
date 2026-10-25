import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Sidebar from './Sidebar';
import { Bell, Plus, X, Menu, Building2, ChevronDown, Check, Loader2, Key, Copy } from 'lucide-react';
import { api } from '../api';
import useSocket from '../hooks/useSocket';
import { useToast } from './Toast';
import { showDesktopNotification } from '../utils/desktopNotification';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useWorkspaceStore } from '../store/workspaceStore';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  compose: 'Compose',
  calendar: 'Calendar',
  drafts: 'Drafts',
  'ai-studio': 'AI Studio',
  brand: 'Brand Voice',
  accounts: 'Accounts',
  'team-hub': 'Team Hub',
  analytics: 'Analytics',
  notifications: 'Notifications',
  settings: 'Settings',
};

const PAGE_DESCRIPTIONS = {
  dashboard: 'Your social media overview and performance metrics at a glance.',
  compose: 'Create, edit, and schedule your social media posts.',
  calendar: 'Visual calendar view of your scheduled content.',
  drafts: 'Manage your personal and team drafts.',
  'ai-studio': 'Generate AI-powered content, captions, and hashtags.',
  brand: 'Define your brand voice and tone for AI generation.',
  accounts: 'Connect and manage your social media accounts.',
  'team-hub': 'Collaborate with your team in real-time on shared content.',
  analytics: 'Deep dive into your platform-specific metrics and data.',
  notifications: 'View and manage your notifications.',
  settings: 'Configure your account and application settings.',
};

const BASE_TITLE = 'Scripta — AI Social Media Management';
const BASE_DESC  = 'AI-powered social media management platform for scheduling, analytics, and team collaboration.';

export default function Layout({ onLogout, children, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, fetchWorkspaces } = useWorkspaceStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || { name: 'Personal Workspace', id: 'personal', role: 'admin' };

  // Manage Workspaces Modal state
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState('list');
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const showToast = useToast();

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setManageLoading(true);
    try {
      const res = await api.createOrg(createName.trim());
      showToast(`Workspace "${res.organization.name}" created!`, 'success');
      setCreateName('');
      await fetchWorkspaces();
      setActiveWorkspaceId(res.organization._id);
      setManageTab('list');
    } catch (err) {
      showToast(err.message || 'Failed to create workspace', 'error');
    } finally {
      setManageLoading(false);
    }
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setManageLoading(true);
    try {
      const res = await api.joinOrg(joinCode.trim());
      showToast(`Joined "${res.organization.name}" successfully!`, 'success');
      setJoinCode('');
      await fetchWorkspaces();
      setActiveWorkspaceId(res.organization._id);
      setManageTab('list');
    } catch (err) {
      showToast(err.message || 'Invalid invite code', 'error');
    } finally {
      setManageLoading(false);
    }
  };

  const handleCopyInvite = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast('Invite code copied!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { socket } = useSocket();

  const [userId] = useState(() => {
    try {
      const token = localStorage.getItem('scripta_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch { /* empty — silently ignore invalid token decode */ }

    return '';
  });

  const fetchUnread = useCallback(() => {
    api.getUnreadCount()
      .then((d) => setUnreadCount(d.unreadCount))
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = () => setUnreadCount((cur) => cur + 1);
    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

  return (
    <div className="min-h-screen bg-background flex text-slate-800 font-sans overflow-hidden">
      <Helmet>
        <title>{PAGE_TITLES[activeTab] ? `${PAGE_TITLES[activeTab]} — Scripta` : BASE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTIONS[activeTab] || BASE_DESC} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://sm.coptercode.co.in${location.pathname}`} />
      </Helmet>

      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />

      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <div
        className={`${isMobile
          ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'relative z-0'
        }`}
      >
        <Sidebar
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isMobile={isMobile}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-hidden">
        <header role="banner" className="h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-6 shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl shrink-0"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 hidden sm:block truncate">
                {PAGE_TITLES[activeTab] || 'Dashboard'}
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block truncate">
                {PAGE_DESCRIPTIONS[activeTab] || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Workspace Switcher */}
            <div className="relative mr-1" ref={switcherRef}>
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                aria-label={`Current workspace: ${activeWorkspace?.name || 'Personal'}. Click to switch.`}
                aria-expanded={switcherOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-sm"
              >
                <Building2 size={14} className="text-indigo-500 shrink-0" />
                <span className="max-w-[60px] sm:max-w-[100px] truncate hidden xs:inline">{activeWorkspace?.name || 'Personal'}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>

              <AnimatePresence>
                {switcherOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-100 shadow-xl py-2 z-50 text-slate-700"
                  >
                    <div className="px-4 py-2 border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Workspace
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {workspaces.map(ws => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            setActiveWorkspaceId(ws.id);
                            setSwitcherOpen(false);
                            navigate('/dashboard');
                            showToast(`Switched to ${ws.name}`, 'success');
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left hover:bg-indigo-50/50 hover:text-indigo-600 transition-all ${
                            activeWorkspaceId === ws.id ? 'bg-indigo-50 text-indigo-600 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 size={12} className={activeWorkspaceId === ws.id ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className="truncate">{ws.name}</span>
                          </div>
                          {activeWorkspaceId === ws.id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-50 pt-2 px-2">
                      <button
                        onClick={() => {
                          setSwitcherOpen(false);
                          setManageTab('list');
                          fetchWorkspaces();
                          setManageOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-xs transition-all"
                      >
                        <Plus size={14} />
                        <span>Manage Workspaces</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/notifications')}
              aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : 'Notifications'}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all relative shrink-0"
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-600 text-white text-[8px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <button
              onClick={() => navigate('/settings')}
              aria-label="Account settings"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-violet-600 hover:shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              {userInitial}
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-6 lg:p-8 w-full ${activeTab === 'ai-studio' ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Manage Workspaces Modal ───────────────────────────── */}
      <AnimatePresence>
        {manageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setManageOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="manage-workspaces-title"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Building2 size={18} className="text-indigo-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="manage-workspaces-title" className="text-sm font-bold text-slate-900">Manage Workspaces</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Create, join, or switch workspaces</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManageOpen(false)}
                  aria-label="Close manage workspaces modal"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-slate-100 px-6 gap-1 pt-2">
                {[
                  { id: 'list', label: 'My Workspaces' },
                  { id: 'create', label: 'Create New' },
                  { id: 'join', label: 'Join with Code' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setManageTab(tab.id)}
                    className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                      manageTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">

                {/* LIST TAB */}
                {manageTab === 'list' && (
                  <div className="space-y-3">
                    {workspaces.length === 0 ? (
                      <div className="py-10 text-center">
                        <Building2 size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-400">No workspaces yet</p>
                        <p className="text-xs text-slate-400 mt-1">Create one or join with an invite code.</p>
                      </div>
                    ) : (
                      workspaces.map(ws => (
                        <div
                          key={ws.id}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            activeWorkspaceId === ws.id
                              ? 'bg-indigo-50 border-indigo-200'
                              : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeWorkspaceId === ws.id ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                              <Building2 size={16} />
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${activeWorkspaceId === ws.id ? 'text-indigo-700' : 'text-slate-800'}`}>{ws.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium capitalize">{ws.role || 'member'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ws.inviteCode && (
                              <button
                                onClick={() => handleCopyInvite(ws.inviteCode)}
                                title="Copy invite code"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                              >
                                {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              </button>
                            )}
                            {activeWorkspaceId !== ws.id ? (
                              <button
                                onClick={() => {
                                  setActiveWorkspaceId(ws.id);
                                  navigate('/dashboard');
                                  showToast(`Switched to ${ws.name}`, 'success');
                                  setManageOpen(false);
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 text-xs font-bold rounded-xl transition-all"
                              >
                                Switch
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1">
                                <Check size={11} /> Active
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setManageTab('create')}
                        className="flex-1 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Create New
                      </button>
                      <button
                        onClick={() => setManageTab('join')}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Key size={14} /> Join with Code
                      </button>
                    </div>
                  </div>
                )}

                {/* CREATE TAB */}
                {manageTab === 'create' && (
                  <form onSubmit={handleCreateWorkspace} className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                          <Plus size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Create a Team Workspace</p>
                          <p className="text-[11px] text-slate-500">Invite colleagues with a unique code after creation</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Workspace Name</label>
                      <input
                        required
                        type="text"
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        placeholder="e.g. Acme Marketing Team"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 font-medium transition-all"
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => setManageTab('list')} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all">
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={manageLoading || !createName.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {manageLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Create Workspace
                      </button>
                    </div>
                  </form>
                )}

                {/* JOIN TAB */}
                {manageTab === 'join' && (
                  <form onSubmit={handleJoinWorkspace} className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                          <Key size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Join a Workspace</p>
                          <p className="text-[11px] text-slate-500">Enter the invite code shared by your admin</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Invite Code</label>
                      <input
                        required
                        type="text"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        placeholder="Paste your invite code here..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 text-slate-800 font-medium transition-all font-mono tracking-wider"
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => setManageTab('list')} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all">
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={manageLoading || !joinCode.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {manageLoading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                        Join Workspace
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
