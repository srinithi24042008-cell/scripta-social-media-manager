// API base URL: supports separate-origin deployment via VITE_API_URL build-time env var.
// In dev (Vite proxy): VITE_API_URL is not set, falls back to '/api' (proxied by vite.config.js).
// In production with separate domains: set VITE_API_URL=https://api.yourdomain.com in your build env.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export { BASE };

function getToken() {
  return localStorage.getItem('scripta_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('scripta_token', token);
  else localStorage.removeItem('scripta_token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const workspaceId = localStorage.getItem('scripta_active_workspace_id') || 'personal';
  headers['X-Workspace-Id'] = workspaceId;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (email, password, name) => request('/auth/register', { method: 'POST', body: { email, password, name } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  googleAuth: (access_token) => request('/auth/google', { method: 'POST', body: { access_token } }),
  googleCredentialsAuth: (email, password) => request('/auth/google-credentials', { method: 'POST', body: { email, password } }),
  savePlatforms: (platforms) => request('/auth/platforms', { method: 'PUT', body: { platforms } }),
  me: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (email, code, newPassword) => request('/auth/reset-password', { method: 'POST', body: { email, code, newPassword } }),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
  changePassword: (currentPassword, newPassword) => request('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } }),
  updateNotificationPreferences: (prefs) => request('/auth/notification-preferences', { method: 'PUT', body: prefs }),

  getBrand: () => request('/brand'),
  updateBrand: (profile) => request('/brand', { method: 'PUT', body: profile }),

  getAccounts: () => request('/accounts'),
  getAccountsConfig: () => request('/accounts/config'),
  getAccountsConfigDetails: () => request('/accounts/config/details'),
  saveAccountsConfig: (platform, client_id, client_secret, meta_app_id, app_id) => request('/accounts/config', { method: 'POST', body: { platform, client_id, client_secret, meta_app_id, app_id } }),
  testAccountsConfig: (platform, client_id, client_secret, meta_app_id, app_id) => request('/accounts/config/test', { method: 'POST', body: { platform, client_id, client_secret, meta_app_id, app_id } }),
  deleteAccountsConfig: (platform) => request(`/accounts/config/${platform}`, { method: 'DELETE' }),
  connectAccount: (platform, handle, app_password) => request('/accounts', { method: 'POST', body: { platform, handle, app_password } }),
  getOAuthConnectUrl: (platform, workspaceId) => request(`/accounts/connect-url/${platform}`, { method: 'POST', body: { workspaceId } }),
  disconnectAccount: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),

  getNotifications: (type) => request(`/notifications${type ? `?type=${type}` : ''}`),
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationsRead: () => request('/notifications/read', { method: 'POST' }),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  clearAllNotifications: () => request('/notifications', { method: 'DELETE' }),

  getPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts${qs ? `?${qs}` : ''}`);
  },
  generatePosts: (idea, platforms) => request('/posts/generate', { method: 'POST', body: { idea, platforms } }),
  // Returns { post, posts } — posts is an array (one per platform for multi-platform)
  createPost: (post) => request('/posts', { method: 'POST', body: post }),
  updatePost: (id, post) => request(`/posts/${id}`, { method: 'PUT', body: post }),
  publishNow: (id) => request(`/posts/${id}/publish-now`, { method: 'POST' }),
  // Publish all posts in a multi-platform batch — returns array of results
  publishMultiNow: async (postIds) => {
    const results = await Promise.allSettled(
      postIds.map((id) => request(`/posts/${id}/publish-now`, { method: 'POST' }))
    );
    return results.map((r, i) => ({
      postId: postIds[i],
      success: r.status === 'fulfilled',
      result: r.status === 'fulfilled' ? r.value : null,
      error: r.status === 'rejected' ? r.reason?.message : null,
    }));
  },
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),

  // Media uses multipart/form-data, so it bypasses the JSON `request` helper.
  uploadMedia: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    return data;
  },
  fitMedia: (filename, platform, mimetype, publicId) =>
    request(`/media/${filename}/fit`, { method: 'POST', body: { platform, mimetype, publicId } }),
  generateMedia: (prompt, type = 'image', duration, imageUrl) => request('/media/generate', { method: 'POST', body: { prompt, type, duration, imageUrl } }),
  generateVideoFal: (prompt, imageUrl, duration) => request('/ai/video/generate', { method: 'POST', body: { prompt, imageUrl, duration } }),
  checkVideoGenerationStatus: (requestId) => request(`/ai/video/status/${requestId}`),
  saveMediaFromUrl: (url, mediaType = 'video', filename) => request('/media/save-from-url', { method: 'POST', body: { url, mediaType, filename } }),

  // ── Smart Scheduling ─────────────────────────────────────────────────
  getSmartSchedule: (platform, timezone) => {
    const qs = new URLSearchParams({ platform, timezone }).toString();
    return request(`/posts/smart-schedule?${qs}`);
  },

  // ── AI Studio ────────────────────────────────────────────────────────
  aiAction: (action, content, tone, platform) =>
    request('/ai/action', { method: 'POST', body: { action, content, tone, platform } }),
  compilePackage: (prompt, platform, tone, language) =>
    request('/ai/compile-package', { method: 'POST', body: { prompt, platform, tone, language } }),
  generateText: (prompt, platform, tone, language, length, creativity) =>
    request('/ai/text/generate', { method: 'POST', body: { prompt, platform, tone, language, length, creativity } }),
  generateImageImagen: (prompt, aspectRatio, style, sampleCount) =>
    request('/ai/image/generate', { method: 'POST', body: { prompt, aspectRatio, style, sampleCount } }),
  generateSpeechTTS: (text, language, speed, voice, emotion) =>
    request('/ai/audio/tts', { method: 'POST', body: { text, language, speed, voice, emotion } }),
  processAudioUpload: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('audio', file);
    const res = await fetch(`${BASE}/ai/audio/process`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Audio analysis failed');
    return data;
  },

  aiAnalyzeImage: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/ai/analyze-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Image analysis failed');
    return data;
  },

  aiFromImage: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/ai/from-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'AI processing failed');
    return data;
  },

  getAiInsights: (analyticsData) =>
    request('/ai/insights', { method: 'POST', body: { analyticsData } }),

  // ── Analytics ────────────────────────────────────────────────────────
  getAnalyticsDashboard: (startDate, endDate) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);
    const query = qs.toString();
    return request(`/analytics/dashboard${query ? `?${query}` : ''}`);
  },
  syncAnalytics: () => request('/analytics/sync', { method: 'POST' }),

  // ── Instagram Live API ───────────────────────────────────────────────
  getIgProfile: () => request('/social/instagram/profile'),
  getIgAccountInsights: (startDate, endDate) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);
    return request(`/social/instagram/account-insights${qs.toString() ? `?${qs.toString()}` : ''}`);
  },
  getIgPosts: () => request('/social/instagram/posts'),
  getIgPostInsights: (mediaId) => request(`/social/instagram/posts/${mediaId}/insights`),

  // ── Facebook Live API ────────────────────────────────────────────────
  getFbPage: () => request('/facebook/page'),
  getFbPosts: () => request('/facebook/posts'),
  getFbFeed: () => request('/facebook/feed'),
  getFbPhotos: () => request('/facebook/photos'),
  getFbVideos: () => request('/facebook/videos'),
  getFbInsights: (startDate, endDate) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);
    return request(`/facebook/insights${qs.toString() ? `?${qs.toString()}` : ''}`);
  },

  // ── YouTube Live API ─────────────────────────────────────────────────
  getYtChannel: () => request('/analytics/youtube/channel'),
  getYtAnalytics: (startDate, endDate) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);
    return request(`/analytics/youtube/analytics${qs.toString() ? `?${qs.toString()}` : ''}`);
  },
  
  // ── LinkedIn Live API ────────────────────────────────────────────────
  getLiProfile: () => request('/linkedin/profile'),
  getLiStats: () => request('/linkedin/stats'),
  getLiPosts: () => request('/linkedin/posts'),

  // ── Organizations & Team Workspaces ──────────────────────────────────
  createOrg: (name) => request('/organizations', { method: 'POST', body: { name } }),
  getOrgs: () => request('/organizations'),
  joinOrg: (inviteCode) => request('/organizations/join', { method: 'POST', body: { inviteCode } }),
  leaveOrg: (id) => request(`/organizations/${id}/leave`, { method: 'POST' }),
  deleteOrg: (id) => request(`/organizations/${id}`, { method: 'DELETE' }),
  getMembers: (id) => request(`/organizations/${id}/members`),
  updateMemberRole: (id, memberUserId, role) => request(`/organizations/${id}/members/${memberUserId}`, { method: 'PUT', body: { role } }),
  removeMember: (id, memberUserId) => request(`/organizations/${id}/members/${memberUserId}`, { method: 'DELETE' }),
  regenerateInviteCode: (id) => request(`/organizations/${id}/invite/regenerate`, { method: 'POST' }),

  // ── Post Approval Flow ────────────────────────────────────────────────
  approvePost: (postId) => request(`/posts/${postId}/approve`, { method: 'POST' }),
  rejectPost: (postId) => request(`/posts/${postId}/reject`, { method: 'POST' }),
};

// Video-related helper
export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}
