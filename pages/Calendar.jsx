import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, ExternalLink, Trash2,
  Plus, Filter, Sparkles, Bot, LayoutGrid, List, Columns3,
} from 'lucide-react';
import { api } from '../api';
import { PLATFORM_LABELS, PLATFORM_HEX, ACTIVE_PLATFORMS } from '../platformStyles';
import { useToast } from '../components/Toast';
import ConfirmButton from '../components/ConfirmButton';


const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MINI_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Platform icon SVGs (simplified)
const PLATFORM_ICONS = {
  instagram: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
};

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function postDateObj(post) {
  const raw = post.status === 'published' ? post.published_at : post.scheduled_at;
  if (!raw) return null;
  const dt = new Date(raw);
  return isNaN(dt) ? null : dt;
}
function formatTime(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function formatTimeWithZone(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}
function toICSDate(d) {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
function googleCalUrl(post, d) {
  const start = toICSDate(d);
  const end = toICSDate(new Date(d.getTime() + 30 * 60000));
  const text = encodeURIComponent(`${PLATFORM_LABELS[post.platform] || post.platform} post`);
  const details = encodeURIComponent(post.content);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
}
function sameContentSignature(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].status !== b[i].status || a[i].scheduled_at !== b[i].scheduled_at || a[i].content !== b[i].content) return false;
  }
  return true;
}

const PostCard = memo(function PostCard({ p, rescheduling, rescheduleValue, onRescheduleValueChange, onStartReschedule, onSaveReschedule, onCancelReschedule, onRetry, onRemove }) {
  const color = PLATFORM_HEX[p.platform] || '#6366f1';
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: color }}>
            {PLATFORM_ICONS[p.platform] || <span className="text-[9px] font-bold">{(p.platform || '?')[0].toUpperCase()}</span>}
          </span>
          <span className="text-xs font-semibold text-slate-700">{PLATFORM_LABELS[p.platform] || p.platform}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
              p.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                p.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-500'
            }`}>{p.status}</span>
        </div>
        {p._time && <span className="text-[11px] text-slate-400 font-medium">{formatTimeWithZone(p._time)}</span>}
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3">{p.content}</p>
      {p.status === 'failed' && p.publish_result && (
        <p className="text-xs text-rose-600 font-medium bg-rose-50 rounded-lg px-3 py-1.5 border border-rose-100">{p.publish_result}</p>
      )}
      {rescheduling === p.id ? (
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <input type="datetime-local" value={rescheduleValue} onChange={(e) => onRescheduleValueChange(e.target.value)} className="input-field text-xs flex-1" />
          <button onClick={() => onSaveReschedule(p)} className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
          <button onClick={onCancelReschedule} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 text-xs font-semibold pt-3 border-t border-slate-100 items-center">
          {p.status === 'failed' && <button onClick={() => onRetry(p)} className="text-blue-600 hover:text-blue-700">Retry</button>}
          {p.status !== 'published' && <button onClick={() => onStartReschedule(p)} className="text-blue-600 hover:text-blue-700">Reschedule</button>}
          {p._time && (
            <a href={googleCalUrl(p, p._time)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <ExternalLink size={11} /> Google Cal
            </a>
          )}
          <ConfirmButton onConfirm={() => onRemove(p.id)} className="text-rose-500 hover:text-rose-600 ml-auto flex items-center gap-1" confirmLabel="Delete?">
            <Trash2 size={13} /> Delete
          </ConfirmButton>
        </div>
      )}
    </div>
  );
});

// Mini calendar for sidebar
function MiniCalendar({ current, onSelect, selectedDate }) {
  const [mini, setMini] = useState(current);
  useEffect(() => setMini(current), [current]);

  const year = mini.getFullYear();
  const month = mini.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(new Date());
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMini(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-slate-700">{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => setMini(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {MINI_WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] font-semibold text-slate-400 py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const k = dateKey(d);
          const isToday = k === todayKey;
          const isSelected = k === selectedDate;
          const isSun = d.getDay() === 0;
          return (
            <button key={k} onClick={() => onSelect(k)}
              className={`h-6 w-6 mx-auto flex items-center justify-center rounded-full text-[11px] font-medium transition-all ${isSelected ? 'bg-blue-600 text-white' :
                  isToday ? 'bg-blue-100 text-blue-700 font-bold' :
                    isSun ? 'text-red-500 hover:bg-red-50' :
                      'text-slate-600 hover:bg-slate-100'
                }`}>{d.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
}

const DayCell = memo(function DayCell({
  cellKey, dayNum, inMonth, dayPosts, isToday, isSelected, isFocused, isDragOver,
  onFocusCell, onClickCell, onDragOverCell, onDragLeaveCell, onDropCell, onChipDragStart,
}) {
  const isSunday = keyToDate(cellKey).getDay() === 0;
  const MAX_VISIBLE = 4;
  const extra = dayPosts.length - MAX_VISIBLE;

  return (
    <div
      id={`cal-cell-${cellKey}`}
      tabIndex={isFocused ? 0 : -1}
      onFocus={() => onFocusCell(cellKey)}
      onClick={() => onClickCell(cellKey)}
      onDragOver={(e) => { e.preventDefault(); onDragOverCell(cellKey); }}
      onDragLeave={() => onDragLeaveCell(cellKey)}
      onDrop={(e) => onDropCell(e, cellKey)}
      className={`relative min-h-[110px] border-r border-b border-slate-100 flex flex-col cursor-pointer select-none transition-colors focus:outline-none ${!inMonth ? 'bg-slate-50/60' : isDragOver ? 'bg-blue-50' : 'bg-white hover:bg-slate-50/70'
        } ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}`}
    >
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-medium transition-colors ${isToday ? 'bg-blue-600 text-white font-bold' :
            isSunday ? 'text-red-500' :
              !inMonth ? 'text-slate-300' :
                'text-slate-700'
          }`}>{dayNum}</div>
        {extra > 0 && (
          <span className="text-[10px] text-blue-500 font-semibold">+{extra} more</span>
        )}
      </div>

      <div className="flex flex-col gap-px px-1 pb-1 flex-1">
        {dayPosts.slice(0, MAX_VISIBLE).map((p) => {
          const color = PLATFORM_HEX[p.platform] || '#6366f1';
          const Icon = PLATFORM_ICONS[p.platform];
          return (
            <div
              key={p.id}
              draggable={p.status !== 'published'}
              onDragStart={(e) => onChipDragStart(e, p.id)}
              title={`${PLATFORM_LABELS[p.platform] || p.platform}: ${p.content?.slice(0, 60)}`}
              className={`flex items-center gap-1 rounded px-1.5 py-[2px] text-[10px] font-medium text-white truncate leading-tight ${p.status !== 'published' ? 'cursor-grab active:cursor-grabbing' : 'opacity-90'
                }`}
              style={{ backgroundColor: color }}
              onClick={(e) => e.stopPropagation()}
            >
              {Icon && <span className="shrink-0 opacity-90">{Icon}</span>}
              <span className="font-semibold mr-0.5 shrink-0">{formatTime(p._time)}</span>
              <span className="truncate opacity-90">{p.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.dayPosts === next.dayPosts && prev.isToday === next.isToday &&
  prev.isSelected === next.isSelected && prev.isFocused === next.isFocused &&
  prev.isDragOver === next.isDragOver && prev.inMonth === next.inMonth
);

export default function Calendar({ refreshKey, onNavigate }) {

  const [posts, setPosts] = useState([]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [focusedKey, setFocusedKey] = useState(dateKey(new Date()));
  const [rescheduling, setRescheduling] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const [dragOverKey, setDragOverKey] = useState(null);
  const [view, setView] = useState('month'); // month | week | list
  const showToast = useToast();
  const postsByDateCacheRef = useRef({});

  const [activeFilters, setActiveFilters] = useState({ platforms: [], statuses: [] });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterRef]);

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const date = monthCursor.getDate();

    if (view === 'month' || view === 'list') {
      const firstOfMonth = new Date(year, month, 1);
      const startOffset = firstOfMonth.getDay();
      const gridStart = new Date(year, month, 1 - startOffset);
      return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        return d;
      });
    } else {
      const day = monthCursor.getDay();
      const gridStart = new Date(year, month, date - day);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        return d;
      });
    }
  }, [monthCursor, view]);

  useEffect(() => {
    const from = cells[0];
    const to = new Date(cells[cells.length - 1].getFullYear(), cells[cells.length - 1].getMonth(), cells[cells.length - 1].getDate(), 23, 59, 59);
    api.getPosts({ 
      from: from.toISOString(), 
      to: to.toISOString()
    }).then((d) => setPosts(d.posts || []));
  }, [monthCursor, view, refreshKey]);

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (activeFilters.platforms.length > 0 && !activeFilters.platforms.includes(p.platform)) return false;
      if (activeFilters.statuses.length > 0 && !activeFilters.statuses.includes(p.status)) return false;
      return true;
    });
  }, [posts, activeFilters]);

  const postsByDate = useMemo(() => {
    const fresh = {};
    for (const p of filteredPosts) {
      const d = postDateObj(p);
      if (!d) continue;
      const key = dateKey(d);
      (fresh[key] = fresh[key] || []).push({ ...p, _time: d });
    }
    for (const key in fresh) fresh[key].sort((a, b) => a._time - b._time);
    const prevCache = postsByDateCacheRef.current;
    const stabilized = {};
    for (const key in fresh) {
      const prevArr = prevCache[key];
      stabilized[key] = prevArr && sameContentSignature(prevArr, fresh[key]) ? prevArr : fresh[key];
    }
    postsByDateCacheRef.current = stabilized;
    return stabilized;
  }, [filteredPosts]);

  const todayKey = dateKey(new Date());

  const stats = useMemo(() => ({
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    drafts: posts.filter(p => p.status === 'draft').length,
    failed: posts.filter(p => p.status === 'failed').length,
  }), [posts]);

  const upcomingPosts = useMemo(() => {
    const now = new Date();
    return filteredPosts
      .filter(p => p.status === 'scheduled' && new Date(p.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      .slice(0, 4)
      .map(p => ({ ...p, _time: new Date(p.scheduled_at) }));
  }, [filteredPosts]);

  function goToday() {
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    setFocusedKey(dateKey(now));
    setSelectedDate(null);
  }
  function changeCursor(delta) {
    setMonthCursor(cur => {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const date = cur.getDate();
      if (view === 'month' || view === 'list') {
        return new Date(year, month + delta, 1);
      } else {
        return new Date(year, month, date + (delta * 7));
      }
    });
    setSelectedDate(null);
  }

  function startReschedule(post) {
    setRescheduling(post.id);
    setRescheduleValue(post.scheduled_at ? post.scheduled_at.slice(0, 16) : '');
  }
  async function saveReschedule(post) {
    if (!rescheduleValue) return;
    const previous = { scheduled_at: post.scheduled_at, status: post.status };
    const iso = new Date(rescheduleValue).toISOString();
    setPosts(cur => cur.map(p => (p.id === post.id ? { ...p, scheduled_at: iso, status: 'scheduled' } : p)));
    setRescheduling(null);
    try { await api.updatePost(post.id, { content: post.content, platform: post.platform, scheduled_at: iso }); showToast('Post rescheduled', 'success'); }
    catch (err) { setPosts(cur => cur.map(p => (p.id === post.id ? { ...p, ...previous } : p))); showToast(err.message, 'error'); }
  }
  async function retryPublish(post) {
    try { await api.publishNow(post.id); showToast('Re-publishing...', 'info'); }
    catch (err) { showToast(err.message, 'error'); }
  }
  async function remove(id) {
    const removed = posts.find(p => p.id === id);
    setPosts(cur => cur.filter(p => p.id !== id));
    if (rescheduling === id) setRescheduling(null);
    try { await api.deletePost(id); showToast('Post deleted', 'info'); }
    catch (err) { if (removed) setPosts(cur => [...cur, removed]); showToast(err.message, 'error'); }
  }

  const handleDragStart = useCallback((e, postId) => { e.dataTransfer.setData('text/plain', postId); }, []);
  const handleDrop = useCallback(async (e, targetKey) => {
    e.preventDefault();
    setDragOverKey(null);
    const postId = e.dataTransfer.getData('text/plain');
    setPosts(currentPosts => {
      const post = currentPosts.find(p => p.id === postId);
      if (!post || post.status === 'published') return currentPosts;
      const existing = postDateObj(post) || new Date();
      const target = keyToDate(targetKey);
      target.setHours(existing.getHours(), existing.getMinutes());
      const previous = { scheduled_at: post.scheduled_at, status: post.status };
      const iso = target.toISOString();
      api.updatePost(post.id, { content: post.content, platform: post.platform, scheduled_at: iso })
        .then(() => showToast('Post moved', 'success'))
        .catch(err => { setPosts(cur => cur.map(p => (p.id === post.id ? { ...p, ...previous } : p))); showToast(err.message, 'error'); });
      return currentPosts.map(p => (p.id === post.id ? { ...p, scheduled_at: iso, status: 'scheduled' } : p));
    });
  }, [showToast]);

  const selectedPosts = selectedDate ? (postsByDate[selectedDate] || []) : [];

  const displayRange = view === 'week' 
    ? `${SHORT_MONTH[cells[0].getMonth()]} ${cells[0].getDate()} – ${SHORT_MONTH[cells[6].getMonth()]} ${cells[6].getDate()}, ${cells[6].getFullYear()}`
    : `${SHORT_MONTH[cells[0].getMonth()]} ${cells[0].getDate()} – ${SHORT_MONTH[cells[cells.length - 1].getMonth()]} ${String(cells[cells.length - 1].getDate()).padStart(2, '0')}, ${cells[cells.length - 1].getFullYear()}`;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="flex flex-col h-full min-h-screen bg-slate-50">

      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visual calendar view of your scheduled content.</p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('compose')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus size={16} />
          Create Post
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-5 px-6 pb-8 flex-1">

        {/* Calendar Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Calendar Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button onClick={goToday}
                className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                Today
              </button>
              <div className="flex items-center gap-0.5">
                <button onClick={() => changeCursor(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => changeCursor(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
              <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                {displayRange}
                <ChevronRight size={14} className="opacity-50" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                {[
                  { id: 'month', icon: <LayoutGrid size={14} />, label: 'Month' },
                  { id: 'week', icon: <Columns3 size={14} />, label: 'Week' },
                  { id: 'list', icon: <List size={14} />, label: 'List' },
                ].map(v => (
                  <button key={v.id} onClick={() => setView(v.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === v.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                      }`}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
              <div className="relative" ref={filterRef}>
                <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors relative">
                  <Filter size={14} />
                  {(activeFilters.platforms.length > 0 || activeFilters.statuses.length > 0) && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                  )}
                </button>
                <AnimatePresence>
                  {showFilterDropdown && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-2 overflow-hidden">
                      <div className="px-3 pb-2 mb-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">Platforms</p>
                        <div className="mt-2 space-y-1">
                          {ACTIVE_PLATFORMS.map(plat => (
                            <label key={plat} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-1 hover:bg-slate-50 rounded">
                              <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                checked={activeFilters.platforms.includes(plat)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setActiveFilters(prev => ({
                                    ...prev,
                                    platforms: checked ? [...prev.platforms, plat] : prev.platforms.filter(p => p !== plat)
                                  }))
                                }}
                              />
                              {PLATFORM_LABELS[plat] || plat}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="px-3">
                        <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
                        <div className="mt-2 space-y-1">
                          {['scheduled', 'published', 'draft', 'failed'].map(status => (
                            <label key={status} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-1 hover:bg-slate-50 rounded">
                              <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                checked={activeFilters.statuses.includes(status)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setActiveFilters(prev => ({
                                    ...prev,
                                    statuses: checked ? [...prev.statuses, status] : prev.statuses.filter(s => s !== status)
                                  }))
                                }}
                              />
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>
                      {(activeFilters.platforms.length > 0 || activeFilters.statuses.length > 0) && (
                        <div className="px-3 pt-2 mt-2 border-t border-slate-100">
                          <button onClick={() => setActiveFilters({ platforms: [], statuses: [] })} className="w-full text-center text-xs font-semibold text-rose-500 hover:text-rose-600 py-1">
                            Clear Filters
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {view === 'list' ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/30">
              {Object.keys(postsByDate).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">No posts to display in this period.</div>
              ) : (
                Object.entries(postsByDate).map(([dateStr, dayPosts]) => {
                  const d = keyToDate(dateStr);
                  // Only show dates in current range
                  if (d < cells[0] || d > cells[cells.length - 1]) return null;
                  return (
                    <div key={dateStr}>
                      <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
                        {dateStr === todayKey && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">TODAY</span>}
                        {d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                        {dayPosts.map(p => (
                          <PostCard key={p.id} p={p} rescheduling={rescheduling} rescheduleValue={rescheduleValue}
                            onRescheduleValueChange={setRescheduleValue} onStartReschedule={startReschedule}
                            onSaveReschedule={saveReschedule} onCancelReschedule={() => setRescheduling(null)}
                            onRetry={retryPublish} onRemove={remove} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {WEEKDAYS.map((w, i) => (
                  <div key={w} className={`text-[11px] font-bold uppercase tracking-wider text-center py-2 ${i === 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    <span className="hidden sm:inline">{w}</span>
                    <span className="sm:hidden">{MINI_WEEKDAYS[i]}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className={`grid grid-cols-7 flex-1 border-l border-t border-slate-100 ${view === 'week' ? 'grid-rows-1 min-h-[300px]' : ''}`}>
                {cells.map((d) => {
                  const key = dateKey(d);
                  return (
                    <DayCell key={key} cellKey={key} dayNum={d.getDate()}
                      inMonth={view === 'week' || d.getMonth() === monthCursor.getMonth()}
                      dayPosts={postsByDate[key] || []} isToday={key === todayKey}
                      isSelected={key === selectedDate} isFocused={key === focusedKey}
                      isDragOver={key === dragOverKey}
                      onFocusCell={k => setFocusedKey(k)}
                      onClickCell={k => setSelectedDate(c => (c === k ? null : k))}
                      onDragOverCell={k => setDragOverKey(k)}
                      onDragLeaveCell={k => setDragOverKey(c => (c === k ? null : c))}
                      onDropCell={handleDrop} onChipDragStart={handleDragStart}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-4">

          {/* Quick Calendar mini */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Quick Calendar</p>
            <MiniCalendar current={monthCursor} selectedDate={selectedDate} onSelect={k => {
              setSelectedDate(c => c === k ? null : k);
              const d = keyToDate(k);
              setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }} />
          </div>

          {/* Content Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Content Summary</p>
              <span className="text-[10px] text-slate-400 font-medium">This Month</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Published', value: stats.published, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Drafts', value: stats.drafts, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Failed', value: stats.failed, color: 'text-red-500', bg: 'bg-red-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Posts */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Upcoming Posts</p>
              <button className="text-[10px] text-blue-600 font-semibold hover:underline">View all</button>
            </div>
            {upcomingPosts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No upcoming posts</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingPosts.map(p => {
                  const color = PLATFORM_HEX[p.platform] || '#6366f1';
                  const Icon = PLATFORM_ICONS[p.platform];
                  const isToday = dateKey(p._time) === todayKey;
                  return (
                    <div key={p.id} className="flex items-start gap-2.5 group">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5" style={{ backgroundColor: color }}>
                        {Icon || <span className="text-[9px] font-bold">{(p.platform || '?')[0].toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate leading-tight">{p.content || 'No content'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isToday ? 'Today, ' : `${SHORT_MONTH[p._time.getMonth()]} ${p._time.getDate()}, `}
                          {formatTime(p._time)}
                        </p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity">
                        <span className="text-slate-300">···</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Day Detail Drawer */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {keyToDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} scheduled</p>
                </div>
                <button onClick={() => setSelectedDate(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {selectedPosts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">No posts on this date.</p>
                    <button onClick={() => { setSelectedDate(null); onNavigate && onNavigate('compose'); }}
                      className="mt-3 text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                      <Plus size={12} /> Create a post
                    </button>
                  </div>
                )}
                {selectedPosts.map(p => (
                  <PostCard key={p.id} p={p} rescheduling={rescheduling} rescheduleValue={rescheduleValue}
                    onRescheduleValueChange={setRescheduleValue} onStartReschedule={startReschedule}
                    onSaveReschedule={saveReschedule} onCancelReschedule={() => setRescheduling(null)}
                    onRetry={retryPublish} onRemove={remove} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
