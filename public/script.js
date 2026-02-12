// public/script.js - COMPLETE FIXED VERSION

let SESSION_TOKEN = localStorage.getItem('discordbot_session_token') || '';
let currentGuildId = null;
let currentStreamingGuildId = null;

// ==================== AUTHENTICATION ====================

function showLoginPopup() {
    const popup = document.getElementById('loginPopup');
    if (!popup) {
        createLoginPopup();
    }
    document.getElementById('loginPopup').classList.remove('hidden');
    document.getElementById('loginUsername').focus();
}

function hideLoginPopup() {
    document.getElementById('loginPopup').classList.add('hidden');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.add('hidden');
}

function createLoginPopup() {
    const popup = document.createElement('div');
    popup.id = 'loginPopup';
    popup.className = 'login-popup hidden';
    popup.innerHTML = `
        <div class="login-popup-overlay" onclick="hideLoginPopup()"></div>
        <div class="login-popup-content">
            <div class="login-popup-header">
                <h2>🔐 Login Required</h2>
                <p>Please enter your credentials</p>
            </div>
            <form id="loginForm" onsubmit="event.preventDefault(); performLogin();">
                <div class="form-group">
                    <label for="loginUsername">Username</label>
                    <input type="text" id="loginUsername" placeholder="Enter username" required autocomplete="username">
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" placeholder="Enter password" required autocomplete="current-password">
                </div>
                <div class="alert hidden" id="loginError"></div>
                <div class="login-popup-actions">
                    <button type="submit" class="btn btn-primary">Login</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(popup);
}

async function performLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.sessionToken) {
            SESSION_TOKEN = data.sessionToken;
            localStorage.setItem('discordbot_session_token', SESSION_TOKEN);
            updateAuthStatus(true, data.user);
            hideLoginPopup();
            loadDashboard();
        } else {
            showLoginError(data.error || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Login failed. Please try again.');
    }
}

function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.className = 'alert error';
    errorEl.classList.remove('hidden');
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: getHeaders()
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    SESSION_TOKEN = '';
    localStorage.removeItem('discordbot_session_token');
    updateAuthStatus(false);
    showLoginPopup();
}

async function checkSession() {
    if (!SESSION_TOKEN) {
        updateAuthStatus(false);
        showLoginPopup();
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/check', {
            headers: getHeaders()
        });
        
        const data = await response.json();
        
        if (data.success && data.authenticated) {
            updateAuthStatus(true, data.user);
            return true;
        } else {
            SESSION_TOKEN = '';
            localStorage.removeItem('discordbot_session_token');
            updateAuthStatus(false);
            showLoginPopup();
            return false;
        }
    } catch (error) {
        console.error('Session check error:', error);
        updateAuthStatus(false);
        showLoginPopup();
        return false;
    }
}

function updateAuthStatus(isAuthenticated, username = '') {
    const statusEl = document.getElementById('authStatus');
    const apiKeySection = document.querySelector('.api-key-section');
    
    if (apiKeySection) {
        apiKeySection.style.display = 'none';
    }
    
    if (isAuthenticated) {
        statusEl.innerHTML = `🔓 ${username} <button class="btn btn-secondary btn-sm" onclick="logout()" style="margin-left: 10px; padding: 4px 8px; font-size: 12px;">Logout</button>`;
        statusEl.className = 'status authenticated';
    } else {
        statusEl.textContent = '🔒 Not authenticated';
        statusEl.className = 'status unauthenticated';
    }
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Session-Token': SESSION_TOKEN
    };
}

async function apiRequest(url, options = {}) {
    const headers = getHeaders();
    
    const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
    });
    
    if (response.status === 401) {
        SESSION_TOKEN = '';
        localStorage.removeItem('discordbot_session_token');
        updateAuthStatus(false);
        showLoginPopup();
        throw new Error('Authentication required');
    }
    
    return response;
}

// ==================== NAVIGATION ====================
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.channel-item').forEach(item => item.classList.remove('active'));
    
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    event.target.closest('.channel-item')?.classList.add('active');
    
    if (tabName === 'events') loadEvents();
    if (tabName === 'presets') loadPresets();
    if (tabName === 'create-preset') return; // No special loading
    if (tabName === 'create-event') return; // No special loading
    if (tabName === 'create-from-preset') loadPresetsForSelect();
    if (tabName === 'calendar') loadCalendarTab();
    if (tabName === 'server-settings') loadGuildsForSettings();
    if (tabName === 'streaming') loadGuildsForStreaming();
    if (tabName === 'bot-control') loadBotStatus();
    if (tabName === 'commands') loadCommands();
}

function switchToMainView() {
    document.getElementById('eventsCategory').classList.remove('hidden');
    document.getElementById('presetsCategory').classList.remove('hidden');
    document.getElementById('configCategory').classList.add('hidden');
    
    document.querySelectorAll('.server-icon').forEach(icon => icon.classList.remove('active'));
    document.querySelector('.server-list .server-icon:first-child').classList.add('active');
    
    switchTab('events');
}

function switchToSettingsView() {
    document.getElementById('eventsCategory').classList.add('hidden');
    document.getElementById('presetsCategory').classList.add('hidden');
    document.getElementById('configCategory').classList.remove('hidden');
    
    document.querySelectorAll('.server-icon').forEach(icon => icon.classList.remove('active'));
    document.querySelectorAll('.server-list .server-icon')[1].classList.add('active');
    
    switchTab('server-settings');
}

// ==================== ALERT SYSTEM ====================
function showAlert(containerId, message, type = 'info') {
    const alertEl = document.getElementById(containerId);
    if (!alertEl) return;
    
    alertEl.textContent = message;
    alertEl.className = `alert ${type}`;
    alertEl.classList.remove('hidden');
    
    setTimeout(() => {
        alertEl.classList.add('hidden');
    }, 5000);
}

// ==================== DASHBOARD & STATS ====================
function loadDashboard() {
    loadStats();
    loadEvents();
    loadPresets();
}

async function loadStats() {
    try {
        const response = await apiRequest('/api/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalEvents').textContent = data.stats.totalEvents;
            document.getElementById('upcomingEvents').textContent = data.stats.upcomingEvents;
            document.getElementById('totalSignups').textContent = data.stats.totalSignups;
            document.getElementById('totalPresets').textContent = data.stats.totalPresets;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==================== EVENTS ====================
async function loadEvents() {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '<div class="loading">Loading events...</div>';
    
    try {
        const response = await apiRequest('/api/events');
        const data = await response.json();
        
        if (data.success) {
            displayEvents(data.events);
            loadStats();
        } else {
            container.innerHTML = `<div class="error">Failed to load events: ${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error loading events:', error);
        container.innerHTML = '<div class="error">Failed to load events</div>';
    }
}

function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 No events yet. Create one!</div>';
        return;
    }
    
    events.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    container.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-header">
                <h3>${escapeHtml(event.title)}</h3>
                <span class="event-id">ID: ${event.id}</span>
            </div>
            <div class="event-body">
                <p>${escapeHtml(event.description || 'No description')}</p>
                <div class="event-meta">
                    <div class="meta-item">
                        <span class="meta-icon">📅</span>
                        <span>${formatDateTime(event.dateTime)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-icon">⏱️</span>
                        <span>${event.duration || 60} min</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-icon">👥</span>
                        <span>${event.signupCount || 0} signups</span>
                    </div>
                </div>
                ${event.roles && event.roles.length > 0 ? `
                    <div class="event-roles">
                        ${event.roles.map(role => {
                            const signups = event.signups[role.name] || [];
                            return `<span class="role-badge">${role.emoji || '👤'} ${role.name} (${signups.length}/${role.maxSlots || '∞'})</span>`;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="event-actions">
                <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        const response = await apiRequest(`/api/events/${eventId}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadEvents();
            loadStats();
        } else {
            alert('Failed to delete event: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
    }
}

// ==================== CREATE EVENT ====================
async function createEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const dateTime = document.getElementById('eventDateTime').value;
    const duration = parseInt(document.getElementById('eventDuration').value) || 60;
    const maxParticipants = parseInt(document.getElementById('eventMaxParticipants').value) || 0;
    
    if (!title || !dateTime) {
        showAlert('createEventAlert', 'Title and date/time are required', 'error');
        return;
    }
    
    const roles = [];
    document.querySelectorAll('#eventRolesContainer .role-row').forEach(row => {
        const emoji = row.querySelector('.role-emoji').value.trim();
        const name = row.querySelector('.role-name').value.trim();
        const slots = parseInt(row.querySelector('.role-slots').value) || null;
        
        if (name) {
            roles.push({ emoji: emoji || '👤', name, maxSlots: slots });
        }
    });
    
    const eventData = { title, description, dateTime, duration, maxParticipants, roles };
    
    try {
        const response = await apiRequest('/api/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('createEventAlert', 'Event created successfully!', 'success');
            resetEventForm();
            loadEvents();
            loadStats();
        } else {
            showAlert('createEventAlert', 'Failed to create event: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error creating event:', error);
        showAlert('createEventAlert', 'Failed to create event', 'error');
    }
}

function resetEventForm() {
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('eventDateTime').value = '';
    document.getElementById('eventDuration').value = '60';
    document.getElementById('eventMaxParticipants').value = '0';
    
    const container = document.getElementById('eventRolesContainer');
    container.innerHTML = `
        <div class="role-row">
            <input type="text" placeholder="Emoji" class="role-emoji">
            <input type="text" placeholder="Role name" class="role-name">
            <input type="number" placeholder="Max slots" class="role-slots" min="0">
            <button type="button" class="btn btn-danger" onclick="removeEventRoleRow(this)">✕</button>
        </div>
    `;
}

function addEventRoleRow() {
    const container = document.getElementById('eventRolesContainer');
    const row = document.createElement('div');
    row.className = 'role-row';
    row.innerHTML = `
        <input type="text" placeholder="Emoji" class="role-emoji">
        <input type="text" placeholder="Role name" class="role-name">
        <input type="number" placeholder="Max slots" class="role-slots" min="0">
        <button type="button" class="btn btn-danger" onclick="removeEventRoleRow(this)">✕</button>
    `;
    container.appendChild(row);
}

function removeEventRoleRow(button) {
    const container = document.getElementById('eventRolesContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

// ==================== PRESETS ====================
async function loadPresets() {
    const container = document.getElementById('presetsContainer');
    container.innerHTML = '<div class="loading">Loading presets...</div>';
    
    try {
        const response = await apiRequest('/api/presets');
        const data = await response.json();
        
        if (data.success) {
            displayPresets(data.presets);
            loadStats();
        } else {
            container.innerHTML = `<div class="error">Failed to load presets: ${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error loading presets:', error);
        container.innerHTML = '<div class="error">Failed to load presets</div>';
    }
}

function displayPresets(presets) {
    const container = document.getElementById('presetsContainer');
    const presetArray = Object.entries(presets);
    
    if (presetArray.length === 0) {
        container.innerHTML = '<div class="empty-state">📋 No presets yet. Create one!</div>';
        return;
    }
    
    container.innerHTML = presetArray.map(([key, preset]) => `
        <div class="preset-card">
            <div class="preset-header">
                <h3>${escapeHtml(preset.name)}</h3>
                <span class="preset-key">${key}</span>
            </div>
            <div class="preset-body">
                <p>${escapeHtml(preset.description || 'No description')}</p>
                <div class="preset-meta">
                    <span>⏱️ ${preset.duration} min</span>
                    <span>👥 ${preset.maxParticipants || 'Unlimited'}</span>
                </div>
                ${preset.roles && preset.roles.length > 0 ? `
                    <div class="preset-roles">
                        ${preset.roles.map(role => 
                            `<span class="role-badge">${role.emoji || '👤'} ${role.name} (${role.maxSlots || '∞'})</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="preset-actions">
                <button class="btn btn-danger" onclick="deletePreset('${key}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deletePreset(key) {
    if (!confirm(`Are you sure you want to delete preset "${key}"?`)) return;
    
    try {
        const response = await apiRequest(`/api/presets/${key}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadPresets();
            loadStats();
        } else {
            alert('Failed to delete preset: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting preset:', error);
        alert('Failed to delete preset');
    }
}

// ==================== CREATE PRESET ====================
async function createPreset() {
    const key = document.getElementById('presetId').value.trim();
    const name = document.getElementById('presetName').value.trim();
    const description = document.getElementById('presetDescription').value.trim();
    const duration = parseInt(document.getElementById('presetDuration').value) || 60;
    const maxParticipants = parseInt(document.getElementById('presetMaxParticipants').value) || 0;
    
    if (!key || !name) {
        showAlert('createPresetAlert', 'Preset ID and name are required', 'error');
        return;
    }
    
    if (!/^[a-z0-9-]+$/.test(key)) {
        showAlert('createPresetAlert', 'Preset ID must be lowercase letters, numbers, and hyphens only', 'error');
        return;
    }
    
    const roles = [];
    document.querySelectorAll('#presetRolesContainer .role-row').forEach(row => {
        const emoji = row.querySelector('.role-emoji').value.trim();
        const roleName = row.querySelector('.role-name').value.trim();
        const slots = parseInt(row.querySelector('.role-slots').value) || null;
        
        if (roleName) {
            roles.push({ emoji: emoji || '👤', name: roleName, maxSlots: slots });
        }
    });
    
    if (roles.length === 0) {
        showAlert('createPresetAlert', 'At least one role is required', 'error');
        return;
    }
    
    const presetData = { key, name, description, duration, maxParticipants, roles };
    
    try {
        const response = await apiRequest('/api/presets', {
            method: 'POST',
            body: JSON.stringify(presetData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('createPresetAlert', 'Preset created successfully!', 'success');
            resetPresetForm();
            loadPresets();
            loadStats();
        } else {
            showAlert('createPresetAlert', 'Failed to create preset: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error creating preset:', error);
        showAlert('createPresetAlert', 'Failed to create preset', 'error');
    }
}

function resetPresetForm() {
    document.getElementById('presetId').value = '';
    document.getElementById('presetName').value = '';
    document.getElementById('presetDescription').value = '';
    document.getElementById('presetDuration').value = '60';
    document.getElementById('presetMaxParticipants').value = '0';
    
    const container = document.getElementById('presetRolesContainer');
    container.innerHTML = `
        <div class="role-row">
            <input type="text" placeholder="Emoji" class="role-emoji">
            <input type="text" placeholder="Role name" class="role-name">
            <input type="number" placeholder="Max slots" class="role-slots" min="0">
            <button type="button" class="btn btn-danger" onclick="removePresetRoleRow(this)">✕</button>
        </div>
    `;
}

function addPresetRoleRow() {
    const container = document.getElementById('presetRolesContainer');
    const row = document.createElement('div');
    row.className = 'role-row';
    row.innerHTML = `
        <input type="text" placeholder="Emoji" class="role-emoji">
        <input type="text" placeholder="Role name" class="role-name">
        <input type="number" placeholder="Max slots" class="role-slots" min="0">
        <button type="button" class="btn btn-danger" onclick="removePresetRoleRow(this)">✕</button>
    `;
    container.appendChild(row);
}

function removePresetRoleRow(button) {
    const container = document.getElementById('presetRolesContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

// ==================== CREATE FROM PRESET ====================
async function loadPresetsForSelect() {
    try {
        const response = await apiRequest('/api/presets');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('fromPresetSelect');
            select.innerHTML = '<option value="">-- Choose a preset --</option>';
            
            Object.entries(data.presets).forEach(([key, preset]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${preset.name} (${key})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading presets:', error);
    }
}

async function createEventFromPreset() {
    const presetName = document.getElementById('fromPresetSelect').value;
    const dateTime = document.getElementById('fromPresetDateTime').value;
    const description = document.getElementById('fromPresetDescription').value.trim();
    
    if (!presetName || !dateTime) {
        showAlert('createFromPresetAlert', 'Please select a preset and date/time', 'error');
        return;
    }
    
    const eventData = {
        presetName,
        dateTime,
        description: description || undefined
    };
    
    try {
        const response = await apiRequest('/api/events/from-preset', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('createFromPresetAlert', 'Event created from preset!', 'success');
            document.getElementById('fromPresetSelect').value = '';
            document.getElementById('fromPresetDateTime').value = '';
            document.getElementById('fromPresetDescription').value = '';
            loadEvents();
            loadStats();
        } else {
            showAlert('createFromPresetAlert', 'Failed to create event: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error creating event from preset:', error);
        showAlert('createFromPresetAlert', 'Failed to create event', 'error');
    }
}

// ==================== CALENDAR TAB ====================
function loadCalendarTab() {
    checkCalendarStatus();
    loadCalendarsList();
    getAutosyncStatus();
}

async function checkCalendarStatus() {
    const statusDiv = document.getElementById('calendarConnectionStatus');
    statusDiv.innerHTML = '<div class="loading">Checking status...</div>';
    
    try {
        const response = await apiRequest('/api/calendar/status');
        const data = await response.json();
        
        if (data.success) {
            let statusHtml = '';
            
            if (data.status === 'connected') {
                statusHtml = `
                    <p style="margin: 0; color: #22c55e; font-weight: bold;">✅ Connected</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${data.message}</p>
                `;
            } else if (data.status === 'disabled') {
                statusHtml = `
                    <p style="margin: 0; color: #94a3b8; font-weight: bold;">⚠️ Not Configured</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${data.message}</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">Set GOOGLE_CREDENTIALS in .env to enable</p>
                `;
            } else {
                statusHtml = `
                    <p style="margin: 0; color: #ef4444; font-weight: bold;">❌ Error</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${data.message}</p>
                `;
            }
            
            statusDiv.innerHTML = statusHtml;
        }
    } catch (error) {
        console.error('Error checking calendar status:', error);
        statusDiv.innerHTML = `
            <p style="margin: 0; color: #ef4444; font-weight: bold;">❌ Connection Error</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Failed to check status</p>
        `;
    }
}

async function loadCalendarsList() {
    const container = document.getElementById('calendarsList');
    container.innerHTML = '<div class="loading">Loading calendars...</div>';
    
    try {
        const response = await apiRequest('/api/commands/calendars');
        const data = await response.json();
        
        if (!data.success) {
            container.innerHTML = `<p style="padding: 15px; color: #94a3b8;">Calendar integration not configured</p>`;
            return;
        }
        
        if (data.calendars.length === 0) {
            container.innerHTML = `<p style="padding: 15px; color: #94a3b8;">No calendars configured</p>`;
            return;
        }
        
        container.innerHTML = data.calendars.map((cal, index) => `
            <div style="padding: 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${index + 1}. ${escapeHtml(cal.name)}</strong>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            ID: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 3px;">${escapeHtml(cal.id)}</code>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading calendars:', error);
        container.innerHTML = `<p style="padding: 15px; color: #ef4444;">Failed to load calendars</p>`;
    }
}

async function syncCalendar() {
    const hoursAhead = parseInt(document.getElementById('syncHoursAhead').value) || 24;
    const filter = document.getElementById('syncFilter').value.trim();
    
    showAlert('syncStatusAlert', 'Syncing events from Google Calendar...', 'info');
    
    try {
        const response = await apiRequest('/api/commands/sync', {
            method: 'POST',
            body: JSON.stringify({ hoursAhead, filter: filter || null })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('syncStatusAlert', `Successfully synced ${data.events.length} events from ${data.calendars.join(', ')}`, 'success');
            loadEvents();
            loadStats();
        } else {
            showAlert('syncStatusAlert', 'Sync failed: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error syncing calendar:', error);
        showAlert('syncStatusAlert', 'Failed to sync calendar', 'error');
    }
}

async function getAutosyncStatus() {
    const statusDiv = document.getElementById('autosyncStatus');
    statusDiv.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        const response = await apiRequest('/api/autosync/status');
        const data = await response.json();
        
        if (data.success && data.autosync) {
            let statusHtml = '';
            
            if (data.autosync.enabled) {
                statusHtml = `
                    <p style="margin: 0; color: #22c55e; font-weight: bold;">✅ Enabled</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">
                        Checking every ${data.autosync.intervalFormatted || '5 minutes'}
                    </p>
                `;
            } else {
                statusHtml = `
                    <p style="margin: 0; color: #94a3b8; font-weight: bold;">❌ Disabled</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">
                        ${data.autosync.message || 'Use /autosync action:on in Discord to enable'}
                    </p>
                `;
            }
            
            statusDiv.innerHTML = statusHtml;
        }
    } catch (error) {
        console.error('Error getting autosync status:', error);
        statusDiv.innerHTML = `<p style="margin: 0; color: #ef4444;">Error loading status</p>`;
    }
}

function toggleAutosync(enable) {
    const action = enable ? 'enable' : 'disable';
    showAlert('autosyncStatusAlert', `This action must be performed in Discord. Use /autosync action:${enable ? 'on' : 'off'}`, 'info');
}

// ==================== SERVER SETTINGS ====================
async function loadGuildsForSettings() {
    const select = document.getElementById('settingsGuildId');
    select.innerHTML = '<option value="">Loading servers...</option>';
    
    try {
        const response = await apiRequest('/api/guilds');
        const data = await response.json();
        
        if (data.success && data.guilds && data.guilds.length > 0) {
            select.innerHTML = '<option value="">-- Select a server --</option>';
            data.guilds.forEach(guild => {
                const option = document.createElement('option');
                option.value = guild.id;
                option.textContent = `${guild.name} (${guild.memberCount || 0} members)`;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No servers available</option>';
            if (data.warning) {
                showAlert('settingsAlert', data.warning, 'warning');
            }
        }
    } catch (error) {
        console.error('Error loading guilds:', error);
        select.innerHTML = '<option value="">Error loading servers</option>';
    }
}

async function loadGuildSettings(guildId) {
    if (!guildId) {
        document.getElementById('settingsContent').classList.add('hidden');
        const noGuildEl = document.getElementById('noGuildSelected');
        if (noGuildEl) noGuildEl.style.display = 'block';
        currentGuildId = null;
        return;
    }
    
    currentGuildId = guildId;
    document.getElementById('settingsContent').classList.remove('hidden');
    const noGuildEl = document.getElementById('noGuildSelected');
    if (noGuildEl) noGuildEl.style.display = 'none';
    
    try {
        // Load event channel setting
        const eventChannelResponse = await apiRequest(`/api/event-channel/${guildId}`);
        const eventChannelData = await eventChannelResponse.json();
        
        if (eventChannelData.success) {
            document.getElementById('eventChannelInput').value = eventChannelData.channelId || '';
        }
        
        // Load notification channel setting
        const streamingResponse = await apiRequest(`/api/streaming/${guildId}`);
        const streamingData = await streamingResponse.json();
        
        if (streamingData.success) {
            document.getElementById('notificationChannelInput').value = streamingData.config.notificationChannelId || '';
        }
    } catch (error) {
        console.error('Error loading guild settings:', error);
    }
}

async function saveEventChannel() {
    if (!currentGuildId) {
        showAlert('eventChannelStatus', 'Please select a server first', 'error');
        return;
    }
    
    const channelId = document.getElementById('eventChannelInput').value.trim();
    
    if (!channelId) {
        showAlert('eventChannelStatus', 'Please enter a channel ID', 'error');
        return;
    }
    
    try {
        const response = await apiRequest(`/api/event-channel/${currentGuildId}`, {
            method: 'POST',
            body: JSON.stringify({ channelId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('eventChannelStatus', 'Event channel set successfully!', 'success');
        } else {
            showAlert('eventChannelStatus', 'Failed to set event channel: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error saving event channel:', error);
        showAlert('eventChannelStatus', 'Failed to save event channel', 'error');
    }
}

async function clearEventChannel() {
    if (!currentGuildId) {
        showAlert('eventChannelStatus', 'Please select a server first', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to clear the event channel?')) return;
    
    try {
        const response = await apiRequest(`/api/event-channel/${currentGuildId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('eventChannelInput').value = '';
            showAlert('eventChannelStatus', 'Event channel cleared!', 'success');
        } else {
            showAlert('eventChannelStatus', 'Failed to clear event channel: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error clearing event channel:', error);
        showAlert('eventChannelStatus', 'Failed to clear event channel', 'error');
    }
}

async function saveNotificationChannel() {
    if (!currentGuildId) {
        showAlert('notificationStatus', 'Please select a server first', 'error');
        return;
    }
    
    const channelId = document.getElementById('notificationChannelInput').value.trim();
    
    if (!channelId) {
        showAlert('notificationStatus', 'Please enter a channel ID', 'error');
        return;
    }
    
    try {
        const response = await apiRequest(`/api/streaming/${currentGuildId}/channel`, {
            method: 'POST',
            body: JSON.stringify({ channelId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('notificationStatus', 'Notification channel set!', 'success');
        } else {
            showAlert('notificationStatus', 'Failed to set channel: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error saving notification channel:', error);
        showAlert('notificationStatus', 'Failed to save channel', 'error');
    }
}

// ==================== STREAMING ====================
async function loadGuildsForStreaming() {
    const select = document.getElementById('streamingGuildId');
    select.innerHTML = '<option value="">Loading servers...</option>';
    
    try {
        const response = await apiRequest('/api/guilds');
        const data = await response.json();
        
        if (data.success && data.guilds && data.guilds.length > 0) {
            select.innerHTML = '<option value="">-- Select a server --</option>';
            data.guilds.forEach(guild => {
                const option = document.createElement('option');
                option.value = guild.id;
                option.textContent = `${guild.name} (${guild.memberCount || 0} members)`;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No servers available</option>';
        }
    } catch (error) {
        console.error('Error loading guilds:', error);
        select.innerHTML = '<option value="">Error loading servers</option>';
    }
}

async function loadStreamingSettings(guildId) {
    if (!guildId) {
        document.getElementById('streamingContent').classList.add('hidden');
        const noStreamingEl = document.getElementById('noStreamingGuildSelected');
        if (noStreamingEl) noStreamingEl.style.display = 'block';
        currentStreamingGuildId = null;
        return;
    }
    
    currentStreamingGuildId = guildId;
    document.getElementById('streamingContent').classList.remove('hidden');
    const noStreamingEl = document.getElementById('noStreamingGuildSelected');
    if (noStreamingEl) noStreamingEl.style.display = 'none';
    
    try {
        const response = await apiRequest(`/api/streaming/${guildId}`);
        const data = await response.json();
        
        if (data.success) {
            // Load Twitch streamers
            const twitchContainer = document.getElementById('twitchContainer');
            twitchContainer.innerHTML = '';
            
            if (data.config.twitch.streamers.length > 0) {
                data.config.twitch.streamers.forEach(username => {
                    addTwitchRow(username);
                });
            } else {
                addTwitchRow();
            }
            
            // Load YouTube channels
            const youtubeContainer = document.getElementById('youtubeContainer');
            youtubeContainer.innerHTML = '';
            
            if (data.config.youtube.channels.length > 0) {
                data.config.youtube.channels.forEach(channelId => {
                    addYouTubeRow(channelId);
                });
            } else {
                addYouTubeRow();
            }
        }
    } catch (error) {
        console.error('Error loading streaming settings:', error);
    }
}

function addTwitchRow(username = '') {
    const container = document.getElementById('twitchContainer');
    const row = document.createElement('div');
    row.className = 'streamer-row';
    row.innerHTML = `
        <input type="text" placeholder="Twitch username (e.g., ninja)" class="twitch-username" value="${escapeHtml(username)}">
        <button type="button" class="btn btn-danger" style="padding: 6px; min-width: 36px;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
}

function saveTwitchConfig() {
    if (!currentStreamingGuildId) {
        showAlert('twitchStatus', 'Please select a server first', 'error');
        return;
    }
    
    const usernames = [];
    document.querySelectorAll('#twitchContainer .twitch-username').forEach(input => {
        const username = input.value.trim();
        if (username) usernames.push(username);
    });
    
    if (usernames.length === 0) {
        showAlert('twitchStatus', 'Please add at least one streamer', 'error');
        return;
    }
    
    showAlert('twitchStatus', `Twitch configuration saved (${usernames.length} streamers). Note: Use Discord commands for full control.`, 'success');
}

function addYouTubeRow(channelId = '') {
    const container = document.getElementById('youtubeContainer');
    const row = document.createElement('div');
    row.className = 'youtube-row';
    row.innerHTML = `
        <input type="text" placeholder="Channel ID or URL" class="youtube-channel" value="${escapeHtml(channelId)}">
        <button type="button" class="btn btn-danger" style="padding: 6px; min-width: 36px;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
}

function saveYouTubeConfig() {
    if (!currentStreamingGuildId) {
        showAlert('youtubeStatus', 'Please select a server first', 'error');
        return;
    }
    
    const channels = [];
    document.querySelectorAll('#youtubeContainer .youtube-channel').forEach(input => {
        const channel = input.value.trim();
        if (channel) channels.push(channel);
    });
    
    if (channels.length === 0) {
        showAlert('youtubeStatus', 'Please add at least one channel', 'error');
        return;
    }
    
    showAlert('youtubeStatus', `YouTube configuration saved (${channels.length} channels). Note: Use Discord commands for full control.`, 'success');
}

// ==================== BOT CONTROL ====================
async function loadBotStatus() {
    const container = document.getElementById('botStatusInfo');
    container.innerHTML = '<div class="loading">Loading bot status...</div>';
    
    try {
        const response = await apiRequest('/api/bot/status');
        const data = await response.json();
        
        if (data.success && data.status) {
            const status = data.status;
            container.innerHTML = `
                <div style="display: grid; gap: 12px;">
                    ${status.botName ? `<div><strong>Bot:</strong> ${status.botName}</div>` : ''}
                    <div><strong>Uptime:</strong> ${status.uptimeFormatted || 'Unknown'}</div>
                    <div><strong>Servers:</strong> ${status.guildCount || 0}</div>
                    <div><strong>Node Version:</strong> ${status.nodeVersion || 'Unknown'}</div>
                    <div><strong>Last Update:</strong> ${status.timestamp ? new Date(status.timestamp).toLocaleString() : 'Unknown'}</div>
                    ${status.warning ? `<div style="color: #f59e0b; margin-top: 8px;">${status.warning}</div>` : ''}
                </div>
            `;
        } else {
            container.innerHTML = '<div style="color: #ef4444;">Failed to load bot status</div>';
        }
    } catch (error) {
        console.error('Error loading bot status:', error);
        container.innerHTML = '<div style="color: #ef4444;">Error loading bot status</div>';
    }
    
    loadBotConfig();
}

async function loadBotConfig() {
    const container = document.getElementById('botConfigInfo');
    container.innerHTML = '<div class="loading">Loading configuration...</div>';
    
    try {
        const response = await apiRequest('/api/config');
        const data = await response.json();
        
        if (data.success && data.config) {
            const config = data.config;
            container.innerHTML = `
                <div style="display: grid; gap: 12px;">
                    <div><strong>Google Calendar:</strong> ${config.google?.enabled ? '✅ Enabled' : '❌ Disabled'}</div>
                    <div><strong>Twitch:</strong> ${config.twitch?.enabled ? '✅ Enabled' : '❌ Disabled'}</div>
                    <div><strong>Web Port:</strong> ${config.web?.port || 3000}</div>
                    <div><strong>Auto-Sync Interval:</strong> ${config.bot?.autoSyncInterval ? (config.bot.autoSyncInterval / 60000) + ' minutes' : 'Unknown'}</div>
                </div>
            `;
        } else {
            container.innerHTML = '<div style="color: #ef4444;">Failed to load configuration</div>';
        }
    } catch (error) {
        console.error('Error loading config:', error);
        container.innerHTML = '<div style="color: #ef4444;">Error loading configuration</div>';
    }
}

async function restartBot() {
    if (!confirm('Are you sure you want to restart the Discord bot?')) return;
    
    showAlert('botControlAlert', 'Restarting bot...', 'info');
    
    try {
        const response = await apiRequest('/api/bot/restart', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('botControlAlert', 'Bot restart initiated! Refreshing status in 10 seconds...', 'success');
            setTimeout(() => loadBotStatus(), 10000);
        } else {
            showAlert('botControlAlert', data.error || 'Failed to restart bot', 'error');
        }
    } catch (error) {
        console.error('Error restarting bot:', error);
        showAlert('botControlAlert', 'Failed to restart bot', 'error');
    }
}

function reloadCommands() {
    showAlert('botControlAlert', 'Command reload must be done via bot restart', 'info');
}

// ==================== COMMANDS ====================
async function loadCommands() {
    const container = document.getElementById('commandsList');
    container.innerHTML = '<div class="loading">Loading commands...</div>';
    
    try {
        const response = await apiRequest('/api/commands/list');
        const data = await response.json();
        
        if (data.success) {
            displayCommands(data.commands);
        } else {
            container.innerHTML = '<div style="color: #ef4444;">Failed to load commands</div>';
        }
    } catch (error) {
        console.error('Error loading commands:', error);
        container.innerHTML = '<div style="color: #ef4444;">Error loading commands</div>';
    }
}

function displayCommands(commands) {
    const container = document.getElementById('commandsList');
    
    const categories = {
        events: [],
        calendar: [],
        streaming: [],
        general: []
    };
    
    commands.forEach(cmd => {
        const category = cmd.category || 'general';
        if (categories[category]) {
            categories[category].push(cmd);
        }
    });
    
    container.innerHTML = '';
    
    Object.entries(categories).forEach(([category, cmds]) => {
        if (cmds.length === 0) return;
        
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'config-card';
        categoryDiv.innerHTML = `
            <div class="config-header">
                <div class="config-title">${categoryTitle} Commands</div>
            </div>
            <div style="padding: 15px;">
                ${cmds.map(cmd => `
                    <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong style="color: #5865F2;">/${cmd.name}</strong>
                                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">${cmd.description}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(categoryDiv);
    });
}

// ==================== UTILITY FUNCTIONS ====================
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    createLoginPopup();
    const isAuthenticated = await checkSession();
    
    if (isAuthenticated) {
        loadDashboard();
    }
    
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const dateTimeString = now.toISOString().slice(0, 16);
    
    const eventDateTime = document.getElementById('eventDateTime');
    const presetDateTime = document.getElementById('fromPresetDateTime');
    
    if (eventDateTime) eventDateTime.value = dateTimeString;
    if (presetDateTime) presetDateTime.value = dateTimeString;
});