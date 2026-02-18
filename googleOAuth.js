// googleOAuth.js - Google OAuth2 flow for calendar access
// Stores tokens in the database via the UserOAuth model.
// Usage:
//   const GoogleOAuth = require('./googleOAuth');
//   const oauth = new GoogleOAuth();
//   const authUrl = oauth.getAuthUrl();          // redirect user here
//   const tokens = await oauth.handleCallback(code); // exchange code for tokens
//   const client = await oauth.getAuthenticatedClient(); // use for API calls

require('dotenv').config();
const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Single shared user ID — the bot authenticates as one Google account
const BOT_USER_ID = 'bot';

class GoogleOAuth {
  constructor() {
    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri  = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env. ' +
        'See QUICKSTART.md for Google Cloud Console setup instructions.'
      );
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // ─── Auth URL ────────────────────────────────────────────────────────────────

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',   // get a refresh token
      prompt: 'consent',        // force consent screen so refresh token is always returned
      scope: SCOPES
    });
  }

  // ─── Code exchange ───────────────────────────────────────────────────────────

  async handleCallback(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Fetch the authenticated user's profile
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    // Persist tokens
    await this._saveTokens(tokens, profile);

    return { tokens, profile };
  }

  // ─── Authenticated client ────────────────────────────────────────────────────

  async getAuthenticatedClient() {
    const { UserOAuth } = require('./src/models');
    const record = await UserOAuth.findOne({ where: { userId: BOT_USER_ID } });

    if (!record) {
      throw new Error('No Google account connected. Visit the web UI → Google Calendar tab to authenticate.');
    }

    this.oauth2Client.setCredentials({
      access_token:  record.accessToken,
      refresh_token: record.refreshToken,
      expiry_date:   record.tokenExpiry ? new Date(record.tokenExpiry).getTime() : null
    });

    // Auto-refresh if token is expired or close to expiry (< 5 minutes left)
    const expiry = record.tokenExpiry ? new Date(record.tokenExpiry).getTime() : 0;
    const fiveMinutes = 5 * 60 * 1000;
    if (!expiry || Date.now() > expiry - fiveMinutes) {
      if (!record.refreshToken) {
        throw new Error('Access token expired and no refresh token available. Please re-authenticate via the web UI.');
      }
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);

        // Update stored token
        await record.update({
          accessToken: credentials.access_token,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
        });

        console.log('[OAuth] ✅ Access token refreshed');
      } catch (err) {
        throw new Error(`Token refresh failed: ${err.message}. Please re-authenticate via the web UI.`);
      }
    }

    return this.oauth2Client;
  }

  // ─── Status helpers ──────────────────────────────────────────────────────────

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

      // Revoke with Google (best-effort)
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

  // ─── List calendars ──────────────────────────────────────────────────────────

  async listCalendars() {
    const auth = await this.getAuthenticatedClient();
    const calendarApi = google.calendar({ version: 'v3', auth });

    const response = await calendarApi.calendarList.list({
      maxResults: 50,
      showHidden: false
    });

    return (response.data.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description || '',
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor
    }));
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  async _saveTokens(tokens, profile) {
    const { UserOAuth } = require('./src/models');

    await UserOAuth.upsert({
      userId:       BOT_USER_ID,
      provider:     'google',
      email:        profile.email,
      name:         profile.name  || null,
      picture:      profile.picture || null,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiry:  tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes:       SCOPES
    });

    console.log(`[OAuth] ✅ Google account connected: ${profile.email}`);
  }
}

module.exports = GoogleOAuth;
