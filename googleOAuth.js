// googleOAuth.js - Google OAuth2 flow for calendar access
// Credentials are loaded from the encrypted secrets store (data/secrets.enc).
// Run "node setup-secrets.js" once to create the secrets file.
// The service account (GOOGLE_CALENDAR_CREDENTIALS) is separate and only used for calendar sync.
//
// Usage:
//   const GoogleOAuth = require('./googleOAuth');
//   const oauth = new GoogleOAuth();
//   await oauth.init();                               // must call before anything else
//   const authUrl = oauth.getAuthUrl();               // redirect user here
//   const tokens  = await oauth.handleCallback(code); // exchange code for tokens
//   const client  = await oauth.getAuthenticatedClient(); // use for API calls

const { google } = require('googleapis');
const { getSecret } = require('./src/services/secrets');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Single shared user ID — the bot authenticates as one Google account
const BOT_USER_ID = 'bot';

// ---------------------------------------------------------------------------
// OAuth uses GOOGLE_OAUTH_* secrets (Web Application credentials from Google Cloud Console).
// These are SEPARATE from GOOGLE_CALENDAR_CREDENTIALS (Service Account for calendar sync).
// ---------------------------------------------------------------------------

class GoogleOAuth {
  constructor() {
    // oauth2Client is set up in init() after async secret loading
    this.oauth2Client = null;
  }

  /**
   * Must be called once before using any other method.
   * Loads credentials from the encrypted secrets store.
   */
  async init() {
    if (this.oauth2Client) return; // already initialised

    const clientId     = await getSecret('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = await getSecret('GOOGLE_OAUTH_CLIENT_SECRET');
    const redirectUri  = await getSecret('GOOGLE_OAUTH_REDIRECT_URI') ||
                         'http://localhost:3031/api/oauth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET.\n' +
        'Run "node setup-secrets.js" to add them to the encrypted secrets store.'
      );
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // --- Auth URL --------------------------------------------------------------

  getAuthUrl() {
    if (!this.oauth2Client) throw new Error('Call await oauth.init() before using GoogleOAuth.');
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',  // get a refresh token
      prompt: 'consent',       // force consent screen so refresh token is always returned
      scope: SCOPES
    });
  }

  // --- Code exchange ---------------------------------------------------------

  async handleCallback(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    await this._saveTokens(tokens, profile);

    return { tokens, profile };
  }

  // --- Authenticated client --------------------------------------------------

  async getAuthenticatedClient() {
    const { UserOAuth } = require('./src/models');
    const record = await UserOAuth.findOne({ where: { userId: BOT_USER_ID } });

    if (!record) {
      throw new Error('No Google account connected. Visit the web UI to authenticate.');
    }

    this.oauth2Client.setCredentials({
      access_token:  record.accessToken,
      refresh_token: record.refreshToken,
      expiry_date:   record.tokenExpiry ? new Date(record.tokenExpiry).getTime() : null
    });

    const expiry      = record.tokenExpiry ? new Date(record.tokenExpiry).getTime() : 0;
    const fiveMinutes = 5 * 60 * 1000;
    if (!expiry || Date.now() > expiry - fiveMinutes) {
      if (!record.refreshToken) {
        throw new Error('Access token expired and no refresh token available. Please re-authenticate.');
      }
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        await record.update({
          accessToken: credentials.access_token,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
        });
        console.log('[OAuth] Access token refreshed');
      } catch (err) {
        throw new Error(`Token refresh failed: ${err.message}. Please re-authenticate.`);
      }
    }

    return this.oauth2Client;
  }

  // --- Status helpers --------------------------------------------------------

  async isAuthenticated() {
    try {
      const { UserOAuth } = require('./src/models');
      const record = await UserOAuth.findOne({ where: { userId: BOT_USER_ID } });
      return !!record;
    } catch {
      return false;
    }
  }

  async getConnectedAccount() {
    try {
      const { UserOAuth } = require('./src/models');
      const record = await UserOAuth.findOne({ where: { userId: BOT_USER_ID } });
      if (!record) return null;
      return { email: record.email, name: record.name, picture: record.picture };
    } catch {
      return null;
    }
  }

  async revokeAndDisconnect() {
    try {
      const { UserOAuth } = require('./src/models');
      const record = await UserOAuth.findOne({ where: { userId: BOT_USER_ID } });
      if (!record) return;

      try {
        this.oauth2Client.setCredentials({ access_token: record.accessToken });
        await this.oauth2Client.revokeCredentials();
      } catch {
        // Ignore revoke errors — still delete local record
      }

      await record.destroy();
      console.log('[OAuth] Google account disconnected');
    } catch (err) {
      console.error('[OAuth] Error revoking tokens:', err.message);
      throw err;
    }
  }

  // --- List calendars --------------------------------------------------------

  async listCalendars() {
    const auth        = await this.getAuthenticatedClient();
    const calendarApi = google.calendar({ version: 'v3', auth });

    const response = await calendarApi.calendarList.list({
      maxResults: 50,
      showHidden: false
    });

    return (response.data.items || []).map(cal => ({
      id:              cal.id,
      summary:         cal.summary,
      description:     cal.description || '',
      primary:         cal.primary || false,
      accessRole:      cal.accessRole,
      backgroundColor: cal.backgroundColor
    }));
  }

  // --- Private ---------------------------------------------------------------

  async _saveTokens(tokens, profile) {
    const { UserOAuth } = require('./src/models');

    await UserOAuth.upsert({
      userId:       BOT_USER_ID,
      provider:     'google',
      email:        profile.email,
      name:         profile.name    || null,
      picture:      profile.picture || null,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiry:  tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes:       SCOPES
    });

    console.log(`[OAuth] Google account connected: ${profile.email}`);
  }
}

module.exports = GoogleOAuth;
