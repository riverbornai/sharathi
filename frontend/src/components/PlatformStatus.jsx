import { useState, useEffect } from 'react';

function PlatformStatus() {
  const [statuses, setStatuses] = useState({});
  const [connectedPages, setConnectedPages] = useState([]);
  const [backendRedirectUri, setBackendRedirectUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = () => {
    fetch('/api/platforms/status')
      .then((r) => r.json())
      .then((data) => {
        setStatuses(data.platforms || {});
        setConnectedPages(data.connectedPages || []);
        setBackendRedirectUri(data.redirectUri || '');
      })
      .catch(() => {
        setStatuses({});
        setConnectedPages([]);
        setBackendRedirectUri('');
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const frontendRedirectUri = `${window.location.origin}/facebook-callback`;
  const resolvedRedirectUri = backendRedirectUri || frontendRedirectUri;

  const isHttps = resolvedRedirectUri.startsWith('https:');
  const isLocalhost = resolvedRedirectUri.includes('localhost') || resolvedRedirectUri.includes('127.0.0.1');
  const doesMatch = !backendRedirectUri || (() => {
    try {
      return new URL(backendRedirectUri).host === window.location.host;
    } catch (e) {
      return false;
    }
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(resolvedRedirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = () => {
    // Redirects directly to Backend Facebook OAuth 2.0 Auth flow
    window.location.href = '/api/platforms/facebook/auth';
  };

  const handleDisconnect = async (pageId) => {
    if (!confirm('Are you sure you want to disconnect this Facebook Page?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/platforms/facebook/pages/${pageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchStatus();
      } else {
        alert('Failed to disconnect page');
      }
    } catch (err) {
      console.error(err);
      alert('Error disconnecting page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 rounded-2xl border border-border bg-surface-panel backdrop-blur-lg">
      <div>
        <h2 className="text-base text-mist/80 font-medium mb-3">Connected Platforms</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-border text-frost">
            <span
              className={`w-2 h-2 rounded-full ${
                statuses.facebook ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'
              }`}
            />
            Facebook
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 pt-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-semibold text-frost">Facebook Page Manager</h3>
            <p className="text-xs text-mist/60">Connect dynamic Facebook Pages to orchestrate AI responses</p>
          </div>
          <button
            onClick={handleConnect}
            className="px-3.5 py-2 bg-gradient-to-br from-[#1877F2] to-[#166FE5] text-white rounded-lg text-xs font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 shadow-[0_4px_12px_rgba(24,119,242,0.3)]"
          >
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Connect Page
          </button>
        </div>

        {connectedPages.length === 0 ? (
          <div className="px-4 py-6 border border-dashed border-border/80 rounded-xl text-center text-xs text-mist/50">
            No dynamic Facebook Pages connected yet. Click "Connect Page" to login and authorize.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
            {connectedPages.map((page) => (
              <div
                key={page.pageId}
                className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
              >
                <div>
                  <div className="text-xs font-bold text-frost">{page.name}</div>
                  <div className="text-[10px] text-mist/50">Page ID: {page.pageId}</div>
                </div>
                <button
                  onClick={() => handleDisconnect(page.pageId)}
                  disabled={loading}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Disconnect Page"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. OAuth Redirect URI Validator */}
      <div className="border-t border-border/60 pt-5">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-frost">OAuth Redirect URI Validator</h3>
          <p className="text-xs text-mist/60 mt-1 leading-relaxed">
            Ensure your exact redirect URL is white-listed in your <b className="text-frost">Meta App Dashboard &gt; Facebook Login &gt; Settings &gt; Valid OAuth Redirect URIs</b>.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Resolved URI Display */}
          <div className="flex items-center gap-2 p-2 bg-black/35 rounded-xl border border-border">
            <span className="text-[11px] font-mono text-mist/90 break-all select-all flex-1 px-1.5 py-1">
              {resolvedRedirectUri}
            </span>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-frost border border-white/10'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Validation Status Badges */}
          <div className="flex flex-wrap gap-2 mt-1">
            {/* Protocol Badge */}
            {isHttps ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ✓ Secure HTTPS (Meta Approved)
              </span>
            ) : isLocalhost ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                ✓ Localhost (HTTP Allowed by Meta)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                ⚠ Warning: Unsecure HTTP (Meta Blocked)
              </span>
            )}

            {/* Match Status Badge */}
            {doesMatch ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                ✓ Host Match (Frontend & Backend Aligned)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                ⚠ Host Mismatch: Server expects {backendRedirectUri ? new URL(backendRedirectUri).host : 'another origin'}
              </span>
            )}
          </div>

          {/* Context Warning / Alert */}
          {!doesMatch && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 leading-relaxed">
              <b>Notice:</b> You are browsing from <code>{window.location.origin}</code> but the backend is configured to redirect to <code>{backendRedirectUri ? new URL(backendRedirectUri).origin : 'another origin'}</code>.
              To override and align this, set the <code>META_REDIRECT_URI</code> variable in your backend <code>.env</code> file.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlatformStatus;
