// composeApi.js — All API calls for the Compose page
// Uses the same fetch-based pattern as the main api.js

const BASE = '/api';

function getToken() {
  return localStorage.getItem('scripta_token') || localStorage.getItem('scripta_token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 
    'Content-Type': 'application/json',
    'X-Workspace-Id': localStorage.getItem('scripta_active_workspace_id') || 'personal'
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

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

async function multipartRequest(path, formData) {
  const token = getToken();
  const headers = {
    'X-Workspace-Id': localStorage.getItem('scripta_active_workspace_id') || 'personal'
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

// ── AI Caption Generation ────────────────────────────────────────────────────
export const generateCaption = (params) =>
  request('/ai/generate-caption', { method: 'POST', body: params });

// ── AI Hashtag Generation ────────────────────────────────────────────────────
export const generateHashtags = (params) =>
  request('/ai/generate-hashtags', { method: 'POST', body: params });

// ── AI Content Score ─────────────────────────────────────────────────────────
export const getContentScore = (params) =>
  request('/ai/content-score', { method: 'POST', body: params });

// ── AI Platform-specific Content ─────────────────────────────────────────────
export const generatePlatformContent = (params) =>
  request('/ai/platform-content', { method: 'POST', body: params });

// ── AI Best Posting Time ─────────────────────────────────────────────────────
export const getBestPostingTime = (params) =>
  request('/ai/best-time', { method: 'POST', body: params });

// ── AI Caption Improvement ───────────────────────────────────────────────────
export const improveCaption = (action, content, tone, platform) =>
  request('/ai/action', { method: 'POST', body: { action, content, tone, platform } });

// ── AI Image Analysis ────────────────────────────────────────────────────────
export const analyzeImageFromFile = async (file) => {
  const form = new FormData();
  form.append('image', file);
  return multipartRequest('/ai/analyze-image', form);
};

export const analyzeImageFull = async (file) => {
  const form = new FormData();
  form.append('image', file);
  return multipartRequest('/ai/from-image', form);
};

// ── Media Upload ─────────────────────────────────────────────────────────────
export const uploadMedia = async (file) => {
  const form = new FormData();
  form.append('file', file);
  return multipartRequest('/media/upload', form);
};

// ── Posts / Drafts ───────────────────────────────────────────────────────────
export const getDrafts = (params = {}) => {
  const qs = new URLSearchParams({ status: 'draft', ...params }).toString();
  return request(`/posts?${qs}`);
};

export const getScheduledPosts = () => {
  const qs = new URLSearchParams({ status: 'scheduled' });
  return request(`/posts?${qs.toString()}`);
};

export const saveDraft = (data) =>
  request('/posts', { method: 'POST', body: { ...data, status: 'draft' } });

export const updateDraft = (id, data) =>
  request(`/posts/${id}`, { method: 'PUT', body: data });

export const deleteDraft = (id) =>
  request(`/posts/${id}`, { method: 'DELETE' });

export const publishPost = (id) =>
  request(`/posts/${id}/publish-now`, { method: 'POST' });

export const schedulePost = (id, scheduledAt, timezone) =>
  request(`/posts/${id}`, {
    method: 'PUT',
    body: { scheduled_at: scheduledAt, timezone, status: 'scheduled' },
  });

export const createPost = (data) =>
  request('/posts', { method: 'POST', body: data });

// ── Smart Schedule (Gemini AI powered) ──────────────────────────────────────
export const getSmartSchedule = (platform, timezone, caption = '') => {
  const params = { platform, timezone };
  if (caption) params.caption = caption;
  const qs = new URLSearchParams(params).toString();
  return request(`/posts/smart-schedule?${qs}`);
};

// ── Connected Accounts ───────────────────────────────────────────────────────
export const getAccounts = () => {
  return request('/accounts');
};

// ── Brand Voice ──────────────────────────────────────────────────────────────
export const getBrand = () => request('/brand');
