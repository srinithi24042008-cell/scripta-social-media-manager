// Section3_Schedule.jsx — Scheduling, timezone, publish modes, custom per-platform
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Send, Save, Calendar, Sparkles, AlertTriangle, Loader2, CheckCircle, AlertCircle, 
  Settings2, MoreVertical
} from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { getSmartSchedule, publishPost, createPost, schedulePost, saveDraft, updateDraft } from './composeApi';
import { useWorkspaceStore } from '../../store/workspaceStore';

const PLATFORMS_CONFIG = {
  instagram: { name: 'Instagram', icon: FaInstagram, iconBg: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500' },
  facebook: { name: 'Facebook', icon: FaFacebook, iconBg: 'bg-[#1877f2]' },
  linkedin: { name: 'LinkedIn', icon: FaLinkedin, iconBg: 'bg-[#0a66c2]' },
  youtube: { name: 'YouTube', icon: FaYoutube, iconBg: 'bg-[#ff0000]' },
};

function getMinDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return now.toISOString().slice(0, 16);
}

function getCountdown(dateStr, timeStr, tz) {
  if (!dateStr || !timeStr) return null;
  try {
    const target = new Date(`${dateStr}T${timeStr}`);
    const diff = target - Date.now();
    if (diff <= 0) return 'Past date';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  } catch { return null; }
}

export default function Section3_Schedule({
  caption, selectedPlatforms, media, hashtags,
  publishMode, setPublishMode,
  scheduleDate, setScheduleDate,
  scheduleTime, setScheduleTime,
  timezone, setTimezone,
  publishStatus, setPublishStatus,
  publishResults, setPublishResults,
  publishBusy, setPublishBusy,
  draftId, setDraftId,
  bestTimes,
  loadDrafts,
  showToast,
  onSuccess,
}) {
  const { activeWorkspaceRole } = useWorkspaceStore();
  const [platformSmartSlots, setPlatformSmartSlots] = useState({});
  const [smartLoading, setSmartLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [platformSchedules, setPlatformSchedules] = useState({});
  const [selectedSmartSlots, setSelectedSmartSlots] = useState({});

  useEffect(() => {
    if (activeWorkspaceRole === 'editor' && publishMode === 'now') {
      setPublishMode('schedule');
    }
  }, [activeWorkspaceRole, publishMode, setPublishMode]);

  // Initialize selected platforms
  useEffect(() => {
    setPlatformSchedules(prev => {
      const next = { ...prev };
      selectedPlatforms.forEach(p => {
        if (!next[p]) next[p] = { date: scheduleDate || '', time: scheduleTime || '', aiSlot: null };
      });
      return next;
    });
  }, [selectedPlatforms]);

  // Load platform-specific AI suggestions for the list
  useEffect(() => {
    if (publishMode === 'custom') {
      selectedPlatforms.forEach(async p => {
        try {
          const res = await getSmartSchedule(p, timezone);
          const topSlot = res.slots?.[0];
          if (topSlot) {
            setPlatformSchedules(cur => ({
              ...cur,
              [p]: { ...cur[p], aiSlot: topSlot }
            }));
          }
        } catch { /* silent */ }
      });
    }
  }, [publishMode, selectedPlatforms, timezone]);

  // Update countdown every 30s for common schedule
  useEffect(() => {
    const update = () => setCountdown(getCountdown(scheduleDate, scheduleTime, timezone));
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [scheduleDate, scheduleTime, timezone]);

  const minDateTime = getMinDateTime();

  // Load all smart slots via Gemini AI
  const loadSmartSlots = async () => {
    if (selectedPlatforms.length === 0) {
      if (showToast) showToast('Select platforms first', 'error');
      return;
    }
    setSmartLoading(true);
    try {
      const results = {};
      await Promise.all(selectedPlatforms.map(async p => {
        try {
          const res = await getSmartSchedule(p, timezone, caption);
          results[p] = res.slots || [];
        } catch { results[p] = []; }
      }));
      setPlatformSmartSlots(results);
      if (showToast) showToast('Gemini AI best posting times loaded!', 'success');
    } catch { 
      if (showToast) showToast('Failed to load best posting times.', 'error');
    } finally {
      setSmartLoading(false);
    }
  };

  const applySlot = (slot) => {
    if (!slot) return;
    if (slot.datetime) {
      const dt = new Date(slot.datetime);
      if (!isNaN(dt.getTime())) {
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        setScheduleDate(`${year}-${month}-${day}`);
        setScheduleTime(dt.toTimeString().slice(0, 5));
        setPublishMode('schedule');
        return;
      }
    }
    if (slot.time) {
      const todayStr = new Date().toISOString().split('T')[0];
      setScheduleDate(todayStr);
      setScheduleTime(slot.time.slice(0, 5));
      setPublishMode('schedule');
    }
  };

  const applySlotToPlatform = (p, slot) => {
    if (!slot) return;
    const dt = new Date(slot.datetime);
    setPlatformSchedules(cur => ({
      ...cur,
      [p]: { ...cur[p], date: dt.toISOString().split('T')[0], time: dt.toTimeString().slice(0, 5) }
    }));
  };

  const updatePlatformSched = (p, field, value) => {
    setPlatformSchedules(cur => ({
      ...cur,
      [p]: { ...cur[p], [field]: value }
    }));
  };

  // Validate schedule
  const validateSchedule = () => {
    if (!scheduleDate || !scheduleTime) {
      setScheduleError('Please select a date and time.');
      return false;
    }
    const target = new Date(`${scheduleDate}T${scheduleTime}`);
    if (target <= new Date()) {
      setScheduleError('Schedule time must be in the future.');
      return false;
    }
    setScheduleError('');
    return true;
  };

  // Publish now
  const handlePublishNow = async () => {
    if (!caption.trim()) { showToast('Write a caption first', 'error'); return; }
    if (selectedPlatforms.length === 0) { showToast('Select at least one platform', 'error'); return; }

    setPublishBusy(true);
    const initialStatus = {};
    selectedPlatforms.forEach(p => { initialStatus[p] = 'publishing'; });
    setPublishStatus(initialStatus);
    setPublishResults({});

    try {
      const mediaUrl = media?.url || media?.originalUrl || null;
      const created = await createPost({
        content: caption,
        platforms: selectedPlatforms,
        platform: selectedPlatforms[0],
        hashtags,
        media_path: mediaUrl,
        media_type: media?.mediaType || null,
        status: 'draft',
      });

      const postsToPublish = created.posts || [created.post];
      if (postsToPublish.length === 0 || !postsToPublish[0]?._id) throw new Error('Failed to create posts');

      const results = {};
      await Promise.all(postsToPublish.map(async (post) => {
        try {
          const publishRes = await publishPost(post._id);
          if (publishRes.result?.details) {
            publishRes.result.details.forEach(d => {
              results[d.platform] = { success: d.success, message: d.message };
            });
          } else {
            results[post.platform] = { success: publishRes.result?.success, message: publishRes.result?.message };
          }
        } catch (err) {
          results[post.platform] = { success: false, message: err.message };
        }
      }));

      setPublishResults(results);
      const newStatus = {};
      Object.entries(results).forEach(([p, r]) => { newStatus[p] = r.success ? 'success' : 'failed'; });
      setPublishStatus(newStatus);

      const allOk = Object.values(results).every(r => r.success);
      if (allOk) {
        showToast('🎉 Published successfully!', 'success');
        if (onSuccess) onSuccess();
      } else {
        const failed = Object.entries(results).filter(([, r]) => !r.success).map(([p]) => p).join(', ');
        showToast(`Published with errors on: ${failed}`, 'error');
      }

      if (loadDrafts) await loadDrafts();
    } catch (err) {
      const failStatus = {};
      selectedPlatforms.forEach(p => { failStatus[p] = 'failed'; });
      setPublishStatus(failStatus);
      showToast(`Publish failed: ${err.message}`, 'error');
    } finally {
      setPublishBusy(false);
    }
  };

  // Schedule
  const handleSchedule = async () => {
    if (!caption.trim()) { showToast('Write a caption first', 'error'); return; }
    if (selectedPlatforms.length === 0) { showToast('Select platforms first', 'error'); return; }

    setPublishBusy(true);
    try {
      const mediaUrl = media?.url || media?.originalUrl || null;

      if (publishMode === 'custom' || publishMode === 'smart') {
        for (const p of selectedPlatforms) {
          let target;
          if (publishMode === 'custom') {
            const sched = platformSchedules[p];
            if (!sched || !sched.date || !sched.time) throw new Error(`Missing schedule for ${p}`);
            target = new Date(`${sched.date}T${sched.time}`);
          } else {
            // Smart mode
            const slots = platformSmartSlots[p];
            if (!slots || slots.length === 0) throw new Error(`Missing smart schedule times for ${p}. Please click Suggest.`);
            const selectedIdx = selectedSmartSlots[p] || 0;
            target = new Date(slots[selectedIdx].datetime);
          }

          if (target <= new Date()) throw new Error(`Schedule time for ${p} must be in the future.`);
          
          await createPost({
            content: caption,
            platforms: [p],
            platform: p,
            hashtags,
            media_path: mediaUrl,
            media_type: media?.mediaType || null,
            scheduled_at: target.toISOString(),
            timezone,
            status: 'scheduled',
          });
        }
      } else {
        if (!validateSchedule()) { setPublishBusy(false); return; }
        const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        await createPost({
          content: caption,
          platforms: selectedPlatforms,
          platform: selectedPlatforms[0],
          hashtags,
          media_path: mediaUrl,
          media_type: media?.mediaType || null,
          scheduled_at: scheduledAt,
          timezone,
          status: 'scheduled',
        });
      }

      showToast(activeWorkspaceRole === 'editor' ? '✅ Post submitted for approval!' : '✅ Scheduled successfully!', 'success');
      if (loadDrafts) await loadDrafts();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(`Schedule failed: ${err.message}`, 'error');
    } finally {
      setPublishBusy(false);
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    setPublishBusy(true);
    try {
      const mediaUrl = media?.url || media?.originalUrl || null;
      if (draftId) {
        await updateDraft(draftId, {
          content: caption, platforms: selectedPlatforms, platform: selectedPlatforms[0],
          hashtags, media_path: mediaUrl, media_type: media?.mediaType || null,
        });
      } else {
        const res = await saveDraft({
          content: caption || '',
          platforms: selectedPlatforms, platform: selectedPlatforms[0] || 'instagram',
          hashtags, media_path: mediaUrl, media_type: media?.mediaType || null,
        });
        if (res.post?._id) setDraftId(res.post._id);
      }
      showToast('Draft saved!', 'success');
      if (loadDrafts) await loadDrafts();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setPublishBusy(false);
    }
  };

  const timezones = (() => {
    try { return Intl.supportedValuesOf('timeZone'); } catch { return ['UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo']; }
  })();

  const MAIN_MODES = [
    { id: 'standard', label: 'Standard Post', desc: 'Publish now or set a common schedule', icon: Send },
    { id: 'smart', label: 'Smart Schedule', desc: 'AI recommended times', icon: Sparkles },
  ];

  const activeMainMode = (publishMode === 'now' || publishMode === 'schedule') ? 'standard' : publishMode;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-[#4F46E5] rounded-md shadow-sm flex items-center justify-center">
          <Clock size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Scheduling</h2>
          <p className="text-sm text-slate-500">Choose when and how to publish your content</p>
        </div>
      </div>

      {/* Mode selection */}
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          {MAIN_MODES.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => { setPublishMode(id === 'standard' ? 'now' : id); if (id === 'smart') loadSmartSlots(); }}
              className={`p-3.5 rounded-md border-2 text-left transition-all duration-200 ${
                activeMainMode === id
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-slate-100 bg-white hover:border-indigo-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={activeMainMode === id ? 'text-indigo-600' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${activeMainMode === id ? 'text-indigo-700' : 'text-slate-700'}`}>{label}</span>
              </div>
              <p className="text-xs text-slate-500">{desc}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => setPublishMode('custom')}
          className={`p-4 rounded-md border-2 text-left transition-all duration-200 xl:w-64 flex flex-col justify-center ${
            publishMode === 'custom'
              ? 'border-indigo-500 bg-indigo-50 shadow-sm'
              : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={16} className={publishMode === 'custom' ? "text-indigo-600" : "text-indigo-500"} />
            <span className={`text-sm font-bold ${publishMode === 'custom' ? "text-indigo-700" : "text-indigo-600"}`}>Customize per platform</span>
          </div>
        </button>
      </div>

      {/* Custom per platform view */}
      <AnimatePresence mode="wait">
        {publishMode === 'custom' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100/50 bg-white shadow-sm overflow-hidden">
              {selectedPlatforms.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-500">Please select platforms to customize their schedule.</div>
              )}
              {selectedPlatforms.map(p => {
                const conf = PLATFORMS_CONFIG[p];
                if (!conf) return null;
                const Icon = conf.icon;
                const sched = platformSchedules[p] || {};

                const dispDate = sched.aiSlot
                  ? (sched.aiSlot.display_date || '').replace('Saturday', 'Sat').replace('Sunday', 'Sun').replace('Monday', 'Mon').replace('Tuesday', 'Tue').replace('Wednesday', 'Wed').replace('Thursday', 'Thu').replace('Friday', 'Fri')
                  : 'Sat, Jul 18';
                const dispTime = sched.aiSlot ? (sched.aiSlot.display_time || '') : '12:00 PM';

                return (
                  <div key={p} className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 p-5 sm:p-6 hover:bg-slate-50 transition-colors">
                    {/* Platform Info */}
                    <div className="flex items-center gap-3.5 w-44 shrink-0">
                      <div className={`w-12 h-12 rounded-md ${conf.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{conf.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600">Connected</span>
                        </div>
                      </div>
                    </div>

                    {/* Date Selector */}
                    <div className="w-full md:w-[170px]">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Date</label>
                      <input
                        type="date"
                        value={sched.date}
                        min={minDateTime.split('T')[0]}
                        onChange={(e) => updatePlatformSched(p, 'date', e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 bg-white shadow-sm cursor-pointer"
                      />
                    </div>

                    {/* Time Selector */}
                    <div className="w-full md:w-[130px]">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Time</label>
                      <input
                        type="time"
                        value={sched.time}
                        onChange={(e) => updatePlatformSched(p, 'time', e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 bg-white shadow-sm cursor-pointer"
                      />
                    </div>

                    {/* AI Recommended */}
                    <div className="flex items-center gap-4 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 w-full md:w-64 min-w-[230px] shrink-0 justify-between">
                      <div>
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">AI Recommended</label>
                        <button
                          type="button"
                          onClick={() => applySlotToPlatform(p, sched.aiSlot || { datetime: new Date().toISOString() })}
                          className="text-left font-bold text-indigo-600 hover:text-indigo-800 text-xs block leading-snug"
                        >
                          <div>{dispDate}</div>
                          <div>{dispTime}</div>
                        </button>
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 rounded-md px-2.5 py-1 text-[10px] font-bold shrink-0 self-center">
                        Best Time
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Common / Smart Schedule View */}
      <AnimatePresence>
        {(activeMainMode === 'standard' || publishMode === 'smart') && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4 mt-2">
              
              {activeMainMode === 'standard' && activeWorkspaceRole !== 'editor' && (
                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-md border border-slate-200/60 w-fit">
                  <button onClick={() => setPublishMode('now')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${publishMode === 'now' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Publish Immediately</button>
                  <button onClick={() => setPublishMode('schedule')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${publishMode === 'schedule' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Schedule for Later</button>
                </div>
              )}

              {(publishMode === 'schedule' || publishMode === 'smart') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5">Date</label>
                      <input type="date" value={scheduleDate} min={minDateTime.split('T')[0]} onChange={(e) => { setScheduleDate(e.target.value); setScheduleError(''); }}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5">Time</label>
                      <input type="time" value={scheduleTime} onChange={(e) => { setScheduleTime(e.target.value); setScheduleError(''); }}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                  </div>

                  {countdown && !scheduleError && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 flex items-center gap-2">
                      <Clock size={13} className="text-blue-500" />
                      <span className="text-xs text-blue-700 font-medium">Publishes in approximately <strong>{countdown}</strong></span>
                    </div>
                  )}

                  {scheduleError && (
                    <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
                      <AlertTriangle size={13} className="text-red-500" />
                      <span className="text-xs text-red-600">{scheduleError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* AI Best Time suggestions */}
              {publishMode === 'smart' && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={16} className="text-indigo-500" /> AI Best Posting Time
                    </span>
                    <button onClick={loadSmartSlots} disabled={smartLoading} className="px-4 py-1.5 rounded-md bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50">
                      {smartLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Suggest
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedPlatforms.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Select platforms to see their best posting times.</p>
                    )}
                    {selectedPlatforms.map(p => {
                      const slots = platformSmartSlots[p] || [];
                      const conf = PLATFORMS_CONFIG[p];
                      if (!conf) return null;
                      return (
                        <div key={p} className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm">
                          <p className="text-sm font-bold text-slate-800 mb-3">{conf.name}</p>
                          {slots.length > 0 ? (
                            <div className="space-y-2">
                              {slots.slice(0, 3).map((slot, i) => {
                                const isSelected = (selectedSmartSlots[p] || 0) === i;
                                return (
                                  <button 
                                    key={i} 
                                    onClick={() => {
                                      setSelectedSmartSlots(prev => ({...prev, [p]: i}));
                                      applySlot(slot);
                                      if (showToast) showToast(`Applied ${slot.display_time || slot.time} to schedule`, 'info');
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50/80 shadow-sm' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md tracking-wide ${isSelected ? 'bg-indigo-600 text-white' : 'text-indigo-800 bg-indigo-100'}`}>{slot.display_time || slot.time}</span>
                                      <div className="text-left">
                                        <span className={`text-sm block ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-700 font-semibold'}`}>{slot.label || (i === 0 ? 'Late Morning Peak' : 'Evening Wind-down')}</span>
                                        {slot.reason && <span className="text-[11px] text-slate-500 block">{slot.reason}</span>}
                                      </div>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">{slot.engagement_score || slot.engagementScore}% engagement</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No times loaded.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer controls */}
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
        <button onClick={handleSaveDraft} disabled={publishBusy} className="px-5 py-2.5 rounded-md border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm bg-white flex items-center gap-1.5">
          <Save size={13} className="text-slate-400" />
          {publishBusy ? 'Saving...' : 'Save Draft'}
        </button>
        
        {(publishMode === 'schedule' || publishMode === 'smart' || publishMode === 'custom') ? (
          <button onClick={handleSchedule} disabled={publishBusy || !caption.trim() || selectedPlatforms.length === 0}
            className="px-6 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50">
            {publishBusy ? <Loader2 size={13} className="animate-spin text-white" /> : <Clock size={13} />}
            {activeWorkspaceRole === 'editor' ? 'Submit for Approval' : 'Schedule Post'}
          </button>
        ) : (
          <button onClick={handlePublishNow} disabled={publishBusy || !caption.trim() || selectedPlatforms.length === 0}
            className="px-6 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50">
            {publishBusy ? <Loader2 size={13} className="animate-spin text-white" /> : <Send size={13} />}
            Publish Now
          </button>
        )}
      </div>

      {/* Publish status overlay inline */}
      {Object.keys(publishStatus).length > 0 && (
        <div className="bg-slate-50 rounded-md border border-slate-200 p-4 space-y-2 mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Publish Status</p>
          {Object.entries(publishStatus).map(([platform, status]) => (
            <div key={platform} className="flex items-center gap-2.5">
              <span className="text-sm capitalize font-bold text-slate-700 w-24">{platform}</span>
              {status === 'publishing' && <><Loader2 size={14} className="animate-spin text-blue-500" /><span className="text-xs font-medium text-blue-600">Publishing...</span></>}
              {status === 'success' && <><CheckCircle size={14} className="text-green-500" /><span className="text-xs text-green-600 font-bold">Published!</span></>}
              {status === 'failed' && (
                <><AlertCircle size={14} className="text-red-500" />
                <span className="text-xs font-medium text-red-500">{publishResults?.[platform]?.message?.slice(0, 60) || 'Failed'}</span></>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
