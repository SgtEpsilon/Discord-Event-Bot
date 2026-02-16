// OAuth Routes - Add these to web-server.js after the existing calendar routes

const GoogleOAuthService = require('./src/services/googleOAuth');
const googleOAuth = new GoogleOAuthService();

// ==================== GOOGLE OAUTH ROUTES ====================

// Check if OAuth is configured
app.get('/api/oauth/google/status', verifySession, (req, res) => {
  res.json({
    configured: googleOAuth.isConfigured(),
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  });
});

// Get current user's OAuth status
app.get('/api/oauth/google/user-status', verifySession, async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const session = sessions.get(token);
    
    if (!session) {
      return res.json({ authenticated: false });
    }

    const { UserOAuth } = require('./src/models');
    const userOAuth = await UserOAuth.findOne({
      where: { userId: session.username }
    });

    if (!userOAuth) {
      return res.json({ authenticated: false });
    }

    // Check if token is expired
    const now = new Date();
    const isExpired = userOAuth.tokenExpiry && new Date(userOAuth.tokenExpiry) < now;

    res.json({
      authenticated: true,
      email: userOAuth.email,
      name: userOAuth.name,
      picture: userOAuth.picture,
      tokenExpired: isExpired
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.json({ authenticated: false });
  }
});

// Start OAuth flow
app.get('/api/oauth/google/login', verifySession, (req, res) => {
  try {
    if (!googleOAuth.isConfigured()) {
      return res.status(400).json({ 
        error: 'OAuth not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env' 
      });
    }

    const token = req.headers['x-auth-token'];
    const authUrl = googleOAuth.getAuthUrl(token); // Pass session token as state
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect('/?error=oauth_failed');
    }

    // Exchange code for tokens
    const tokens = await googleOAuth.getTokens(code);
    
    // Get user info
    const userInfo = await googleOAuth.getUserInfo(tokens);

    // Verify session from state parameter
    const sessionToken = state;
    const session = sessions.get(sessionToken);

    if (!session) {
      return res.redirect('/?error=session_expired');
    }

    // Save tokens to database
    const { UserOAuth } = require('./src/models');
    await UserOAuth.upsert({
      userId: session.username,
      provider: 'google',
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: tokens.scope ? tokens.scope.split(' ') : []
    });

    console.log(`[OAuth] User ${userInfo.email} authenticated successfully`);

    // Redirect back to calendar page with success
    res.redirect('/?oauth=success#calendar');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect('/?error=oauth_failed');
  }
});

// Logout from Google (revoke tokens)
app.post('/api/oauth/google/logout', verifySession, async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const session = sessions.get(token);

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { UserOAuth } = require('./src/models');
    const userOAuth = await UserOAuth.findOne({
      where: { userId: session.username }
    });

    if (userOAuth) {
      // Revoke token with Google
      try {
        await googleOAuth.revokeToken(userOAuth.accessToken);
      } catch (error) {
        console.error('Error revoking token:', error);
        // Continue anyway to delete from database
      }

      // Delete from database
      await userOAuth.destroy();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's calendars via OAuth
app.get('/api/oauth/google/calendars', verifySession, async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const session = sessions.get(token);

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { UserOAuth } = require('./src/models');
    let userOAuth = await UserOAuth.findOne({
      where: { userId: session.username }
    });

    if (!userOAuth) {
      return res.status(401).json({ error: 'Not connected to Google Calendar' });
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    if (userOAuth.tokenExpiry && new Date(userOAuth.tokenExpiry) < now) {
      if (userOAuth.refreshToken) {
        try {
          const newTokens = await googleOAuth.refreshAccessToken(userOAuth.refreshToken);
          await userOAuth.update({
            accessToken: newTokens.access_token,
            tokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
          });
        } catch (error) {
          console.error('Error refreshing token:', error);
          return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
      } else {
        return res.status(401).json({ error: 'Token expired. Please login again.' });
      }
    }

    // Get calendars
    const tokens = {
      access_token: userOAuth.accessToken,
      refresh_token: userOAuth.refreshToken,
      expiry_date: userOAuth.tokenExpiry ? new Date(userOAuth.tokenExpiry).getTime() : null
    };

    const calendars = await googleOAuth.listCalendars(tokens);

    res.json(calendars.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description || '',
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor
    })));
  } catch (error) {
    console.error('Error fetching OAuth calendars:', error);
    res.status(500).json({ error: error.message });
  }
});
