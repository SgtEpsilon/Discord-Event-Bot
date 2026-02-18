// oauth-routes.js - Google OAuth routes mounted at /api by web-server.js
// Endpoints consumed by public/script.js:
//   GET  /api/oauth/google/status        — is OAuth configured in .env?
//   GET  /api/oauth/google/user-status   — is a Google account connected?
//   POST /api/oauth/google/login         — start OAuth flow, return redirect URL
//   GET  /api/oauth/google/callback      — Google redirects here with ?code=...
//   POST /api/oauth/google/logout        — disconnect Google account
//   GET  /api/oauth/google/calendars     — list calendars for the connected account

const express = require('express');
const router  = express.Router();

// Lazy-load GoogleOAuth so the route file loads even if env vars are missing at startup
let _oauthInstance = null;
function getOAuth() {
  if (!_oauthInstance) {
    const GoogleOAuth = require('./googleOAuth');
    _oauthInstance = new GoogleOAuth();
  }
  return _oauthInstance;
}

// Re-use the session auth middleware from web-server.js via app.locals
function verifySession(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token || !req.app.locals.sessions?.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Is OAuth configured? ────────────────────────────────────────────────────
// The UI checks this on load to decide whether to show the Connect button.
router.get('/oauth/google/status', (req, res) => {
  const configured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  res.json({
    configured,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback'
  });
});

// ─── Is a Google account currently connected? ────────────────────────────────
router.get('/oauth/google/user-status', verifySession, async (req, res) => {
  try {
    const oauth = getOAuth();
    const authenticated = await oauth.isAuthenticated();
    const account = authenticated ? await oauth.getConnectedAccount() : null;
    res.json({ authenticated, account });
  } catch (err) {
    console.error('[OAuth] user-status error:', err.message);
    res.json({ authenticated: false, account: null });
  }
});

// ─── Start OAuth flow ────────────────────────────────────────────────────────
// Returns the Google consent-screen URL; the UI opens it in a new tab/window.
router.post('/oauth/google/login', verifySession, (req, res) => {
  try {
    const oauth = getOAuth();
    const authUrl = oauth.getAuthUrl();
    res.json({ success: true, authUrl });
  } catch (err) {
    console.error('[OAuth] login error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      hint: 'Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your .env file.'
    });
  }
});

// ─── OAuth callback ──────────────────────────────────────────────────────────
// Google redirects here after the user approves access.
// Exchanges the code for tokens, saves them, then shows a close-window page.
router.get('/oauth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[OAuth] Callback error from Google:', error);
    return res.send(callbackPage(false, `Google returned an error: ${error}`));
  }

  if (!code) {
    return res.send(callbackPage(false, 'No authorisation code received from Google.'));
  }

  try {
    const oauth = getOAuth();
    const { profile } = await oauth.handleCallback(code);
    console.log(`[OAuth] ✅ Connected Google account: ${profile.email}`);
    res.send(callbackPage(true, `Connected as ${profile.email}`));
  } catch (err) {
    console.error('[OAuth] Callback exchange error:', err.message);
    res.send(callbackPage(false, err.message));
  }
});

// ─── Disconnect Google account ───────────────────────────────────────────────
router.post('/oauth/google/logout', verifySession, async (req, res) => {
  try {
    const oauth = getOAuth();
    await oauth.revokeAndDisconnect();
    _oauthInstance = null; // reset so next login gets a fresh instance
    res.json({ success: true });
  } catch (err) {
    console.error('[OAuth] logout error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── List calendars for the connected account ────────────────────────────────
router.get('/oauth/google/calendars', verifySession, async (req, res) => {
  try {
    const oauth = getOAuth();

    const authenticated = await oauth.isAuthenticated();
    if (!authenticated) {
      return res.status(401).json({
        error: 'No Google account connected. Please connect via the Google Calendar tab.'
      });
    }

    const calendars = await oauth.listCalendars();
    res.json(calendars);
  } catch (err) {
    console.error('[OAuth] calendars error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper: tiny HTML page shown after OAuth callback ───────────────────────
function callbackPage(success, message) {
  const icon  = success ? '✅' : '❌';
  const title = success ? 'Google Account Connected' : 'Authentication Failed';
  const color = success ? '#2ecc71' : '#e74c3c';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0;
           background: #1a1a2e; color: #eee; }
    .card { background: #16213e; border-radius: 12px; padding: 40px;
            text-align: center; max-width: 400px; border: 1px solid ${color}; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { color: ${color}; margin: 0 0 12px; }
    p  { color: #aaa; margin: 0 0 24px; }
    button { background: ${color}; color: white; border: none; padding: 10px 24px;
             border-radius: 6px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${message}</p>
    <button onclick="window.close()">Close this window</button>
  </div>
  <script>
    // Auto-notify the opener and close after 2 seconds
    if (window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_OAUTH_COMPLETE', success: ${success} }, '*');
      setTimeout(() => window.close(), 2000);
    }
  </script>
</body>
</html>`;
}

module.exports = router;
