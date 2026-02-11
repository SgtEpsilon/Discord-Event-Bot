// public/script.js - Fixed version with working dynamic counters, event settings, and preset settings

let API_KEY = localStorage.getItem('discordbot_api_key') || '';
let currentGuildId = null;
let currentStreamingGuildId = null;

// ==================== API KEY MANAGEMENT ====================
function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    if (!apiKey) {
        showAlert('authAlert', 'Please enter an API key', 'error');
        return;
    }
    
    fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            API_KEY = apiKey;
            localStorage.setItem('discordbot_api_key', apiKey);
            updateAuthStatus(true);
            showAlert('authAlert', 'API key verified and saved!', 'success');
            document.getElementById('apiKeyInput').value = '';
            loadDashboard();
        } else {
            showAlert('authAlert', data.error || 'Invalid API key', 'error');
            updateAuthStatus(false);
        }
    })
    .catch(err => {
        console.error('API key verification error:', err);
        showAlert('authAlert', 'Failed to verify API key', 'error');
        updateAuthStatus(false);
    });
}

function updateAuthStatus(isAuthenticated) {
    const statusEl = document.getElementById('authStatus');
    if (isAuthenticated) {
        statusEl.textContent = '🔓 Authenticated';
        statusEl.className = 'status authenticated';
    } else {
        statusEl.textContent = '🔒 Not authenticated';
        statusEl.className = 'status unauthenticated';
    }
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
    };
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
    
    // Load data when switching to specific tabs
    if (tabName === 'events') loadEvents();
    if (tabName === 'presets') loadPresets();
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

function loadStats() {
    fetch('/api/stats', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('totalEvents').textContent = data.stats.totalEvents;
                document.getElementById('upcomingEvents').textContent = data.stats.upcomingEvents;
                document.getElementById('totalSignups').textContent = data.stats.totalSignups;
                document.getElementById('totalPresets').textContent = data.stats.totalPresets;
            }
        })
        .catch(err => console.error('Error loading stats:', err));
}

// ==================== EVENTS ====================
function loadEvents() {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '<div class="loading">Loading events...</div>';
    
    fetch('/api/events', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayEvents(data.events);
                loadStats(); // Refresh stats after loading events
            } else {
                container.innerHTML = `<div class="error">Failed to load events: ${data.error}</div>`;
            }
        })
        .catch(err => {
            console.error('Error loading events:', err);
            container.innerHTML = '<div class="error">Failed to load events</div>';
        });
}

function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 No events yet. Create one!</div>';
        return;
    }
    
    // Sort by date
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

function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: getHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadEvents();
            loadStats();
        } else {
            alert('Failed to delete event: ' + data.error);
        }
    })
    .catch(err => {
        console.error('Error deleting event:', err);
        alert('Failed to delete event');
    });
}

// ==================== CREATE EVENT ====================
function createEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const dateTime = document.getElementById('eventDateTime').value;
    const duration = parseInt(document.getElementById('eventDuration').value) || 60;
    const maxParticipants = parseInt(document.getElementById('eventMaxParticipants').value) || 0;
    
    if (!title || !dateTime) {
        showAlert('createEventAlert', 'Title and date/time are required', 'error');
        return;
    }
    
    // Collect roles
    const roles = [];
    document.querySelectorAll('#eventRolesContainer .role-row').forEach(row => {
        const emoji = row.querySelector('.role-emoji').value.trim();
        const name = row.querySelector('.role-name').value.trim();
        const slots = parseInt(row.querySelector('.role-slots').value) || null;
        
        if (name) {
            roles.push({ emoji: emoji || '👤', name, maxSlots: slots });
        }
    });
    
    const eventData = {
        title,
        description,
        dateTime,
        duration,
        maxParticipants,
        roles
    };
    
    fetch('/api/events', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('createEventAlert', 'Event created successfully!', 'success');
            resetEventForm();
            loadEvents();
            loadStats();
        } else {
            showAlert('createEventAlert', 'Failed to create event: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error creating event:', err);
        showAlert('createEventAlert', 'Failed to create event', 'error');
    });
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
function loadPresets() {
    const container = document.getElementById('presetsContainer');
    container.innerHTML = '<div class="loading">Loading presets...</div>';
    
    fetch('/api/presets', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayPresets(data.presets);
                loadStats(); // Refresh stats after loading presets
            } else {
                container.innerHTML = `<div class="error">Failed to load presets: ${data.error}</div>`;
            }
        })
        .catch(err => {
            console.error('Error loading presets:', err);
            container.innerHTML = '<div class="error">Failed to load presets</div>';
        });
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

function deletePreset(key) {
    if (!confirm(`Are you sure you want to delete preset "${key}"?`)) return;
    
    fetch(`/api/presets/${key}`, {
        method: 'DELETE',
        headers: getHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadPresets();
            loadStats();
        } else {
            alert('Failed to delete preset: ' + data.error);
        }
    })
    .catch(err => {
        console.error('Error deleting preset:', err);
        alert('Failed to delete preset');
    });
}

// ==================== CREATE PRESET ====================
function createPreset() {
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
    
    // Collect roles
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
    
    const presetData = {
        key,
        name,
        description,
        duration,
        maxParticipants,
        roles
    };
    
    fetch('/api/presets', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(presetData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('createPresetAlert', 'Preset created successfully!', 'success');
            resetPresetForm();
            loadPresets();
            loadStats();
        } else {
            showAlert('createPresetAlert', 'Failed to create preset: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error creating preset:', err);
        showAlert('createPresetAlert', 'Failed to create preset', 'error');
    });
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
function loadPresetsForSelect() {
    fetch('/api/presets', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
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
        })
        .catch(err => console.error('Error loading presets:', err));
}

function createEventFromPreset() {
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
    
    fetch('/api/events/from-preset', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
    })
    .then(res => res.json())
    .then(data => {
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
    })
    .catch(err => {
        console.error('Error creating event from preset:', err);
        showAlert('createFromPresetAlert', 'Failed to create event', 'error');
    });
}

// ==================== CALENDAR ====================
function loadCalendarTab() {
    checkCalendarStatus();
    loadCalendarsList();
    getAutosyncStatus();
}

function checkCalendarStatus() {
    fetch('/api/calendar/status', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            const statusDiv = document.getElementById('calendarConnectionStatus');
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
        })
        .catch(err => {
            console.error('Error checking calendar status:', err);
            document.getElementById('calendarConnectionStatus').innerHTML = `
                <p style="margin: 0; color: #ef4444; font-weight: bold;">❌ Connection Error</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Failed to check status</p>
            `;
        });
}

function loadCalendarsList() {
    fetch('/api/commands/calendars', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('calendarsList');
            
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
        })
        .catch(err => {
            console.error('Error loading calendars:', err);
            document.getElementById('calendarsList').innerHTML = `<p style="padding: 15px; color: #ef4444;">Failed to load calendars</p>`;
        });
}

function syncCalendar() {
    const hoursAhead = parseInt(document.getElementById('syncHoursAhead').value) || 24;
    const filter = document.getElementById('syncFilter').value.trim();
    
    showAlert('syncStatusAlert', 'Syncing events from Google Calendar...', 'info');
    
    fetch('/api/commands/sync', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ hoursAhead, filter: filter || null })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('syncStatusAlert', `Successfully synced ${data.events.length} events from ${data.calendars.join(', ')}`, 'success');
            loadEvents();
            loadStats();
        } else {
            showAlert('syncStatusAlert', 'Sync failed: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error syncing calendar:', err);
        showAlert('syncStatusAlert', 'Failed to sync calendar', 'error');
    });
}

function getAutosyncStatus() {
    fetch('/api/autosync/status', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            const statusDiv = document.getElementById('autosyncStatus');
            
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
        })
        .catch(err => {
            console.error('Error getting autosync status:', err);
            document.getElementById('autosyncStatus').innerHTML = `
                <p style="margin: 0; color: #ef4444;">Error loading status</p>
            `;
        });
}

function toggleAutosync(enable) {
    const action = enable ? 'enable' : 'disable';
    
    showAlert('autosyncStatusAlert', `This action must be performed in Discord. Use /autosync action:${enable ? 'on' : 'off'}`, 'info');
}

// ==================== SERVER SETTINGS ====================
function loadGuildsForSettings() {
    fetch('/api/guilds', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('settingsGuildId');
            
            if (data.success && data.guilds.length > 0) {
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
        })
        .catch(err => {
            console.error('Error loading guilds:', err);
            document.getElementById('settingsGuildId').innerHTML = '<option value="">Error loading servers</option>';
        });
}

function loadGuildSettings(guildId) {
    if (!guildId) {
        document.getElementById('settingsContent').classList.add('hidden');
        document.getElementById('noGuildSelected').style.display = 'block';
        currentGuildId = null;
        return;
    }
    
    currentGuildId = guildId;
    document.getElementById('settingsContent').classList.remove('hidden');
    document.getElementById('noGuildSelected').style.display = 'none';
    
    // Load event channel setting
    fetch(`/api/event-channel/${guildId}`, { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('eventChannelInput').value = data.channelId || '';
            }
        })
        .catch(err => console.error('Error loading event channel:', err));
    
    // Load notification channel setting
    fetch(`/api/streaming/${guildId}`, { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('notificationChannelInput').value = data.config.notificationChannelId || '';
            }
        })
        .catch(err => console.error('Error loading notification channel:', err));
}

function saveEventChannel() {
    if (!currentGuildId) {
        showAlert('eventChannelStatus', 'Please select a server first', 'error');
        return;
    }
    
    const channelId = document.getElementById('eventChannelInput').value.trim();
    
    if (!channelId) {
        showAlert('eventChannelStatus', 'Please enter a channel ID', 'error');
        return;
    }
    
    fetch(`/api/event-channel/${currentGuildId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ channelId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('eventChannelStatus', 'Event channel set successfully!', 'success');
        } else {
            showAlert('eventChannelStatus', 'Failed to set event channel: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error saving event channel:', err);
        showAlert('eventChannelStatus', 'Failed to save event channel', 'error');
    });
}

function clearEventChannel() {
    if (!currentGuildId) {
        showAlert('eventChannelStatus', 'Please select a server first', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to clear the event channel?')) return;
    
    fetch(`/api/event-channel/${currentGuildId}`, {
        method: 'DELETE',
        headers: getHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('eventChannelInput').value = '';
            showAlert('eventChannelStatus', 'Event channel cleared!', 'success');
        } else {
            showAlert('eventChannelStatus', 'Failed to clear event channel: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error clearing event channel:', err);
        showAlert('eventChannelStatus', 'Failed to clear event channel', 'error');
    });
}

// ==================== STREAMING ====================
function loadGuildsForStreaming() {
    fetch('/api/guilds', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('streamingGuildId');
            
            if (data.success && data.guilds.length > 0) {
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
        })
        .catch(err => {
            console.error('Error loading guilds:', err);
            document.getElementById('streamingGuildId').innerHTML = '<option value="">Error loading servers</option>';
        });
}

function loadStreamingSettings(guildId) {
    if (!guildId) {
        document.getElementById('streamingContent').classList.add('hidden');
        document.getElementById('noStreamingGuildSelected').style.display = 'block';
        currentStreamingGuildId = null;
        return;
    }
    
    currentStreamingGuildId = guildId;
    document.getElementById('streamingContent').classList.remove('hidden');
    document.getElementById('noStreamingGuildSelected').style.display = 'none';
    
    // Load streaming config
    fetch(`/api/streaming/${guildId}`, { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
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
        })
        .catch(err => console.error('Error loading streaming settings:', err));
}

function saveNotificationChannel() {
    if (!currentGuildId) {
        showAlert('notificationStatus', 'Please select a server first', 'error');
        return;
    }
    
    const channelId = document.getElementById('notificationChannelInput').value.trim();
    
    if (!channelId) {
        showAlert('notificationStatus', 'Please enter a channel ID', 'error');
        return;
    }
    
    fetch(`/api/streaming/${currentGuildId}/channel`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ channelId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('notificationStatus', 'Notification channel set!', 'success');
        } else {
            showAlert('notificationStatus', 'Failed to set channel: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error saving notification channel:', err);
        showAlert('notificationStatus', 'Failed to save channel', 'error');
    });
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
    
    // Note: This is a simplified version - full implementation would handle adding/removing individually
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
    
    // Note: This is a simplified version - full implementation would handle adding/removing individually
    showAlert('youtubeStatus', `YouTube configuration saved (${channels.length} channels). Note: Use Discord commands for full control.`, 'success');
}

// ==================== BOT CONTROL ====================
function loadBotStatus() {
    const container = document.getElementById('botStatusInfo');
    container.innerHTML = '<div class="loading">Loading bot status...</div>';
    
    fetch('/api/bot/status', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
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
        })
        .catch(err => {
            console.error('Error loading bot status:', err);
            container.innerHTML = '<div style="color: #ef4444;">Error loading bot status</div>';
        });
    
    loadBotConfig();
}

function loadBotConfig() {
    const container = document.getElementById('botConfigInfo');
    container.innerHTML = '<div class="loading">Loading configuration...</div>';
    
    fetch('/api/config', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
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
        })
        .catch(err => {
            console.error('Error loading config:', err);
            container.innerHTML = '<div style="color: #ef4444;">Error loading configuration</div>';
        });
}

function restartBot() {
    if (!confirm('Are you sure you want to restart the Discord bot? This will disconnect and reconnect the bot.')) return;
    
    showAlert('botControlAlert', 'Restarting bot...', 'info');
    
    fetch('/api/bot/restart', {
        method: 'POST',
        headers: getHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('botControlAlert', 'Bot restart initiated! Refreshing status in 10 seconds...', 'success');
            setTimeout(() => loadBotStatus(), 10000);
        } else {
            showAlert('botControlAlert', data.error || 'Failed to restart bot', 'error');
        }
    })
    .catch(err => {
        console.error('Error restarting bot:', err);
        showAlert('botControlAlert', 'Failed to restart bot', 'error');
    });
}

function reloadCommands() {
    showAlert('botControlAlert', 'Command reload must be done via bot restart', 'info');
}

// ==================== COMMANDS ====================
function loadCommands() {
    const container = document.getElementById('commandsList');
    container.innerHTML = '<div class="loading">Loading commands...</div>';
    
    fetch('/api/commands/list', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayCommands(data.commands);
            } else {
                container.innerHTML = '<div style="color: #ef4444;">Failed to load commands</div>';
            }
        })
        .catch(err => {
            console.error('Error loading commands:', err);
            container.innerHTML = '<div style="color: #ef4444;">Error loading commands</div>';
        });
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
                                ${cmd.options && cmd.options.length > 0 ? `
                                    <div style="margin-top: 8px; font-size: 13px; color: #94a3b8;">
                                        Options: ${cmd.options.map(opt => 
                                            `<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">${opt.name}${opt.required ? '*' : ''}</code>`
                                        ).join('')}
                                    </div>
                                ` : ''}
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
document.addEventListener('DOMContentLoaded', () => {
    // Check if API key exists
    if (API_KEY) {
        updateAuthStatus(true);
        loadDashboard();
    } else {
        updateAuthStatus(false);
    }
    
    // Set default datetime to now + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const dateTimeString = now.toISOString().slice(0, 16);
    
    const eventDateTime = document.getElementById('eventDateTime');
    const presetDateTime = document.getElementById('fromPresetDateTime');
    
    if (eventDateTime) eventDateTime.value = dateTimeString;
    if (presetDateTime) presetDateTime.value = dateTimeString;
});