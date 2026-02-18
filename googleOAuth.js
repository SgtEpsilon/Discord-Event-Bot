// src/services/googleOAuth.js - Google OAuth Service for Calendar Access
const { google } = require('googleapis');

class GoogleOAuthService {
  constructor() {
    this.clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
    
    if (this.clientId && this.clientSecret) {
      this.oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUri
      );
    }
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Generate authorization URL for user to login
   */
  getAuthUrl(state = '') {
    if (!this.isConfigured()) {
      throw new Error('OAuth not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent' // Force to show consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    if (!this.isConfigured()) {
      throw new Error('OAuth not configured');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Get user info from tokens
   */
  async getUserInfo(tokens) {
    this.oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    return {
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  }

  /**
   * List calendars for authenticated user
   */
  async listCalendars(tokens) {
    this.oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list({
      maxResults: 50,
      showHidden: false
    });

    return response.data.items || [];
  }

  /**
   * Get events from a specific calendar
   */
  async getCalendarEvents(tokens, calendarId, timeMin, timeMax) {
    this.oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  }

  /**
   * Create event in user's calendar
   */
  async createEvent(tokens, calendarId, event) {
    this.oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.events.insert({
      calendarId,
      resource: event
    });

    return response.data;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    if (!this.isConfigured()) {
      throw new Error('OAuth not configured');
    }

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  /**
   * Revoke user's tokens (logout)
   */
  async revokeToken(accessToken) {
    if (!this.isConfigured()) {
      throw new Error('OAuth not configured');
    }

    return await this.oauth2Client.revokeToken(accessToken);
  }
}

module.exports = GoogleOAuthService;
