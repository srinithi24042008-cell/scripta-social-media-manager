// ─── Imports ────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Heart, Eye,
  AlertCircle, Link2, Calendar, RefreshCw, FileText, Send,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { subDays, format } from 'date-fns';
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { api } from '../api';
import { useToast } from '../components/Toast';
import useSocket from '../hooks/useSocket';


// ─── Design tokens ──────────────────────────────────────────────────────────
// Primary: #4F46E5 (indigo)   Ink: #0F172A   Surface: #F8FAFC
// Platform accents are semantic (owned by each network), everything else is neutral.
const PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  youtube: 'YouTube',
};

const PLATFORM_COLORS = {
  instagram: '#E4405F',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  unknown: '#94a3b8',
};

const PLATFORM_ICONS = {
  instagram: <FaInstagram size={14} />,
  linkedin: <FaLinkedin size={14} />,
  facebook: <FaFacebook size={14} />,
  youtube: <FaYoutube size={14} />,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 1 : 2) + 'K';
  return String(n);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-slate-500 font-semibold mb-2">{label ? format(new Date(label), 'MMM d, yyyy') : ''}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-slate-600 capitalize">{p.name}</span>
          </div>
          <span className="font-bold text-slate-900">{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.payload.color }} />
        <span className="text-slate-600 font-semibold">{p.payload.name}</span>
      </div>
      <span className="font-bold text-slate-900 text-sm">{fmtNum(p.value)}</span>
    </div>
  );
};

// Small inline trend line used inside KPI cards — only rendered when a real
// daily series backs the metric, never fabricated.
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  return (
    <div className="h-9 w-full opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.75}
            fill={`url(#spark-${color.replace('#', '')})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, gradient }) {
  return (
    <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_30px_-4px_rgba(79,70,229,0.12)] hover:-translate-y-1 hover:border-indigo-200">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50/40 to-emerald-50/40 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: gradient || bg }}>
          <Icon size={18} style={{ color: gradient ? '#ffffff' : color }} strokeWidth={2.25} />
        </div>
        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 animate-pulse" /> Live
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-3xl leading-none font-black tracking-tight text-slate-900 mb-1.5">{fmtNum(value)}</p>
        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ refreshKey }) {

  const [accounts, setAccounts] = useState([]);

  // Real-time API States
  const [igProfile, setIgProfile] = useState(null);
  const [fbPage, setFbPage] = useState(null);
  const [ytChannel, setYtChannel] = useState(null);
  const [liProfile, setLiProfile] = useState(null);
  const [liStats, setLiStats] = useState(null);

  const [igReachData, setIgReachData] = useState([]);
  const [fbInsights, setFbInsights] = useState(null);
  const [ytAnalytics, setYtAnalytics] = useState(null);

  const [igPosts, setIgPosts] = useState([]);
  const [fbFeed, setFbFeed] = useState([]);
  const [liPosts, setLiPosts] = useState([]);
  const [publishedCount, setPublishedCount] = useState(0);

  const [dateRangeDays, setDateRangeDays] = useState(7);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dateDropdown, setDateDropdown] = useState(false);
  const syncingRef = useRef(false);
  const showToast = useToast();
  const { socket } = useSocket();

  const { startDateStr, endDateStr } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, dateRangeDays);
    return { startDateStr: start.toISOString(), endDateStr: end.toISOString() };
  }, [dateRangeDays]);

  const fillDateGaps = (data, startStr, endStr, key = 'value', extraKeys = []) => {
    if (!data) return [];
    let start = new Date(startStr);
    let end = new Date(endStr);
    const today = new Date();
    if (end > today) end = today;

    const dataMap = {};
    data.forEach(item => {
      if (item && item.date) {
        dataMap[item.date.split('T')[0]] = item;
      }
    });

    const result = [];
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (dataMap[dateStr]) {
        result.push(dataMap[dateStr]);
      } else {
        const empty = { date: dateStr, [key]: 0 };
        extraKeys.forEach(k => { empty[k] = 0; });
        result.push(empty);
      }
      current.setDate(current.getDate() + 1);
    }
    return result;
  };

  const paddedIgData = useMemo(() => fillDateGaps(igReachData, startDateStr, endDateStr, 'value'), [igReachData, startDateStr, endDateStr]);

  const paddedFbData = useMemo(() => {
    if (!fbInsights?.available || !fbInsights.data) return fillDateGaps([], startDateStr, endDateStr, 'value');
    const metric = fbInsights.data.find(m => m.name === 'page_likes') || fbInsights.data.find(m => m.name === 'page_impressions_unique') || fbInsights.data[0];
    if (!metric || !metric.values) return fillDateGaps([], startDateStr, endDateStr, 'value');
    const mapped = metric.values.map(v => ({ date: v.end_time.split('T')[0], value: v.value || 0 }));
    return fillDateGaps(mapped, startDateStr, endDateStr, 'value');
  }, [fbInsights, startDateStr, endDateStr]);

  const paddedYtData = useMemo(() => {
    const mapped = (ytAnalytics?.chartData || []).map(item => ({ date: item.date, value: item.views || 0 }));
    return fillDateGaps(mapped, startDateStr, endDateStr, 'value');
  }, [ytAnalytics, startDateStr, endDateStr]);

  const combinedChartData = useMemo(() => {
    const merged = {};
    paddedIgData.forEach(d => { merged[d.date] = { ...merged[d.date], date: d.date, instagram: d.value }; });
    paddedFbData.forEach(d => { merged[d.date] = { ...merged[d.date], date: d.date, facebook: d.value }; });
    paddedYtData.forEach(d => { merged[d.date] = { ...merged[d.date], date: d.date, youtube: d.value }; });
    return Object.values(merged).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [paddedIgData, paddedFbData, paddedYtData]);

  const platformsData = useMemo(() => {
    const igLikes = igPosts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
    const fbLikes = fbFeed.reduce((sum, p) => sum + (p.likes || 0), 0);
    const ytLikes = ytAnalytics?.likes || 0;
    const liReactions = liStats?.totalReactions || liPosts.reduce((sum, p) => sum + (p.reactions || 0), 0);

    return [
      { name: 'Instagram', value: igLikes, realEngagements: igLikes, rawPlatform: 'instagram' },
      { name: 'Facebook', value: fbLikes, realEngagements: fbLikes, rawPlatform: 'facebook' },
      { name: 'YouTube', value: ytLikes, realEngagements: ytLikes, rawPlatform: 'youtube' },
      { name: 'LinkedIn', value: liReactions, realEngagements: liReactions, rawPlatform: 'linkedin' }
    ];
  }, [igPosts, fbFeed, ytAnalytics, liStats, liPosts]);

  // Follower distribution across connected platforms
  const followerDistData = useMemo(() => ([
    { name: 'Instagram', value: Number(igProfile?.followersCount || 0), color: PLATFORM_COLORS.instagram },
    { name: 'Facebook', value: Number(fbPage?.followers_count || 0), color: PLATFORM_COLORS.facebook },
    { name: 'YouTube', value: Number(ytChannel?.subscribers_count || 0), color: PLATFORM_COLORS.youtube },
    { name: 'LinkedIn', value: Number(liProfile?.connectionCount || liStats?.connectionCount || 0), color: PLATFORM_COLORS.linkedin },
  ]), [igProfile, fbPage, ytChannel, liProfile, liStats]);

  // Posts published per platform in the selected window
  const contentVolumeData = useMemo(() => ([
    { name: 'Instagram', value: igPosts.length, color: PLATFORM_COLORS.instagram },
    { name: 'Facebook', value: fbFeed.length, color: PLATFORM_COLORS.facebook },
    { name: 'YouTube', value: ytChannel?.total_videos || 0, color: PLATFORM_COLORS.youtube },
    { name: 'LinkedIn', value: liPosts.length || liStats?.totalPosts || 0, color: PLATFORM_COLORS.linkedin },
  ]), [igPosts, fbFeed, ytChannel, liPosts, liStats]);

  function fetchAllData() {
    api.getAccounts().then((d) => setAccounts(d.accounts || [])).catch(() => { });

    api.getIgProfile().then(setIgProfile).catch(() => { });
    api.getIgAccountInsights(startDateStr, endDateStr).then(res => setIgReachData(res.reach || [])).catch(() => { });
    api.getIgPosts().then(setIgPosts).catch(() => { });

    api.getFbPage().then(setFbPage).catch(() => { });
    api.getFbFeed().then(setFbFeed).catch(() => { });
    api.getFbInsights(startDateStr, endDateStr).then(setFbInsights).catch(() => { });

    api.getYtChannel().then(setYtChannel).catch(() => { });
    api.getYtAnalytics(startDateStr, endDateStr).then(setYtAnalytics).catch(() => { });

    api.getLiProfile().then(setLiProfile).catch(() => { });
    api.getLiStats().then(setLiStats).catch(() => { });
    api.getLiPosts().then(res => setLiPosts(res.posts || [])).catch(() => { });

    api.getPosts({ status: 'published' }).then((res) => setPublishedCount(res.posts?.length || 0)).catch(() => { });
  }

  async function syncThenFetch(silent = true) {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      if (!silent) await api.syncAnalytics();
    } catch (err) {
      if (!silent) showToast(err.message || 'Sync failed.', 'error');
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      fetchAllData();
    }
  }

  const handleSync = () => syncThenFetch(false);

  useEffect(() => { syncThenFetch(true); }, [refreshKey, dateRangeDays]);

  useEffect(() => {
    if (!socket) return;
    socket.on('analytics_updated', fetchAllData);
    socket.on('posts_updated', fetchAllData);
    return () => { socket.off('analytics_updated', fetchAllData); socket.off('posts_updated', fetchAllData); };
  }, [socket]);

  // Aggregate stats from Live APIs
  const totalFollowers = Number(igProfile?.followersCount || 0) + Number(fbPage?.followers_count || 0) + Number(ytChannel?.subscribers_count || 0) + Number(liProfile?.connectionCount || liStats?.connectionCount || 0);

  let totalReach = 0;
  paddedIgData.forEach(d => totalReach += d.value);

  let totalImpressions = 0;
  paddedFbData.forEach(d => totalImpressions += d.value);

  const totalLikes = platformsData.reduce((sum, p) => sum + p.realEngagements, 0);
  const totalViews = ytAnalytics?.views || 0;
  const totalShares = (ytAnalytics?.shares || 0) +
    fbFeed.reduce((sum, p) => sum + (p.shares?.count || p.shares || 0), 0) +
    igPosts.reduce((sum, p) => sum + (p.sharesCount || p.shares?.count || 0), 0) +
    (liStats?.totalShares || 0);
  const kpiCards = [
    { label: 'Total Followers', value: totalFollowers, icon: Users, color: '#4f46e5', bg: '#eef2ff', gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' },
    { label: 'Views', value: totalReach + totalViews, icon: Eye, color: '#0284c7', bg: '#f0f9ff', gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' },
    { label: 'Total Likes', value: totalLikes, icon: Heart, color: '#e11d48', bg: '#fff1f2', gradient: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)' },
    { label: 'Total Published', value: publishedCount, icon: Send, color: '#059669', bg: '#ecfdf5', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  ];

  const dateRangeLabel = `${format(subDays(new Date(), dateRangeDays), 'MMM d')} – ${format(new Date(), 'MMM d, yyyy')}`;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible"
      className="min-h-screen bg-[#f8fafc] -m-6 p-6 space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Real-time performance analytics synced from official APIs.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <button
              onClick={() => setDateDropdown(d => !d)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Calendar size={13} className="text-indigo-500" />
              Last {dateRangeDays} Days
              <span className="text-indigo-500 font-bold ml-1">▾</span>
            </button>
            {dateDropdown && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1">
                {[7, 30, 90].map(d => (
                  <button key={d} onClick={() => { setDateRangeDays(d); setDateDropdown(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${dateRangeDays === d ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                    Last {d} Days
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSync} disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60">
            <RefreshCw size={13} className={`text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </motion.div>

      {/* Connected accounts */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        {accounts.length === 0 ? (
          <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-bold text-amber-700 flex items-center gap-2">
            <AlertCircle size={14} /> No accounts connected. Go to Settings to connect.
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc._id} className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
              <span className="text-[14px]" style={{ color: PLATFORM_COLORS[acc.platform] }}>
                {PLATFORM_ICONS[acc.platform] || <Link2 size={14} />}
              </span>
              <span className="text-xs font-extrabold text-slate-600">@{acc.handle}</span>
              <div className={`w-1.5 h-1.5 rounded-full ml-1 ${acc.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} title={acc.status} />
            </div>
          ))
        )}
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(card => <KpiCard key={card.label} {...card} />)}
      </motion.div>

      {/* Row 1: trend + platform split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Engagement Trend</h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                <Calendar size={11} className="text-slate-400" />
                {dateRangeLabel}
              </p>
            </div>
          </div>
          <div className="h-[260px] w-full">
            {combinedChartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E4405F" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#E4405F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradFb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1877F2" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradYt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF0000" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A66C2" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0A66C2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tickFormatter={v => format(new Date(v), 'MMM d')}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
                  <YAxis tickFormatter={v => fmtNum(v)}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={8} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#f8fafc', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="instagram" name="Instagram Reach" stroke="#E4405F" strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gradIg)" activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="facebook" name="Facebook Impressions" stroke="#1877F2" strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gradFb)" activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="youtube" name="YouTube Views" stroke="#FF0000" strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gradYt)" activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="linkedin" name="LinkedIn Engagement" stroke="#0A66C2" strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gradLi)" activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No timeline data available</div>
            )}
          </div>

          <div className="flex items-center justify-center gap-5 mt-4 text-[10px] font-bold text-slate-400 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E4405F]" />
              <span>Instagram</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1877F2]" />
              <span>Facebook</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF0000]" />
              <span>YouTube</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
              <span>LinkedIn</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-0.5">Platform Performance</h2>
            <p className="text-[10px] text-slate-400 font-semibold mb-5">Likes distribution</p>

            {platformsData.some(p => p.value > 0) ? (
              <div className="flex flex-col items-center">
                <div className="h-[180px] w-full mb-6 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={platformsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                        paddingAngle={2} dataKey="value" stroke="none">
                        {platformsData.map((entry, i) => (
                          <Cell key={i} fill={PLATFORM_COLORS[entry.rawPlatform] || PLATFORM_COLORS.unknown} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-900">{fmtNum(totalLikes)}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Likes</span>
                  </div>
                </div>
                <div className="w-full space-y-1">
                  {platformsData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-semibold py-2.5 border-b border-slate-100/50 last:border-none">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[entry.rawPlatform] || PLATFORM_COLORS.unknown }} />
                        <span className="text-slate-500">{entry.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{fmtNum(entry.realEngagements)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <Heart size={32} className="mb-2 opacity-40" />
                <span className="text-sm font-semibold">No platform data</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 2: follower distribution, content volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-0.5">Follower Distribution</h2>
          <p className="text-[10px] text-slate-400 font-semibold mb-5">Audience size by platform</p>
          {followerDistData.some(d => d.value > 0) ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followerDistData} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }} barSize={22}>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="4 4" />
                  <XAxis type="number" tickFormatter={v => fmtNum(v)} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} width={70} />
                  <RechartsTooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {followerDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-400">
              <Users size={28} className="mb-2 opacity-40" />
              <span className="text-sm font-semibold">No follower data</span>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-0.5">Content Published</h2>
          <p className="text-[10px] text-slate-400 font-semibold mb-5">Posts tracked per platform</p>
          {contentVolumeData.some(d => d.value > 0) ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={48}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4 4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {contentVolumeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-400">
              <FileText size={28} className="mb-2 opacity-40" />
              <span className="text-sm font-semibold">No posts tracked</span>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}