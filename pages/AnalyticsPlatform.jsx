import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Sparkles, TrendingUp, ThumbsUp, UserPlus, ArrowUpRight,
  CheckCircle2, Clock, Link2, FileText, RefreshCw, Plus,
  BarChart3, Eye, MessageCircle, Share2, AlertCircle, X, ExternalLink, Calendar,
  PlaySquare, Image as ImageIcon, Layout,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { subDays, format } from 'date-fns';
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import useSocket from '../hooks/useSocket';


// ─── Constants ──────────────────────────────────────────────────────────
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
  instagram: <FaInstagram size={16} />,
  linkedin: <FaLinkedin size={16} />,
  facebook: <FaFacebook size={16} />,
  youtube: <FaYoutube size={16} />,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 1 : 2) + 'K';
  return String(n);
}

function getPct(curr, prev) {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function TrendBadge({ current, previous }) {
  const pct = getPct(current, previous);
  if (pct === 0) return <span className="text-[11px] text-slate-400 font-medium">-</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
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

// ─── Main Component ────────────────────────────────────────────────────────
export default function AnalyticsPlatform({ refreshKey, onNavigate }) {

  const [activeTab, setActiveTab] = useState('instagram'); // 'instagram', 'facebook', 'youtube', 'linkedin'

  // Instagram specific data from new API
  const [igProfile, setIgProfile] = useState(null);
  const [igReachData, setIgReachData] = useState([]);
  const [igPosts, setIgPosts] = useState([]);
  const [igPostInsights, setIgPostInsights] = useState({});
  const [loadingInsightsFor, setLoadingInsightsFor] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [igError, setIgError] = useState(null);

  // Facebook specific data from new API
  const [fbPage, setFbPage] = useState(null);
  const [fbFeed, setFbFeed] = useState([]);
  const [fbPhotos, setFbPhotos] = useState([]);
  const [fbVideos, setFbVideos] = useState([]);
  const [fbInsights, setFbInsights] = useState(null);
  const [fbError, setFbError] = useState(null);

  // YouTube specific data from API
  const [ytChannel, setYtChannel] = useState(null);
  const [ytAnalytics, setYtAnalytics] = useState(null);
  const [ytError, setYtError] = useState(null);

  // LinkedIn specific data from API
  const [liProfile, setLiProfile] = useState(null);
  const [liStats, setLiStats] = useState(null);
  const [liPosts, setLiPosts] = useState([]);
  const [liError, setLiError] = useState(null);

  const [insights, setInsights] = useState([
    "Videos are receiving 40% more engagement than static images this week.",
    "Your follower growth is accelerating on Instagram.",
    "Posting between 6 PM and 8 PM yields the highest reach.",
  ]);
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

    const parseDateStr = (str) => {
      if (!str) return '';
      if (typeof str === 'string' && str.includes('T')) return str.split('T')[0];
      return String(str);
    };

    const dataMap = {};
    data.forEach(item => {
      if (item && item.date) {
        dataMap[parseDateStr(item.date)] = item;
      }
    });

    const result = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    const today = new Date();
    const targetEnd = end > today ? today : end;

    let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const finalDate = new Date(Date.UTC(targetEnd.getUTCFullYear(), targetEnd.getUTCMonth(), targetEnd.getUTCDate()));

    while (cur <= finalDate) {
      const dStr = cur.toISOString().split('T')[0];
      if (dataMap[dStr]) {
        result.push(dataMap[dStr]);
      } else {
        const empty = { date: dStr, [key]: 0 };
        extraKeys.forEach(k => { empty[k] = 0; });
        result.push(empty);
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return result;
  };

  const fbChartData = useMemo(() => {
    if (!fbInsights?.available || !fbInsights.data) return fillDateGaps([], startDateStr, endDateStr, 'value');
    const metric = fbInsights.data.find(m => m.name === 'page_likes') || fbInsights.data.find(m => m.name === 'page_impressions_unique') || fbInsights.data[0];
    if (!metric || !metric.values) return fillDateGaps([], startDateStr, endDateStr, 'value');
    const mapped = metric.values.map(v => ({
      date: v.end_time.split('T')[0],
      value: v.value || 0
    }));
    return fillDateGaps(mapped, startDateStr, endDateStr, 'value');
  }, [fbInsights, startDateStr, endDateStr]);

  const paddedIgData = useMemo(() => {
    return fillDateGaps(igReachData, startDateStr, endDateStr, 'value');
  }, [igReachData, startDateStr, endDateStr]);

  const paddedYtData = useMemo(() => {
    return fillDateGaps(ytAnalytics?.chartData || [], startDateStr, endDateStr, 'views', ['watchTime', 'likes', 'comments', 'subscribersGained']);
  }, [ytAnalytics, startDateStr, endDateStr]);

  function fetchAllData() {
    // 2. Fetch specific Instagram data from new Meta Graph APIs
    setIgError(null);
    api.getIgProfile().then(setIgProfile).catch(err => {
      // Don't show an error banner if the user simply hasn't connected an account
      if (err.message.includes('not connected')) return;
      setIgError(err.message);
    });
    api.getIgAccountInsights(startDateStr, endDateStr).then(res => setIgReachData(res.reach || [])).catch(() => { });
    api.getIgPosts().then(setIgPosts).catch(() => { });

    // 3. Fetch specific Facebook data from new Meta Graph APIs
    setFbError(null);
    api.getFbPage().then(setFbPage).catch(err => {
      if (err.message.includes('not connected')) return;
      setFbError(err.message);
    });
    api.getFbFeed().then(setFbFeed).catch(() => { });
    api.getFbPhotos().then(setFbPhotos).catch(() => { });
    api.getFbVideos().then(setFbVideos).catch(() => { });
    api.getFbInsights(startDateStr, endDateStr).then(setFbInsights).catch(() => { });

    // 4. Fetch YouTube data
    setYtError(null);
    api.getYtChannel().then(setYtChannel).catch(err => {
      if (err.message.includes('not connected')) return;
      setYtError(err.message);
    });
    api.getYtAnalytics(startDateStr, endDateStr).then(setYtAnalytics).catch(() => { });

    // 5. Fetch LinkedIn data
    setLiError(null);
    api.getLiProfile().then(setLiProfile).catch(err => {
      if (err.message.includes('not connected')) return;
      setLiError(err.message);
    });
    api.getLiStats().then(setLiStats).catch(() => { });
    api.getLiPosts().then(res => setLiPosts(res.posts || [])).catch(() => { });
  }

  async function syncThenFetch(silent = true) {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await api.syncAnalytics();
      if (!silent) showToast('Analytics synced!', 'success');
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

  // Fetch individual post insights when viewing a post
  const handleViewPostInsights = async (post) => {
    setSelectedPost(post);
    if (!igPostInsights[post.id]) {
      setLoadingInsightsFor(post.id);
      try {
        const insights = await api.getIgPostInsights(post.id);
        setIgPostInsights(prev => ({ ...prev, [post.id]: insights }));
      } catch (err) {
        showToast('Failed to load insights for this post', 'error');
      } finally {
        setLoadingInsightsFor(null);
      }
    }
  };

  const dateRangeLabel = `${format(subDays(new Date(), dateRangeDays), 'MMM d')} - ${format(new Date(), 'MMM d, yyyy')}`;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible"
      className="min-h-screen bg-slate-50 -m-6 p-6 space-y-6">

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Deep performance insights across all your connected platforms.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <button
              onClick={() => setDateDropdown(d => !d)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Calendar size={14} className="text-slate-400" />
              Last {dateRangeDays} Days
              <span className="text-slate-400"></span>
            </button>
            {dateDropdown && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1">
                {[7, 30, 90].map(d => (
                  <button key={d} onClick={() => { setDateRangeDays(d); setDateDropdown(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${dateRangeDays === d ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                    Last {d} Days
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSync} disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60">
            <RefreshCw size={14} className={`text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </motion.div>



      {/* ── Platform Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('instagram')}
          className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-[10px] ${activeTab === 'instagram' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          Instagram
        </button>
        <button
          onClick={() => setActiveTab('facebook')}
          className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-[10px] ${activeTab === 'facebook' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          Facebook
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-[10px] ${activeTab === 'youtube' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          YouTube
        </button>
        <button
          onClick={() => setActiveTab('linkedin')}
          className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-[10px] ${activeTab === 'linkedin' ? 'border-[#0A66C2] text-[#0A66C2]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          LinkedIn
        </button>
      </div>

      {/* ── Instagram Specific Graph API Section ── */}
      {activeTab === 'instagram' && (
        <>
          <motion.div variants={itemVariants} className="pt-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <FaInstagram size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Instagram Deep Dive</h2>
                <p className="text-sm text-slate-500">Live data fetched directly from Meta Graph API</p>
              </div>
            </div>

            {igError ? (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-rose-700 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-bold text-sm">Instagram API Error</p>
                  <p className="text-xs mt-1">{igError}</p>
                </div>
              </div>
            ) : !igProfile ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                {isSyncing ? <RefreshCw size={24} className="animate-spin text-slate-400 mx-auto" /> : <p className="text-sm text-slate-500">Instagram account not connected.</p>}
              </div>
            ) : (
              <div className="space-y-6">

                {/* IG Profile Stats & Reach Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Profile Overview */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-4">Business Account</h3>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <UserPlus size={20} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">@{igProfile.username}</p>
                          <p className="text-xs text-slate-500">Connected to Graph API</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Followers</p>
                        <p className="text-2xl font-black text-slate-900">{fmtNum(igProfile.followersCount)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Media Count</p>
                        <p className="text-2xl font-black text-slate-900">{fmtNum(igProfile.mediaCount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Reach Chart */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-600" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Daily Views</h3>
                          <p className="text-xs text-slate-500">Unique accounts that viewed your content (formerly Reach)</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-[180px] w-full">
                      {paddedIgData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={paddedIgData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={v => format(new Date(v), 'MMM d')}
                              tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickMargin={8} />
                            <YAxis tickFormatter={v => fmtNum(v)}
                              tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickMargin={8} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#f8fafc', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="value" name="Views" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorReach)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                          Insufficient permissions (instagram_manage_insights) or no data.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Posts Grid */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Recent Instagram Media</h3>
                    <p className="text-xs text-slate-500">Click a post to view deeper insights</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                          <th className="py-3 px-5 font-semibold">Post</th>
                          <th className="py-3 px-5 font-semibold text-center">Type</th>
                          <th className="py-3 px-5 font-semibold text-center">Date</th>
                          <th className="py-3 px-5 font-semibold text-right">Likes</th>
                          <th className="py-3 px-5 font-semibold text-right">Comments</th>
                          <th className="py-3 px-5 font-semibold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {igPosts.length > 0 ? igPosts.map(post => (
                          <tr key={post.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200">
                                  {post.mediaUrl ? (
                                    <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      {post.mediaType === 'VIDEO' ? <PlaySquare size={16} /> : <ImageIcon size={16} />}
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 line-clamp-2 max-w-[250px] font-medium leading-relaxed">
                                  {post.caption || <span className="italic text-slate-400">No caption</span>}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-5 text-center">
                              <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                {post.mediaType}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-center text-xs text-slate-500">
                              {format(new Date(post.timestamp), 'MMM d, yyyy')}
                            </td>
                            <td className="py-3 px-5 text-right font-semibold text-slate-700">{fmtNum(post.likeCount)}</td>
                            <td className="py-3 px-5 text-right font-semibold text-slate-700">{fmtNum(post.commentsCount)}</td>
                            <td className="py-3 px-5 text-center">
                              <button onClick={() => handleViewPostInsights(post)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                                View Insights
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-sm text-slate-400">
                              No recent media found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </motion.div>

          {/* Post Insights Modal */}
          <AnimatePresence>
            {selectedPost && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">

                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-900 text-sm">Post Insights</h3>
                    <button onClick={() => setSelectedPost(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex gap-4 mb-6">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 border border-slate-200 overflow-hidden">
                        {selectedPost.mediaUrl ? <img src={selectedPost.mediaUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-4">{selectedPost.caption}</p>
                    </div>

                    {loadingInsightsFor === selectedPost.id ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <RefreshCw className="animate-spin mb-3" size={24} />
                        <span className="text-xs">Fetching Meta insights...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Likes', value: igPostInsights[selectedPost.id]?.likes || selectedPost.likeCount },
                          { label: 'Comments', value: igPostInsights[selectedPost.id]?.comments || selectedPost.commentsCount },
                          { label: 'Views', value: igPostInsights[selectedPost.id]?.reach || 'N/A' },
                          { label: 'Shares', value: igPostInsights[selectedPost.id]?.shares || selectedPost.sharesCount || 0 },
                          { label: 'Saves', value: igPostInsights[selectedPost.id]?.saved || 'N/A' },
                        ].map(m => (
                          <div key={m.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                            <p className="text-lg font-black text-slate-800">{m.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Facebook Specific Graph API Section ── */}
      {activeTab === 'facebook' && (
        <motion.div variants={itemVariants} className="pt-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FaFacebook size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Facebook Deep Dive</h2>
              <p className="text-sm text-slate-500">Live data fetched directly from Meta Graph API</p>
            </div>
          </div>

          {fbError ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-rose-700 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-sm">Facebook API Error</p>
                <p className="text-xs mt-1">{fbError}</p>
              </div>
            </div>
          ) : !fbPage ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              {isSyncing ? <RefreshCw size={24} className="animate-spin text-slate-400 mx-auto" /> : <p className="text-sm text-slate-500">Facebook page not connected.</p>}
            </div>
          ) : (
            <div className="space-y-6">

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Profile Overview */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Facebook Page</h3>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600">
                        <FaFacebook size={24} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">{fbPage.name}</p>
                        <p className="text-xs text-slate-500">Connected to Graph API</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-3">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Followers</p>
                      <p className="text-2xl font-black text-slate-900">{fmtNum(fbPage.followers_count)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Photos</span>
                      <span className="text-sm font-black text-slate-900">{fbPhotos.length}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Videos</span>
                      <span className="text-sm font-black text-slate-900">{fbVideos.length}</span>
                    </div>
                  </div>
                </div>

                {/* Insights Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center items-center text-center">
                  {!fbInsights?.available ? (
                    <div className="max-w-sm">
                      <BarChart3 size={32} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-bold text-slate-900 mb-1">Insights Unavailable</p>
                      <p className="text-xs text-slate-500">{fbInsights?.message || "Analytics will appear once the Facebook Page receives audience engagement."}</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-4 self-start">
                        <ThumbsUp className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-900">Page Likes Trend</h3>
                      </div>
                      <div className="flex-1 min-h-[180px] w-full">
                        {fbChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={fbChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorFbLikes" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#1877F2" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')}
                                axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickMargin={8} />
                              <YAxis tickFormatter={(v) => fmtNum(v)}
                                axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickMargin={8} />
                              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#f8fafc', strokeWidth: 2 }} />
                              <Area type="monotone" dataKey="value" name="Likes" stroke="#1877F2" strokeWidth={2} fillOpacity={1} fill="url(#colorFbLikes)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                            No historical data available.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Posts Grid */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Recent Facebook Feed</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="py-3 px-5 font-semibold">Post Message</th>
                        <th className="py-3 px-5 font-semibold text-center">Date</th>
                        <th className="py-3 px-5 font-semibold text-right">Likes</th>
                        <th className="py-3 px-5 font-semibold text-right">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fbFeed.length > 0 ? fbFeed.map(post => (
                        <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <p className="text-xs text-slate-700 line-clamp-2 max-w-[400px] font-medium leading-relaxed">
                              {post.message || <span className="italic text-slate-400">No message content</span>}
                            </p>
                          </td>
                          <td className="py-3 px-5 text-center text-xs text-slate-500">
                            {format(new Date(post.created_time), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-5 text-right font-semibold text-slate-700">{fmtNum(post.likes)}</td>
                          <td className="py-3 px-5 text-right font-semibold text-slate-700">{fmtNum(post.comments)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-sm text-slate-400">
                            No recent feed posts found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}

      {/* ── YouTube Specific API Section ── */}
      {activeTab === 'youtube' && (
        <motion.div variants={itemVariants} className="pt-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <FaYoutube size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">YouTube Deep Dive</h2>
              <p className="text-sm text-slate-500">Live data fetched directly from YouTube Data &amp; Analytics API</p>
            </div>
          </div>

          {ytError ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-rose-700 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-sm">YouTube API Error</p>
                <p className="text-xs mt-1">{ytError}</p>
              </div>
            </div>
          ) : !ytChannel ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              {isSyncing ? <RefreshCw size={24} className="animate-spin text-slate-400 mx-auto" /> : <p className="text-sm text-slate-500">YouTube channel not connected.</p>}
            </div>
          ) : (
            <div className="space-y-6">

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Channel Overview */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between lg:col-span-1">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Channel</h3>
                    <div className="flex items-center gap-3 mb-6">
                      {ytChannel.thumbnail ? (
                        <img src={ytChannel.thumbnail} alt={ytChannel.name} className="w-12 h-12 rounded-full border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-red-600">
                          <FaYoutube size={24} />
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-bold text-slate-900 line-clamp-1">{ytChannel.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subscribers</p>
                      <p className="text-xl font-black text-slate-900">{fmtNum(ytChannel.subscribers_count)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Videos</p>
                      <p className="text-xl font-black text-slate-900">{fmtNum(ytChannel.total_videos)}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Total Views</span>
                    <span className="text-sm font-black text-slate-900">{fmtNum(ytChannel.total_views)}</span>
                  </div>
                </div>

                {/* Analytics Section */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Last {dateRangeDays} Days Analytics</h3>
                  {!ytAnalytics ? (
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <RefreshCw size={24} className="animate-spin text-slate-300 mx-auto" />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col gap-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">New Views</p>
                          <p className="text-xl font-black text-slate-900 text-center">{fmtNum(ytAnalytics.views)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Watch Mins</p>
                          <p className="text-xl font-black text-slate-900 text-center">{fmtNum(ytAnalytics.watchTime)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Likes</p>
                          <p className="text-xl font-black text-slate-900 text-center">{fmtNum(ytAnalytics.likes)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">New Subs</p>
                          <p className="text-xl font-black text-slate-900 text-center">{fmtNum(ytAnalytics.subscriberGrowth)}</p>
                        </div>
                      </div>

                      <div className="flex-1 min-h-[250px]">
                        {paddedYtData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={paddedYtData}>
                              <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                dy={10}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                dx={-10}
                                allowDecimals={false}
                                domain={[0, 'auto']}
                              />
                              <RechartsTooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
                                labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                              />
                              <Area type="monotone" dataKey="views" name="Views" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">No data for selected period</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── LinkedIn Deep Dive Section ── */}
      {activeTab === 'linkedin' && (
        <motion.div variants={itemVariants} className="pt-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shadow-md">
              <FaLinkedin size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">LinkedIn Deep Dive</h2>
              <p className="text-sm text-slate-500">Live profile, posts &amp; engagement data from LinkedIn API</p>
            </div>
          </div>

          {liError ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-rose-700 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-sm">LinkedIn Permission Error</p>
                <p className="text-xs mt-1">
                  {liError.includes('Not enough permissions') || liError.includes('NO_VERSION') || liError.includes('permission') || liError.includes('unauthorized')
                    ? 'No permission is given for LinkedIn profile access. Please reconnect your account.'
                    : liError}
                </p>
              </div>
            </div>
          ) : !liProfile ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              {isSyncing
                ? <RefreshCw size={24} className="animate-spin text-slate-400 mx-auto" />
                : <p className="text-sm text-slate-500">LinkedIn account not connected. Connect it in the Accounts page.</p>
              }
            </div>
          ) : (
            <div className="space-y-6">

              {/* Profile + Engagement Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Profile</h3>
                  <div className="flex items-center gap-3 mb-6">
                    {liProfile.pictureUrl ? (
                      <img src={liProfile.pictureUrl} alt="LinkedIn profile" className="w-14 h-14 rounded-full border-2 border-[#0A66C2]/20 object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#0A66C2]/10 border border-[#0A66C2]/20 flex items-center justify-center text-[#0A66C2]">
                        <FaLinkedin size={24} />
                      </div>
                    )}
                    <div>
                      <p className="text-base font-bold text-slate-900">{liProfile.firstName} {liProfile.lastName}</p>
                      {liProfile.headline && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{liProfile.headline}</p>
                      )}
                      {liProfile.vanityName && (
                        <a
                          href={`https://www.linkedin.com/in/${liProfile.vanityName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#0A66C2] hover:underline mt-1 flex items-center gap-1"
                        >
                          <ExternalLink size={10} />
                          linkedin.com/in/{liProfile.vanityName}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Connections</p>
                      <p className="text-2xl font-black text-slate-900">{fmtNum(liProfile.connectionCount || 0)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Posts</p>
                      <p className="text-2xl font-black text-slate-900">{fmtNum(liStats?.totalPosts || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Engagement Stats + Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-4 h-4 text-[#0A66C2]" />
                    <h3 className="text-sm font-bold text-slate-900">Engagement Overview</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Total Reactions', value: liStats?.totalReactions || 0, icon: <ThumbsUp size={16} />, color: 'text-[#0A66C2] bg-[#0A66C2]/10' },
                      { label: 'Total Comments', value: liStats?.totalComments || 0, icon: <MessageCircle size={16} />, color: 'text-emerald-600 bg-emerald-50' },
                      { label: 'Total Shares', value: liStats?.totalShares || 0, icon: <Share2 size={16} />, color: 'text-purple-600 bg-purple-50' },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}>{m.icon}</div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
                        <p className="text-2xl font-black text-slate-900">{fmtNum(m.value)}</p>
                      </div>
                    ))}
                  </div>

                  {liPosts.length > 0 ? (
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-3">Reactions per Post (recent 10)</p>
                      <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={liPosts.slice(0, 10).map((p, i) => ({ name: `Post ${i + 1}`, reactions: p.reactions, comments: p.comments, shares: p.shares }))}
                            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Bar dataKey="reactions" name="Reactions" fill="#0A66C2" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="comments" name="Comments" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="shares" name="Shares" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[140px] text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                      No post data available yet. Sync to refresh.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Posts Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Recent LinkedIn Posts</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Live data - reactions, comments &amp; shares per post</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="py-3 px-5 font-semibold">Post Content</th>
                        <th className="py-3 px-5 font-semibold text-center">Date</th>
                        <th className="py-3 px-5 font-semibold text-right">Reactions</th>
                        <th className="py-3 px-5 font-semibold text-right">Comments</th>
                        <th className="py-3 px-5 font-semibold text-right">Shares</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {liPosts.length > 0 ? liPosts.map(post => (
                        <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <p className="text-xs text-slate-700 line-clamp-2 max-w-[360px] font-medium leading-relaxed">
                              {post.text || <span className="italic text-slate-400">No text content</span>}
                            </p>
                          </td>
                          <td className="py-3 px-5 text-center text-xs text-slate-500 whitespace-nowrap">
                            {format(new Date(post.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A66C2]">
                              <ThumbsUp size={11} /> {fmtNum(post.reactions)}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <MessageCircle size={11} /> {fmtNum(post.comments)}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600">
                              <Share2 size={11} /> {fmtNum(post.shares)}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-sm text-slate-400">
                            No recent posts found. Make sure your LinkedIn account is connected and synced.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}

    </motion.div >
  );
}
