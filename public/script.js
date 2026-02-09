// ==========================================
// GLOBAL STATE
// ==========================================
const STATE = {
  apiKey: localStorage.getItem('discordBotApiKey') || '',
  currentGuildId: null,
  isAuthenticated: false,
  activeView: 'main',
  activeTab: 'events'
};

// ==========================================
// HTML ESCAPE HELPER
// ==========================================
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function encodeAttribute(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize auth state
  updateAuthStatus();
  // Load dashboard if authenticated
  if (STATE.apiKey) {
    loadDashboardData();
    loadGuildsForSettings();
  }
  
  // Setup event delegation for delete buttons
  setupDeleteEventListeners();
});

// ==========================================
// DELETE BUTTON EVENT DELEGATION
// ==========================================
function setupDeleteEventListeners() {
  // Events container
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-event]');
    if (deleteBtn) {
      const eventId = deleteBtn.dataset.deleteEvent;
      deleteEvent(eventId);
    }
  });
  
  // Presets container
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-preset]');
    if (deleteBtn) {
      const presetKey = deleteBtn.dataset.deletePreset;
      deletePreset(presetKey);
    }
  });
  
  // Use preset buttons
  document.addEventListener('click', (e) => {
    const useBtn = e.target.closest('[data-use-preset]');
    if (useBtn) {
      const presetKey = useBtn.dataset.usePreset;
      usePreset(presetKey);
    }
  });
}

// ==========================================
// VIEW & TAB MANAGEMENT
// ==========================================
function switchToMainView() {
  STATE.activeView = 'main';
  // Show channel list
  document.getElementById('channelList').style.display = 'flex';
  
  // Show events/presets categories, hide configuration
  document.getElementById('eventsCategory').classList.remove('hidden');
  document.getElementById('presetsCategory').classList.remove('hidden');
  document.getElementById('configCategory').classList.add('hidden');
  
  // Show events tab by default
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById('events').classList.add('active');
  
  // Update channel items
  document.querySelectorAll('.channel-item').forEach(item => {
    item.classList.remove('active');
    if (item.textContent.includes('All Events')) {
      item.classList.add('active');
    }
  });
  
  // Update server icons
  document.querySelectorAll('.server-icon').forEach(icon => {
    icon.classList.toggle('active', icon.textContent.trim() === '🎮');
  });
  
  // Load events
  loadEvents();
}

function switchToSettingsView() {
  STATE.activeView = 'settings';
  // Show channel list
  document.getElementById('channelList').style.display = 'flex';
  
  // Hide events/presets categories, show configuration
  document.getElementById('eventsCategory').classList.add('hidden');
  document.getElementById('presetsCategory').classList.add('hidden');
  document.getElementById('configCategory').classList.remove('hidden');
  
  // Show server-settings tab by default
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById('server-settings').classList.add('active');
  
  // Update channel items
  document.querySelectorAll('.channel-item').forEach(item => {
    item.classList.remove('active');
    if (item.textContent.includes('Server Settings')) {
      item.classList.add('active');
    }
  });
  
  // Update server icons
  document.querySelectorAll('.server-icon').forEach(icon => {
    icon.classList.toggle('active', icon.textContent.trim() === '⚙️');
  });
  
  // Load guilds if authenticated
  if (STATE.apiKey) {
    loadGuildsForSettings();
  }
}

function switchTab(tab) {
  STATE.activeTab = tab;
  // Show channel list for all tabs
  document.getElementById('channelList').style.display = 'flex';
  
  // Determine which view we should be in based on the tab
  const configTabs = ['server-settings', 'twitch', 'youtube'];
  const eventsTabs = ['events', 'create-event', 'presets', 'create-preset', 'create-from-preset'];
  
  if (configTabs.includes(tab)) {
    // Configuration view
    STATE.activeView = 'settings';
    document.getElementById('eventsCategory').classList.add('hidden');
    document.getElementById('presetsCategory').classList.add('hidden');
    document.getElementById('configCategory').classList.remove('hidden');
    
    // Update server icon
    document.querySelectorAll('.server-icon').forEach(icon => {
      icon.classList.toggle('active', icon.textContent.trim() === '⚙️');
    });
  } else {
    // Main view
    STATE.activeView = 'main';
    document.getElementById('eventsCategory').classList.remove('hidden');
    document.getElementById('presetsCategory').classList.remove('hidden');
    document.getElementById('configCategory').classList.add('hidden');
    
    // Update server icon
    document.querySelectorAll('.server-icon').forEach(icon => {
      icon.classList.toggle('active', icon.textContent.trim() === '🎮');
    });
  }
  
  // Update channel items
  document.querySelectorAll('.channel-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class based on tab
  const channelMapping = {
    'events': 'All Events',
    'create-event': 'Create Event',
    'presets': 'Presets',
    'create-preset': 'Create Preset',
    'create-from-preset': 'From Preset',
    'server-settings': 'Server Settings',
    'twitch': 'Twitch',
    'youtube': 'YouTube'
  };
  
  document.querySelectorAll('.channel-item').forEach(item => {
    if (item.textContent.includes(channelMapping[tab])) {
      item.classList.add('active');
    }
  });
  
  // Show active tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tab);
  });
  
  // Load data for specific tabs
  if (tab === 'events') loadEvents();
  if (tab === 'presets') loadPresets();
  if (tab === 'server-settings' && STATE.apiKey) {
    loadGuildsForSettings();
  }
  if (tab === 'twitch' && STATE.apiKey) {
    loadGuildsForTwitch();
  }
  if (tab === 'youtube' && STATE.apiKey) {
    loadGuildsForYouTube();
  }
}

// ==========================================
// AUTHENTICATION
// ==========================================
async function saveApiKey() {
  const keyInput = document.getElementById('apiKeyInput');
  const key = keyInput.value.trim();
  if (!key) {
    showAlert('apiKeyAlert', 'Please enter an API key', 'error');
    return;
  }
  
  try {
    // Validate against protected endpoint
    const response = await fetch('/api/stats', {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key
      }
    });
    
    if (!response.ok) {
      throw new Error(response.status === 401 ? 'Invalid API key' : `HTTP ${response.status}`);
    }
    
    // Save valid key
    localStorage.setItem('discordBotApiKey', key);
    STATE.apiKey = key;
    STATE.isAuthenticated = true;
    
    // Update UI
    updateAuthStatus();
    keyInput.value = '';
    loadDashboardData();
    loadGuildsForSettings();
    
    // Show success message
    showAlert('apiKeyAlert', '✅ API key saved successfully!', 'success', 3000);
    
  } catch (error) {
    // Clear invalid key
    localStorage.removeItem('discordBotApiKey');
    STATE.apiKey = '';
    STATE.isAuthenticated = false;
    
    // Update UI
    updateAuthStatus();
    
    // Show error message
    showAlert('apiKeyAlert', `❌ ${error.message}`, 'error');
  }
}

function updateAuthStatus() {
  const authStatus = document.getElementById('authStatus');
  if (STATE.isAuthenticated && STATE.apiKey) {
    authStatus.textContent = '✅ Authenticated';
    authStatus.className = 'status authenticated';
  } else {
    authStatus.textContent = '🔒 Not authenticated';
    authStatus.className = 'status unauthenticated';
    STATE.apiKey = '';
    localStorage.removeItem('discordBotApiKey');
  }
}

// ==========================================
// API REQUEST HELPER
// ==========================================
async function apiRequest(endpoint, options = {}) {
  const apiKey = STATE.apiKey || localStorage.getItem('discordBotApiKey');
  if (!apiKey) {
    STATE.isAuthenticated = false;
    updateAuthStatus();
    throw new Error('API key not set. Please enter your API key.');
  }
  
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...options.headers
      }
    });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      STATE.isAuthenticated = false;
      updateAuthStatus();
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Invalid API key. Please re-authenticate.');
    }
    
    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status} error` 
      }));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }
    
    // Success
    STATE.isAuthenticated = true;
    updateAuthStatus();
    return await response.json();
    
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Is the bot running?');
    }
    throw error;
  }
}

// ==========================================
// DASHBOARD & DATA LOADING
// ==========================================
async function loadDashboardData() {
  try {
    const data = await apiRequest('/api/stats');
    // Update stats
    document.getElementById('totalEvents').textContent = data.stats?.totalEvents || 0;
    document.getElementById('upcomingEvents').textContent = data.stats?.upcomingEvents || 0;
    document.getElementById('totalSignups').textContent = data.stats?.totalSignups || 0;
    document.getElementById('totalPresets').textContent = data.stats?.totalPresets || 0;
    
    // Load content for active tab
    if (STATE.activeTab === 'events') loadEvents();
    if (STATE.activeTab === 'presets') loadPresets();
    loadPresetSelect();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    if (error.message.includes('Invalid API key')) {
      updateAuthStatus();
    }
  }
}

async function loadGuildsForSettings() {
  try {
    const data = await apiRequest('/api/guilds');
    const select = document.getElementById('settingsGuildId');
    // Clear and add default option
    select.innerHTML = '<option value="">-- Select a server --</option>';
    
    if (data.guilds && data.guilds.length > 0) {
      // Filter out Discord system servers
      const filteredGuilds = data.guilds.filter(guild => 
        !guild.name.includes('(_comm)') && 
        !guild.name.includes('(_sche)')
      );
      
      // Sort alphabetically
      filteredGuilds.sort((a, b) => a.name.localeCompare(b.name));
      
      // Populate options
      filteredGuilds.forEach(guild => {
        const option = document.createElement('option');
        option.value = guild.id;
        option.textContent = guild.name;
        select.appendChild(option);
      });
      
      // Show settings content
      document.getElementById('settingsContent').classList.remove('hidden');
      document.getElementById('noGuildSelected').style.display = 'block';
    } else {
      select.innerHTML = '<option value="">No configured servers found</option>';
      document.getElementById('settingsContent').classList.add('hidden');
      document.getElementById('noGuildSelected').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading guilds:', error);
    document.getElementById('settingsGuildId').innerHTML = '<option value="">❌ Failed to load servers</option>';
  }
}

async function loadGuildsForTwitch() {
  try {
    const data = await apiRequest('/api/guilds');
    const select = document.getElementById('twitchGuildId');
    // Clear and add default option
    select.innerHTML = '<option value="">-- Select a server --</option>';
    
    if (data.guilds && data.guilds.length > 0) {
      // Filter out Discord system servers
      const filteredGuilds = data.guilds.filter(guild => 
        !guild.name.includes('(_comm)') && 
        !guild.name.includes('(_sche)')
      );
      
      // Sort alphabetically
      filteredGuilds.sort((a, b) => a.name.localeCompare(b.name));
      
      // Populate options
      filteredGuilds.forEach(guild => {
        const option = document.createElement('option');
        option.value = guild.id;
        option.textContent = guild.name;
        select.appendChild(option);
      });
      
      // Show settings content
      document.getElementById('twitchSettingsContent').classList.remove('hidden');
      document.getElementById('noTwitchGuildSelected').style.display = 'block';
    } else {
      select.innerHTML = '<option value="">No configured servers found</option>';
      document.getElementById('twitchSettingsContent').classList.add('hidden');
      document.getElementById('noTwitchGuildSelected').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading guilds for Twitch:', error);
    document.getElementById('twitchGuildId').innerHTML = '<option value="">❌ Failed to load servers</option>';
  }
}

async function loadGuildsForYouTube() {
  try {
    const data = await apiRequest('/api/guilds');
    const select = document.getElementById('youtubeGuildId');
    // Clear and add default option
    select.innerHTML = '<option value="">-- Select a server --</option>';
    
    if (data.guilds && data.guilds.length > 0) {
      // Filter out Discord system servers
      const filteredGuilds = data.guilds.filter(guild => 
        !guild.name.includes('(_comm)') && 
        !guild.name.includes('(_sche)')
      );
      
      // Sort alphabetically
      filteredGuilds.sort((a, b) => a.name.localeCompare(b.name));
      
      // Populate options
      filteredGuilds.forEach(guild => {
        const option = document.createElement('option');
        option.value = guild.id;
        option.textContent = guild.name;
        select.appendChild(option);
      });
      
      // Show settings content
      document.getElementById('youtubeSettingsContent').classList.remove('hidden');
      document.getElementById('noYouTubeGuildSelected').style.display = 'block';
    } else {
      select.innerHTML = '<option value="">No configured servers found</option>';
      document.getElementById('youtubeSettingsContent').classList.add('hidden');
      document.getElementById('noYouTubeGuildSelected').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading guilds for YouTube:', error);
    document.getElementById('youtubeGuildId').innerHTML = '<option value="">❌ Failed to load servers</option>';
  }
}

// ==========================================
// SETTINGS MANAGEMENT
// ==========================================
async function loadGuildSettings(guildId) {
  if (!guildId) {
    document.getElementById('settingsContent').classList.add('hidden');
    document.getElementById('noGuildSelected').style.display = 'block';
    STATE.currentGuildId = null;
    return;
  }
  STATE.currentGuildId = guildId;
  document.getElementById('settingsContent').classList.remove('hidden');
  document.getElementById('noGuildSelected').style.display = 'none';
  
  try {
    const data = await apiRequest(`/api/event-channel/${guildId}`);
    document.getElementById('eventChannelInput').value = data.channelId || '';
    
    if (data.hasChannel) {
      showAlert('eventChannelStatus', `✅ Event channel set: ${data.channelId}`, 'success');
    } else {
      document.getElementById('eventChannelStatus').className = 'alert hidden';
    }
    
    document.getElementById('notificationChannelInput').value = '';
    
  } catch (error) {
    console.error('Error loading guild settings:', error);
    showAlert('eventChannelStatus', `Error: ${error.message}`, 'error');
  }
}

async function loadTwitchGuildSettings(guildId) {
  if (!guildId) {
    document.getElementById('twitchSettingsContent').classList.add('hidden');
    document.getElementById('noTwitchGuildSelected').style.display = 'block';
    return;
  }
  document.getElementById('twitchSettingsContent').classList.remove('hidden');
  document.getElementById('noTwitchGuildSelected').style.display = 'none';
  
  // Reset container
  document.getElementById('twitchContainer').innerHTML = `
    <div class="streamer-row">
      <input type="text" placeholder="Twitch username (e.g., ninja)" class="twitch-username">
      <button type="button" class="btn btn-danger" style="padding: 6px; min-width: 36px;" onclick="this.parentElement.remove()">✕</button>
    </div>
  `;
}

async function loadYouTubeGuildSettings(guildId) {
  if (!guildId) {
    document.getElementById('youtubeSettingsContent').classList.add('hidden');
    document.getElementById('noYouTubeGuildSelected').style.display = 'block';
    return;
  }
  document.getElementById('youtubeSettingsContent').classList.remove('hidden');
  document.getElementById('noYouTubeGuildSelected').style.display = 'none';
  
  // Reset container
  document.getElementById('youtubeContainer').innerHTML = `
    <div class="youtube-row">
      <input type="text" placeholder="Channel ID or URL" class="youtube-channel">
      <button type="button" class="btn btn-danger" style="padding: 6px; min-width: 36px;" onclick="this.parentElement.remove()">✕</button>
    </div>
  `;
}

async function saveEventChannel() {
  if (!STATE.currentGuildId) {
    showAlert('eventChannelStatus', 'Please select a server first', 'error');
    return;
  }
  const channelId = document.getElementById('eventChannelInput').value.trim();
  if (!channelId) {
    showAlert('eventChannelStatus', 'Please enter a channel ID', 'error');
    return;
  }
  
  try {
    await apiRequest(`/api/event-channel/${STATE.currentGuildId}`, {
      method: 'POST',
      body: JSON.stringify({ channelId })
    });
    
    showAlert('eventChannelStatus', `✅ Event channel set successfully to ${channelId}`, 'success', 3000);
    loadDashboardData();
  } catch (error) {
    showAlert('eventChannelStatus', `❌ Error: ${error.message}`, 'error');
  }
}

async function clearEventChannel() {
  if (!STATE.currentGuildId) {
    showAlert('eventChannelStatus', 'Please select a server first', 'error');
    return;
  }
  if (!confirm('Are you sure you want to clear the event channel? Events will no longer be posted automatically.')) {
    return;
  }
  
  try {
    await apiRequest(`/api/event-channel/${STATE.currentGuildId}`, {
      method: 'DELETE'
    });
    
    document.getElementById('eventChannelInput').value = '';
    showAlert('eventChannelStatus', '✅ Event channel cleared successfully', 'success', 3000);
    loadDashboardData();
  } catch (error) {
    showAlert('eventChannelStatus', `❌ Error: ${error.message}`, 'error');
  }
}

// ==========================================
// EVENT & PRESET MANAGEMENT
// ==========================================
async function loadEvents() {
  try {
    const data = await apiRequest('/api/events');
    const container = document.getElementById('eventsContainer');
    if (data.events.length === 0) {
      container.innerHTML = `
        <div class="loading">No events found. Create your first event!</div>
      `;
      return;
    }
    
    container.innerHTML = data.events.map(event => {
      const signupCount = event.signups ? 
        Object.values(event.signups).flat().length : 0;
        
      const isPast = new Date(event.dateTime) < new Date();
      
      // Escape all user-controlled values
      const safeTitle = escapeHtml(event.title);
      const safeDescription = event.description ? escapeHtml(event.description) : '';
      const safeEventId = encodeAttribute(event.id);
      
      // Build role badges safely
      const roleBadges = event.roles && event.roles.length > 0 
        ? event.roles.map(r => {
            const safeEmoji = escapeHtml(r.emoji || '👤');
            const safeRoleName = escapeHtml(r.name);
            return `<div class="role-badge">${safeEmoji} ${safeRoleName}</div>`;
          }).join('')
        : '';
      
      return `
        <div class="event-card ${isPast ? 'past' : ''}">
          <div class="event-header">
            <div>
              <div class="event-title">${safeTitle}</div>
              ${safeDescription ? `<div class="event-description">${safeDescription}</div>` : ''}
            </div>
          </div>
          <div class="event-meta">
            <div class="meta-item">📅 ${new Date(event.dateTime).toLocaleString()}</div>
            <div class="meta-item">⏱️ ${event.duration} min</div>
            <div class="meta-item">👥 ${signupCount} signed up</div>
          </div>
          ${roleBadges ? `<div class="event-roles">${roleBadges}</div>` : ''}
          <div class="event-actions">
            <button class="btn btn-danger" data-delete-event="${safeEventId}">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    document.getElementById('eventsContainer').innerHTML = `
      <div class="alert alert-error">
        ❌ Error loading events: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

async function loadPresets() {
  try {
    const data = await apiRequest('/api/presets');
    const container = document.getElementById('presetsContainer');
    const presets = data.presets || {};
    if (Object.keys(presets).length === 0) {
      container.innerHTML = `
        <div class="loading">No presets found. Create your first preset!</div>
      `;
      return;
    }
    
    container.innerHTML = Object.entries(presets).map(([key, preset]) => {
      // Escape all user-controlled values
      const safePresetKey = encodeAttribute(key);
      const safeName = escapeHtml(preset.name);
      const safeDescription = escapeHtml(preset.description || 'No description');
      
      // Build role badges safely
      const roleBadges = preset.roles && preset.roles.length > 0
        ? preset.roles.map(r => {
            const safeEmoji = escapeHtml(r.emoji || '👤');
            const safeRoleName = escapeHtml(r.name);
            const maxSlots = r.maxSlots || '∞';
            return `<div class="role-badge">${safeEmoji} ${safeRoleName} (${maxSlots})</div>`;
          }).join('')
        : '';
      
      return `
        <div class="preset-card">
          <div class="preset-header">
            <div>
              <div class="preset-title">${safeName}</div>
              <div class="preset-description">${safeDescription}</div>
            </div>
          </div>
          <div class="preset-meta">
            <p>⏱️ Duration: ${preset.duration} min</p>
            <p>👥 Max Participants: ${preset.maxParticipants || 'Unlimited'}</p>
          </div>
          ${roleBadges ? `<div class="preset-roles">${roleBadges}</div>` : ''}
          <div class="preset-actions">
            <button class="btn btn-secondary" data-use-preset="${safePresetKey}">
              ✨ Use
            </button>
            <button class="btn btn-danger" data-delete-preset="${safePresetKey}">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    document.getElementById('presetsContainer').innerHTML = `
      <div class="alert alert-error">
        ❌ Error loading presets: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

async function loadPresetSelect() {
  try {
    const data = await apiRequest('/api/presets');
    const select = document.getElementById('fromPresetSelect');
    select.innerHTML = '<option value="">-- Choose a preset --</option>';
    Object.entries(data.presets || {}).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${preset.name} (${key})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading preset select:', error);
  }
}

function usePreset(key) {
  document.getElementById('fromPresetSelect').value = key;
  switchTab('create-from-preset');
}

// ==========================================
// FORM HANDLERS
// ==========================================
function addEventRoleRow() {
  const container = document.getElementById('eventRolesContainer');
  const row = document.createElement('div');
  row.className = 'role-row';
  row.innerHTML = `
    <input type="text" placeholder="Emoji" class="role-emoji" />
    <input type="text" placeholder="Role name" class="role-name" />
    <input type="number" placeholder="Max slots" class="role-slots" min="0" />
    <button type="button" class="btn btn-danger" onclick="removeEventRoleRow(this)">✕</button>
  `;
  container.appendChild(row);
}

function removeEventRoleRow(button) {
  button.parentElement.remove();
}

function addPresetRoleRow() {
  const container = document.getElementById('presetRolesContainer');
  const row = document.createElement('div');
  row.className = 'role-row';
  row.innerHTML = `
    <input type="text" placeholder="Emoji" class="role-emoji" />
    <input type="text" placeholder="Role name" class="role-name" />
    <input type="number" placeholder="Max slots" class="role-slots" min="0" />
    <button type="button" class="btn btn-danger" onclick="removePresetRoleRow(this)">✕</button>
  `;
  container.appendChild(row);
}

function removePresetRoleRow(button) {
  button.parentElement.remove();
}

function addTwitchRow() {
  const container = document.getElementById('twitchContainer');
  const row = document.createElement('div');
  row.className = 'streamer-row';
  row.innerHTML = `
    <input type="text" placeholder="Twitch username (e.g., ninja)" class="twitch-username">
    <button type="button" class="btn btn-danger" style="padding: 6px; min-width: 36px;" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}

function addYouTubeRow() {
  const container = document.getElementById('youtubeContainer');
  const row = document.createElement('div');
  row.className = 'youtube-row';
  row.innerHTML = `
    <input type="text" placeholder="Channel ID or URL" class="youtube-channel">
    <button type="button" class="btn btn-danger" style="padding: 6px; min-width: 36px;" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}

function resetEventForm() {
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventDescription').value = '';
  document.getElementById('eventDateTime').value = '';
  document.getElementById('eventDuration').value = '60';
  document.getElementById('eventMaxParticipants').value = '0';
  document.getElementById('eventRolesContainer').innerHTML = `
    <div class="role-row">
      <input type="text" placeholder="Emoji" class="role-emoji" />
      <input type="text" placeholder="Role name" class="role-name" />
      <input type="number" placeholder="Max slots" class="role-slots" min="0" />
      <button type="button" class="btn btn-danger" onclick="removeEventRoleRow(this)">✕</button>
    </div>
  `;
}

function resetPresetForm() {
  document.getElementById('presetId').value = '';
  document.getElementById('presetName').value = '';
  document.getElementById('presetDescription').value = '';
  document.getElementById('presetDuration').value = '60';
  document.getElementById('presetMaxParticipants').value = '0';
  document.getElementById('presetRolesContainer').innerHTML = `
    <div class="role-row">
      <input type="text" placeholder="Emoji" class="role-emoji" />
      <input type="text" placeholder="Role name" class="role-name" />
      <input type="number" placeholder="Max slots" class="role-slots" min="0" />
      <button type="button" class="btn btn-danger" onclick="removePresetRoleRow(this)">✕</button>
    </div>
  `;
}

async function createEvent() {
  try {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const dateTime = document.getElementById('eventDateTime').value;
    const duration = parseInt(document.getElementById('eventDuration').value) || 60;
    const maxParticipants = parseInt(document.getElementById('eventMaxParticipants').value) || 0;
    
    if (!title || !dateTime) {
      throw new Error('Title and Date/Time are required');
    }
    
    // Collect roles
    const roleRows = document.querySelectorAll('#eventRolesContainer .role-row');
    const roles = Array.from(roleRows).map(row => {
      const emoji = row.querySelector('.role-emoji').value.trim();
      const name = row.querySelector('.role-name').value.trim();
      const maxSlots = parseInt(row.querySelector('.role-slots').value) || null;
      return name ? { emoji: emoji || '👤', name, maxSlots } : null;
    }).filter(role => role !== null);
    
    // Create event
    await apiRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        dateTime: new Date(dateTime).toISOString(),
        duration,
        maxParticipants,
        roles
      })
    });
    
    // Show success
    showAlert('createEventAlert', '✅ Event created successfully!', 'success', 3000);
    
    // Reset form and switch to events tab
    setTimeout(() => {
      resetEventForm();
      switchTab('events');
      loadEvents();
      loadDashboardData();
    }, 2000);
    
  } catch (error) {
    showAlert('createEventAlert', `❌ Error: ${error.message}`, 'error');
  }
}

async function createPreset() {
  try {
    const key = document.getElementById('presetId').value.trim();
    const name = document.getElementById('presetName').value.trim();
    const description = document.getElementById('presetDescription').value.trim();
    const duration = parseInt(document.getElementById('presetDuration').value) || 60;
    const maxParticipants = parseInt(document.getElementById('presetMaxParticipants').value) || 0;
    
    if (!key || !name) {
      throw new Error('Preset ID and Name are required');
    }
    
    // Validate key format
    if (!/^[a-z0-9-]+$/.test(key)) {
      throw new Error('Preset ID must be lowercase letters, numbers, and hyphens only');
    }
    
    // Collect roles
    const roleRows = document.querySelectorAll('#presetRolesContainer .role-row');
    const roles = Array.from(roleRows).map(row => {
      const emoji = row.querySelector('.role-emoji').value.trim();
      const name = row.querySelector('.role-name').value.trim();
      const maxSlots = parseInt(row.querySelector('.role-slots').value) || null;
      return name ? { emoji: emoji || '👤', name, maxSlots } : null;
    }).filter(role => role !== null);
    
    if (roles.length === 0) {
      throw new Error('At least one role is required');
    }
    
    // Create preset
    await apiRequest('/api/presets', {
      method: 'POST',
      body: JSON.stringify({
        key,
        name,
        description,
        duration,
        maxParticipants,
        roles
      })
    });
    
    // Show success
    showAlert('createPresetAlert', '✅ Preset created successfully!', 'success', 3000);
    
    // Reset form and switch to presets tab
    setTimeout(() => {
      resetPresetForm();
      switchTab('presets');
      loadPresets();
      loadPresetSelect();
      loadDashboardData();
    }, 2000);
    
  } catch (error) {
    showAlert('createPresetAlert', `❌ Error: ${error.message}`, 'error');
  }
}

async function createEventFromPreset() {
  try {
    const presetKey = document.getElementById('fromPresetSelect').value;
    const dateTime = document.getElementById('fromPresetDateTime').value;
    const description = document.getElementById('fromPresetDescription').value.trim();
    
    if (!presetKey || !dateTime) {
      throw new Error('Preset and Date/Time are required');
    }
    
    // Create event from preset
    await apiRequest('/api/events/from-preset', {
      method: 'POST',
      body: JSON.stringify({
        presetName: presetKey,
        dateTime: new Date(dateTime).toISOString(),
        description: description || undefined
      })
    });
    
    // Show success
    showAlert('createFromPresetAlert', '✅ Event created successfully from preset!', 'success', 3000);
    
    // Switch to events tab
    setTimeout(() => {
      switchTab('events');
      loadEvents();
      loadDashboardData();
    }, 2000);
    
  } catch (error) {
    showAlert('createFromPresetAlert', `❌ Error: ${error.message}`, 'error');
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
  try {
    await apiRequest(`/api/events/${eventId}`, { method: 'DELETE' });
    loadEvents();
    loadDashboardData();
  } catch (error) {
    showAlert('eventsContainer', `Error deleting event: ${error.message}`, 'error');
  }
}

async function deletePreset(presetKey) {
  if (!confirm('Are you sure you want to delete this preset? This action cannot be undone.')) return;
  try {
    await apiRequest(`/api/presets/${presetKey}`, { method: 'DELETE' });
    loadPresets();
    loadPresetSelect();
    loadDashboardData();
  } catch (error) {
    showAlert('presetsContainer', `Error deleting preset: ${error.message}`, 'error');
  }
}

// ==========================================
// STREAMING CONFIG SAVE FUNCTIONS
// ==========================================
async function saveTwitchConfig() {
  const guildId = document.getElementById('twitchGuildId')?.value;
  if (!guildId) {
    showAlert('twitchStatus', '❌ Please select a server first', 'error');
    return;
  }
  
  const streamerRows = document.querySelectorAll('#twitchContainer .streamer-row');
  const streamers = Array.from(streamerRows)
    .map(row => row.querySelector('.twitch-username')?.value.trim())
    .filter(username => username && username.length > 0);
  
  if (streamers.length === 0) {
    showAlert('twitchStatus', '❌ Please add at least one Twitch username', 'error');
    return;
  }
  
  try {
    // Call backend API to save Twitch configuration
    await apiRequest(`/api/twitch/${guildId}`, {
      method: 'POST',
      body: JSON.stringify({
        streamers,
        enabled: true
      })
    });
    
    showAlert('twitchStatus', '✅ Twitch streamers saved successfully!', 'success', 3000);
  } catch (error) {
    console.error('Error saving Twitch config:', error);
    showAlert('twitchStatus', `❌ Error: ${error.message}`, 'error');
  }
}

async function saveYouTubeConfig() {
  const guildId = document.getElementById('youtubeGuildId')?.value;
  if (!guildId) {
    showAlert('youtubeStatus', '❌ Please select a server first', 'error');
    return;
  }
  
  const channelRows = document.querySelectorAll('#youtubeContainer .youtube-row');
  const channels = Array.from(channelRows)
    .map(row => row.querySelector('.youtube-channel')?.value.trim())
    .filter(channel => channel && channel.length > 0);
  
  if (channels.length === 0) {
    showAlert('youtubeStatus', '❌ Please add at least one YouTube channel', 'error');
    return;
  }
  
  try {
    // Call backend API to save YouTube configuration
    await apiRequest(`/api/youtube/${guildId}`, {
      method: 'POST',
      body: JSON.stringify({
        channels,
        enabled: true
      })
    });
    
    showAlert('youtubeStatus', '✅ YouTube channels saved successfully!', 'success', 3000);
  } catch (error) {
    console.error('Error saving YouTube config:', error);
    showAlert('youtubeStatus', `❌ Error: ${error.message}`, 'error');
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showAlert(elementId, message, type, duration = 5000) {
  const alertEl = document.getElementById(elementId);
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type}`;
  
  if (duration > 0) {
    setTimeout(() => {
      alertEl.className = 'alert hidden';
    }, duration);
  }
}

async function saveNotificationChannel() {
  const channelId = document.getElementById('notificationChannelInput').value.trim();
  if (!channelId) {
    showAlert('notificationStatus', 'Please enter a channel ID', 'error');
    return;
  }
  showAlert('notificationStatus', `✅ Notification channel set to ${channelId}`, 'success', 3000);
}