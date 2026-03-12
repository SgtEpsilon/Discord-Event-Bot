// oauth-routes.js - Google Calendar routes via Service Account
// Replaces the user OAuth flow with service account authentication.
// No login/consent screen needed — just share calendars with the service account email.
//
// Endpoints:
//   GET  /api/oauth/google/status       -- is the service account credentials file present?
//   GET  /api/oauth/google/user-status  -- alias for status (UI compatibility)
//   GET  /api/oauth/google/calendars    -- list calendars accessible to the service account

'use strict';

const express  = require('express');
const router   = express.Router();
const { google } = require('googleapis');
const fs       = require('fs');
const path     = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCredentialsPath() {
  return process.env.GOOGLE_CALENDAR_CREDENTIALS ||
         path.join(__dirname, 'data', 'calendar-credentials.json');
}

function loadCredentials() {
  const credPath = getCredentialsPath();
  if (!fs.existsSync(credPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } catch {
    return null;
  }
}

async function getServiceAccountClient() {
  const credentials = loadCredentials();
  if (!credentials) throw new Error('credentials_missing');

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly']
  });
  return auth.getClient();
}

function verifySession(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token || !req.app.locals.sessions?.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// GET /api/oauth/google/status
// Returns whether the service account credentials file exists and is valid,
// plus the service account email so users know what to share calendars with.
// ---------------------------------------------------------------------------
router.get('/oauth/google/status', (req, res) => {
  const credentials = loadCredentials();

  if (!credentials) {
    return res.json({
      configured: false,
      mode: 'service_account',
      credentialsPath: getCredentialsPath()
    });
  }

  const email = credentials.client_email || null;
  const projectId = credentials.project_id || null;
  const isServiceAccount = credentials.type === 'service_account';

  res.json({
    configured: isServiceAccount && !!email,
    mode: 'service_account',
    serviceAccountEmail: email,
    projectId
  });
});

// ---------------------------------------------------------------------------
// GET /api/oauth/google/user-status  (kept for UI compatibility)
// ---------------------------------------------------------------------------
router.get('/oauth/google/user-status', verifySession, (req, res) => {
  const credentials = loadCredentials();
  if (!credentials || credentials.type !== 'service_account') {
    return res.json({ authenticated: false, account: null });
  }
  res.json({
    authenticated: true,
    account: {
      email: credentials.client_email,
      name: 'Service Account',
      picture: null
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/oauth/google/calendars
// Lists all calendars shared with the service account.
// ---------------------------------------------------------------------------
router.get('/oauth/google/calendars', verifySession, async (req, res) => {
  try {
    const client   = await getServiceAccountClient();
    const calendar = google.calendar({ version: 'v3', auth: client });
    const response = await calendar.calendarList.list({ maxResults: 50, showHidden: false });

    const calendars = (response.data.items || []).map(cal => ({
      id:              cal.id,
      summary:         cal.summary,
      description:     cal.description || '',
      primary:         cal.primary || false,
      accessRole:      cal.accessRole,
      backgroundColor: cal.backgroundColor
    }));

    res.json(calendars);
  } catch (err) {
    console.error('[ServiceAccount] calendars error:', err.message);

    if (err.message === 'credentials_missing') {
      return res.status(400).json({
        error: 'Service account credentials file not found. Please add data/calendar-credentials.json.'
      });
    }
    if (err.code === 403) {
      return res.status(403).json({
        error: 'Permission denied. Make sure the Calendar API is enabled in Google Cloud Console.'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
