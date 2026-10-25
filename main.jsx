import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// GoogleOAuthProvider removed from here — now lazy-loaded in App.jsx
// only when the user actually opens the Auth screen. This removes the
// @react-oauth/google package AND the /gsi/client Google SDK (97 KiB)
// from the initial load for every unauthenticated landing-page visitor.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
