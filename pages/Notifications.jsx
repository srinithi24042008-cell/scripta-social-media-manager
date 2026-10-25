import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, Trash2, AlertCircle, CheckCircle2,
  Info, RefreshCw, Inbox, X, AlertTriangle, Search, User,
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import ConfirmButton from '../components/ConfirmButton';
import useSocket from '../hooks/useSocket';
import { PLATFORM_HEX } from '../platformStyles';

// ---------- Helpers ----------
function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timeAgoShort(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ---------- Config ----------
const FILTER_TABS = [
  { value: 'all',     label: 'All',     icon: Bell },
  { value: 'unread',  label: 'Unread',  icon: Info },
  { value: 'success', label: 'Success', icon: CheckCircle2 },
  { value: 'warning', label: 'Warning', icon: AlertTriangle },
  { value: 'error',   label: 'Error',   icon: AlertCircle },
  { value: 'info',    label: 'Info',    icon: Info },
];

const TYPE_CONFIG = {
  success: {
    Icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'SUCCESS',
    dot: 'bg-emerald-500',
  },
  error: {
    Icon: AlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
    label: 'ERROR',
    dot: 'bg-red-500',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'WARNING',
    dot: 'bg-amber-500',
  },
  info: {
    Icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    label: 'INFO',
    dot: 'bg-blue-500',
  },
};

function getConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.info;
}

// Parse platform, account, method, status out of notification metadata/message
function parseDetails(notif) {
  const meta = notif.metadata || {};
  const details = [];

  if (meta.platform || notif.platform) {
    const platform = meta.platform || notif.platform;
    details.push({ label: 'Platform', value: platform.charAt(0).toUpperCase() + platform.slice(1), platform });
  }
  if (meta.account || notif.account || meta.handle) {
    details.push({ label: 'Account', value: `@${meta.account || meta.handle || notif.account || 'user'}` });
  }
  if (meta.method) {
    details.push({ label: 'Method', value: meta.method });
  }
  if (notif.created_at) {
    details.push({ label: 'Connected on', value: formatFullDate(notif.created_at) });
  }
  if (meta.status || notif.status) {
    details.push({ label: 'Status', value: meta.status || notif.status || 'Connected', isStatus: true });
  }
  return details;
}

function formatCleanNotificationText(notif) {
  if (!notif || notif.type !== 'error' || !notif.message) return notif?.message || '';
  let text = notif.message;
  let platform = '';

  const match = text.match(/^Publishing to ([a-zA-Z0-9_-]+)(?:\s*\([^)]+\))?\s*failed(?: permanently)?:\s*(.*)/i);
  if (match) {
    platform = match[1];
    text = match[2];
  } else {
    const match2 = text.match(/^([a-zA-Z0-9_-]+) error:\s*(.*)/i);
    if (match2 && ['instagram', 'facebook', 'linkedin', 'youtube'].includes(match2[1].toLowerCase())) {
      platform = match2[1];
      text = match2[2];
    }
  }

  text = text.replace(/^(Publishing to [a-zA-Z0-9_-]+(?: \([^)]+\))? failed(?: permanently)?: )/i, '');
  text = text.replace(/^(Instagram|Facebook|LinkedIn|YouTube) error:\s*/i, '');
  text = text.replace(/^API error:\s*/i, '');
  text = text.replace(/\s*\(code:\s*\d+\)/i, '');

  if (text.toLowerCase().includes('aspect ratio') || text.includes('36003')) {
    text = 'Incorrect aspect ratio';
  } else if (text.toLowerCase().includes('oauth') || text.toLowerCase().includes('token expired') || text.includes('190')) {
    text = 'Reconnect required';
  }

  const platformLabel = platform ? (platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()) : '';
  if (platformLabel && !text.toLowerCase().endsWith(`with ${platformLabel.toLowerCase()}`)) {
    return text.startsWith('Failed:') ? text : `Failed: ${text} with ${platformLabel}`;
  } else if (!text.startsWith('Failed:') && (match || platformLabel)) {
    return `Failed: ${text}`;
  }
  return text;
}

// ---------- Detail Panel Component ----------
function NotificationDetailPanel({ notif, onClose, onDelete, onMarkRead }) {
  if (!notif) return null;
  const cfg = getConfig(notif.type);
  const Icon = cfg.Icon;
  const details = parseDetails(notif);
  const displayMsg = formatCleanNotificationText(notif);

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full"
    >
        {/* Detail Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center`}>
              <Icon size={20} className={cfg.iconColor} />
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.iconColor}`}>{cfg.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!notif.read && (
              <button onClick={() => onMarkRead(notif._id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                title="Mark as read">
                <CheckCheck size={15} />
              </button>
            )}
            <button onClick={() => onDelete(notif._id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug mb-2 break-words">{notif.title || displayMsg}</h2>
            <p className="text-[12px] text-slate-400 font-medium">
              {timeAgo(notif.created_at)} &bull; {formatFullDate(notif.created_at)}
            </p>
          </div>

          {/* Message block */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message</p>
            <p className="text-sm text-slate-700 leading-relaxed break-words">{displayMsg}</p>
          </div>

          {/* Details */}
          {details.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Details</p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white">
                    <span className="text-sm text-slate-500">{d.label}</span>
                    {d.isStatus ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{d.value}</span>
                    ) : d.platform ? (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PLATFORM_HEX[d.platform] || '#6366f1' }} />
                        {d.value}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-slate-800">{d.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const showToast = useToast();
  const { socket } = useSocket();

  function loadNotifications() {
    setLoading(true);
    api.getNotifications('')
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => { /* silently fail — backend may be offline */ })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadNotifications(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = (notif) => {
      // Add to list
      setNotifications((cur) => [notif, ...cur]);
    };
    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

  async function handleMarkAllRead() {
    try {
      await api.markNotificationsRead();
      setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleMarkRead(id) {
    setNotifications((cur) => cur.map((n) => n._id === id ? { ...n, read: true } : n));
    if (selected?._id === id) setSelected(s => ({ ...s, read: true }));
    try { await api.markNotificationRead(id); }
    catch (err) {
      setNotifications((cur) => cur.map((n) => n._id === id ? { ...n, read: false } : n));
      showToast(err.message, 'error');
    }
  }

  async function handleDelete(id) {
    const prev = notifications;
    setNotifications((cur) => cur.filter((n) => n._id !== id));
    if (selected?._id === id) setSelected(null);
    try { await api.deleteNotification(id); }
    catch (err) { setNotifications(prev); showToast(err.message, 'error'); }
  }

  async function handleClearAll() {
    const prev = notifications;
    setNotifications([]);
    setSelected(null);
    try {
      await api.clearAllNotifications();
      showToast('All notifications cleared.', 'info');
    } catch (err) { setNotifications(prev); showToast(err.message, 'error'); }
  }

  const counts = useMemo(() => ({
    all: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    success: notifications.filter(n => n.type === 'success').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    error: notifications.filter(n => n.type === 'error').length,
    info: notifications.filter(n => n.type === 'info').length,
  }), [notifications]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (activeTab === 'unread') list = list.filter(n => !n.read);
    else if (activeTab !== 'all') list = list.filter(n => n.type === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.message?.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q));
    }
    return list;
  }, [notifications, activeTab, search]);

  const unreadCount = counts.unread;

  function handleSelect(notif) {
    setSelected(s => s?._id === notif._id ? null : notif);
    if (!notif.read) handleMarkRead(notif._id);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="flex flex-col h-full min-h-screen bg-slate-50">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 pt-5 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-xs sm:text-sm text-slate-500">Stay updated with important alerts and account activity.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
              <CheckCheck size={14} className="text-indigo-500" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <ConfirmButton onConfirm={handleClearAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-200 bg-white rounded-xl hover:bg-rose-50 transition-all shadow-sm cursor-pointer"
              confirmClassName="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 border border-rose-600 rounded-xl transition-all shadow-sm cursor-pointer"
              confirmLabel="Clear all?">
              <Trash2 size={14} /> Clear All
            </ConfirmButton>
          )}
          <button onClick={loadNotifications}
            aria-label="Refresh notifications"
            className="inline-flex items-center justify-center w-9 h-9 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-500 transition-all shadow-sm cursor-pointer">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 px-4 sm:px-6 pb-8 flex-1 min-w-0">

        {/* Left panel */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">

          {/* Search + Tabs */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {FILTER_TABS.map(tab => {
                const active = activeTab === tab.value;
                const count = counts[tab.value] || 0;
                return (
                  <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    <tab.icon size={12} />
                    {tab.label}
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-white text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-20">
                <RefreshCw size={26} className="text-blue-400 animate-spin" />
                <p className="text-sm text-slate-400">Loading notifications...</p>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Inbox size={32} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-600">All caught up!</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {search ? 'No results for your search.' : activeTab !== 'all' ? `No ${activeTab} notifications.` : 'No notifications yet.'}
                  </p>
                </div>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <AnimatePresence mode="popLayout">
                {filtered.map((notif) => {
                  const cfg = getConfig(notif.type);
                  const Icon = cfg.Icon;
                  const isUnread = !notif.read;
                  const isSelected = selected?._id === notif._id;

                  return (
                    <motion.div
                      key={notif._id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleSelect(notif)}
                      className={`group relative flex items-start gap-3 px-5 py-4 border-b border-slate-100 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70' : isUnread ? 'bg-slate-50/80 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {/* Left accent bar for unread */}
                      {isUnread && <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-blue-500" />}

                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={18} className={cfg.iconColor} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const cleanText = formatCleanNotificationText(notif);
                          return (
                            <>
                              <p className={`text-sm leading-snug mb-0.5 break-words ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                {notif.title || cleanText}
                              </p>
                              {notif.title && (
                                <p className="text-xs text-slate-500 break-words line-clamp-2">{cleanText}</p>
                              )}
                            </>
                          );
                        })()}
                        <p className="text-[11px] text-slate-400 mt-1.5">{timeAgoShort(notif.created_at)}</p>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{timeAgoShort(notif.created_at)}</span>
                        {isUnread && <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />}
                      </div>

                      {/* Hover actions */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-100 shadow-sm rounded-lg p-0.5">
                        {isUnread && (
                          <button onClick={e => { e.stopPropagation(); handleMarkRead(notif._id); }}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Mark read">
                            <CheckCheck size={13} />
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); handleDelete(notif._id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Footer count */}
            {!loading && filtered.length > 0 && (
              <div className="px-5 py-3 text-[11px] text-slate-400 border-t border-slate-100">
                {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
                {unreadCount > 0 && ` · ${unreadCount} unread`}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:shrink-0 overflow-hidden w-full lg:w-[420px]"
            >
              <div className="w-full lg:w-[420px] h-full">
                <NotificationDetailPanel
                  notif={selected}
                  onClose={() => setSelected(null)}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
