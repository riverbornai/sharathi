import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import MessagesPage from './components/MessagesPage';
import RiverbornMark from './components/RiverbornMark';

function getRouteFromPath(pathname) {
  return pathname === '/messages' ? 'messages' : 'dashboard';
}

function App() {
  const [callbackState, setCallbackState] = useState({
    processing: false,
    success: false,
    error: null
  });
  const [route, setRoute] = useState(() => getRouteFromPath(window.location.pathname));

  useEffect(() => {
    // Check if we are on the facebook callback redirect path
    if (window.location.pathname === '/facebook-callback') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        setCallbackState({ processing: true, success: false, error: null });

        // Fetch backend callback endpoint directly via POST request
        fetch('/api/platforms/facebook/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        })
          .then((res) => {
            if (!res.ok) {
              return res.json().then((data) => {
                throw new Error(data.error || 'Failed to exchange Facebook authentication code.');
              });
            }
            return res.json();
          })
          .then((data) => {
            setCallbackState({ processing: false, success: true, error: null });
            // Clean up the URL query params and path without full browser reload
            window.history.replaceState({}, document.title, '/');
          })
          .catch((err) => {
            setCallbackState({ processing: false, success: false, error: err.message });
          });
      } else {
        const errorMsg = params.get('error_description') || 'Authentication was canceled or failed.';
        setCallbackState({ processing: false, success: false, error: errorMsg });
      }
    }
  }, []);

  // Keep the page in sync with browser back/forward navigation.
  useEffect(() => {
    const onPopState = () => setRoute(getRouteFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    setRoute(getRouteFromPath(path));
  }, []);

  // Render Callback loading/success/error UI if we are processing the OAuth redirection
  if (window.location.pathname === '/facebook-callback' || callbackState.processing || callbackState.error || callbackState.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-header text-frost p-6">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface-panel backdrop-blur-lg flex flex-col items-center text-center gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <div className="w-16 h-16 bg-[#1877F2]/10 rounded-2xl flex items-center justify-center text-[#1877F2] shadow-[0_4px_20px_rgba(24,119,242,0.2)]">
            <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>

          {callbackState.processing && (
            <>
              <h2 className="text-xl font-bold">Connecting Your Facebook Pages</h2>
              <p className="text-sm text-mist/70">Please hold on while we exchange credentials and subscribe your pages to our agent webhooks.</p>
              <div className="w-8 h-8 border-4 border-lime border-t-transparent rounded-full animate-spin mt-2"></div>
            </>
          )}

          {callbackState.success && (
            <>
              <h2 className="text-xl font-bold text-emerald-400">Connection Successful!</h2>
              <p className="text-sm text-mist/70">Your Facebook Page has been successfully authorized and integrated with your AI agent.</p>
              <button
                onClick={() => {
                  setCallbackState({ processing: false, success: false, error: null });
                  window.location.href = '/';
                }}
                className="w-full py-3 bg-gradient-to-br from-accent to-accent-light text-forest rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,245,60,0.4)] active:translate-y-0 transition-all mt-2"
              >
                Go to Dashboard
              </button>
            </>
          )}

          {callbackState.error && (
            <>
              <h2 className="text-xl font-bold text-red-400">Connection Failed</h2>
              <p className="text-sm text-mist/70">{callbackState.error}</p>
              <button
                onClick={() => {
                  setCallbackState({ processing: false, success: false, error: null });
                  window.location.href = '/';
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/15 text-frost rounded-xl font-semibold border border-border transition-colors mt-2"
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-midnight">
      <header className="px-8 py-5 flex justify-between items-center border-b border-border bg-surface-header backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <RiverbornMark size={38} className="shadow-[0_4px_20px_rgba(212,245,60,0.25)] rounded-[10px]" />
          <div className="flex flex-col leading-tight">
            <h1 className="text-xl font-bold tracking-tight text-frost">Sharathi</h1>
            <span className="text-[10px] font-semibold tracking-wider text-mist/70 uppercase">by Riverborn</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 p-1 rounded-xl bg-black/20 border border-border">
          <button
            onClick={() => navigate('/')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              route === 'dashboard' ? 'bg-lime text-forest' : 'text-mist/70 hover:text-frost'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/messages')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              route === 'messages' ? 'bg-lime text-forest' : 'text-mist/70 hover:text-frost'
            }`}
          >
            Messages
          </button>
        </nav>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {route === 'messages' ? <MessagesPage /> : <Dashboard />}
      </div>

      <footer className="px-8 py-3 text-center text-[11px] text-mist/50 border-t border-border/60 flex-shrink-0">
        Built by <span className="text-lime font-semibold">Riverborn</span>
      </footer>
    </div>
  );
}

export default App;
