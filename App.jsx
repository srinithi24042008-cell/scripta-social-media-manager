import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import { ToastProvider, useToast } from './components/Toast';
import { api, setToken } from './api';

// ── Code Splitting Strategy ───────────────────────────────────────────────────
// Layout (120 KiB) is only needed for authenticated users, so lazy-load it.
// This removes it entirely from the critical path for the landing page.
const Layout = lazy(() => import('./components/Layout'));

// RealtimeNotificationProvider only initialises when user is authenticated.
// Importing it lazily avoids loading Socket.IO for every unauthenticated visitor.
const RealtimeNotificationProvider = lazy(() =>
  import('./contexts/NotificationProvider').then(m => ({ default: m.RealtimeNotificationProvider }))
);

// GoogleOAuthProvider — lazy-loaded only when the Auth screen is opened.
// This defers loading @react-oauth/google AND the Google /gsi/client script
// (97 KiB third-party) away from the landing page entirely.
const GoogleOAuthProviderLazy = lazy(() =>
  import('@react-oauth/google').then(m => ({
    default: ({ children }) => {
      const [clientId, setClientId] = useState(() => {
        const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        return envId ? String(envId).trim().replace(/^["']|["']$/g, '') : null;
      });

      useEffect(() => {
        if (!clientId) {
          fetch('/api/auth/google/client-id')
            .then(res => res.json())
            .then(data => {
              if (data.client_id) {
                setClientId(String(data.client_id).trim().replace(/^["']|["']$/g, ''));
              }
            })
            .catch(() => {});
        }
      }, [clientId]);

      if (!clientId) {
        return <>{children}</>;
      }

      return (
        <m.GoogleOAuthProvider clientId={clientId}>
          {children}
        </m.GoogleOAuthProvider>
      );
    },
  }))
);

// Authenticated application routes — all lazy-loaded
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Compose = lazy(() => import('./pages/Compose'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Drafts = lazy(() => import('./pages/Drafts'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AnalyticsPlatform = lazy(() => import('./pages/AnalyticsPlatform'));
const Aistudio = lazy(() => import('./pages/Aistudio'));
const TeamHub = lazy(() => import('./pages/TeamHub'));

// ── Public (unauthenticated) legal pages ─────────────────────────────────────
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const DataDeletion = lazy(() => import('./pages/legal/DataDeletion'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading Scripta...</span>
      </div>
    </div>
  );
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const showToast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthError = () => {
      logout();
      showToast('Session expired. Please log in again.', 'error');
    };
    window.addEventListener('auth_error', handleAuthError);

    const hasToken = !!localStorage.getItem('scripta_token');
    if (hasToken) {
      setUser({});
      api.me()
        .then(res => {
          if (res.user) setUser(res.user);
        })
        .catch(() => {
          // Token might be invalid, auth error interceptor will handle it
        });
      
      const params = new URLSearchParams(location.search);
      const errorParam = params.get('error');
      const connectedParam = params.get('connected');

      if (errorParam) {
        const errorMsg = decodeURIComponent(errorParam.replace(/\+/g, ' '));
        sessionStorage.setItem('oauth_error', errorMsg);
        showToast(errorMsg, 'error');
        navigate(location.pathname, { replace: true });
      } else if (connectedParam) {
        sessionStorage.setItem('oauth_connected', 'true');
        showToast('Account connected successfully!', 'success');
        navigate(location.pathname, { replace: true });
      }
    }
    setCheckedSession(true);

    return () => {
      window.removeEventListener('auth_error', handleAuthError);
    };
  }, []);

  function logout() {
    setToken(null);
    localStorage.removeItem('scripta_token');
    setUser(null);
    setShowAuth(false);
    navigate('/');
  }

  if (!checkedSession) return null;

  // ── Unauthenticated paths ──────────────────────────────────────────────────
  // Neither Layout nor NotificationProvider (Socket.IO) load here.
  // Legal pages are always public — check route first before auth state.
  if (!user) {
    // Public legal routes — accessible without authentication
    const publicLegal = [
      { path: '/privacy', Component: PrivacyPolicy },
      { path: '/terms', Component: TermsOfService },
      { path: '/data-deletion', Component: DataDeletion },
    ];
    const matched = publicLegal.find((r) => location.pathname === r.path);
    if (matched) {
      const { Component } = matched;
      return (
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      );
    }

    if (!showAuth) {
      return (
        <Home 
          onGetStarted={() => { setAuthMode('register'); setShowAuth(true); }} 
          onSignIn={() => { setAuthMode('login'); setShowAuth(true); }} 
          onSignUp={() => { setAuthMode('register'); setShowAuth(true); }} 
        />
      );
    }
    return (
      <Suspense fallback={<PageLoader />}>
        <GoogleOAuthProviderLazy>
          <Auth initialMode={authMode} onAuthed={setUser} onBack={() => setShowAuth(false)} />
        </GoogleOAuthProviderLazy>
      </Suspense>
    );
  }

  // ── Authenticated app — Layout + NotificationProvider load now ─────────────
  return (
    <Suspense fallback={<PageLoader />}>
      <RealtimeNotificationProvider>
        <Layout onLogout={logout} user={user}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard onNavigate={(path) => navigate(`/${path}`)} />} />
              <Route path="/compose" element={<Compose onSaved={() => navigate('/dashboard')} />} />
              <Route path="/ai-studio" element={<Aistudio />} />
              <Route path="/calendar" element={<Calendar onNavigate={(path) => navigate(`/${path}`)} />} />
              <Route path="/drafts" element={<Drafts />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/analytics" element={<AnalyticsPlatform />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings onUserUpdate={setUser} />} />
              <Route path="/team-hub" element={<TeamHub />} />
              {/* ── Public legal pages (also accessible when authenticated) ── */}
              <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>} />
              <Route path="/data-deletion" element={<Suspense fallback={<PageLoader />}><DataDeletion /></Suspense>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </RealtimeNotificationProvider>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </BrowserRouter>
  );
}
