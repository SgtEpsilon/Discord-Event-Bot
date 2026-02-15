// public/script.js - Discord Event Bot Web Interface

let authToken = localStorage.getItem('authToken');
let currentPresets = [];
let currentGuilds = [];
let uptimeInterval = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Set default datetime to 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    
    const eventDateTime = document.getElementById('eventDateTime');
    if (eventDateTime) eventDateTime.value = now.toISOString().slice(0, 16);
});

// ==================== AUTHENTICATION ====================

async function checkAuth() {
    if (!authToken) {
        showLoginModal();
        return;
    }

    try {
        const response = await fetch('/api/auth/check', {
            headers: { 'X-Auth-Token': authToken }
        });

        if (response.ok) {
            hideLoginModal();
            updateAuthUI(true);
            loadDashboard();
        } else {
            authToken = null;
            localStorage.removeItem('authToken');
            showLoginModal();
            updateAuthUI(false);
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginModal();
        updateAuthUI(false);
    }
}

async function login() {
    const username = document.getElementById('usernameInput').value;
    const password = document.getElementById('passwordInput').value;

    if (!username || !password) {
        showAlert('Please enter both username and password', 'error', 'loginAlert');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            hideLoginModal();
            updateAuthUI(true);
            loadDashboard();
            showAlert('Successfully logged in!', 'success', 'loginAlert');
            document.getElementById('usernameInput').value = '';
            document.getElementById('passwordInput').value = '';
        } else {
            showAlert(data.error || 'Login failed', 'error', 'loginAlert');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Login failed. Please try again.', 'error', 'loginAlert');
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    showLoginModal();
    updateAuthUI(false);
    document.getElementById('eventsContainer').innerHTML = '<div class="loading">Please login to view events</div>';
    document.getElementById('presetsContainer').innerHTML = '<div class="loading">Please login to view presets</div>';
    if (uptimeInterval) {
        clearInterval(uptimeInterval);
        uptimeInterval = null;
    }
}

function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
}

function hideLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    hideAlert('loginAlert');
}

function updateAuthUI(isAuthenticated) {
    const authStatus = document.getElementById('authStatus');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (isAuthenticated) {
        authStatus.textContent = '✅ Authenticated';
        authStatus.className = 'status authenticated';
        logoutBtn.style.display = 'block';
    } else {
        authStatus.textContent = '🔒 Not authenticated';
        authStatus.className = 'status unauthenticated';
        logoutBtn.style.display = 'none';
    }
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
    loadStats();
    loadEvents();
    loadPresets();
    loadGuilds();
    loadCalendarsForDropdowns();
    startUptimeCounter();
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats', {
            headers: { 'X-Auth-Token': authToken }
        });
        const stats = await response.json();

        document.getElementById('totalEvents').textContent = stats.totalEvents;
        document.getElementById('upcomingEvents').textContent = stats.upcomingEvents;
        document.getElementById('totalSignups').textContent = stats.totalSignups;
        document.getElementById('totalPresets').textContent = stats.totalPresets;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==================== UPTIME COUNTER ====================

function startUptimeCounter() {
    if (uptimeInterval) {
        clearInterval(uptimeInterval);
    }
    
    updateUptime();
    uptimeInterval = setInterval(updateUptime, 1000);
}

async function updateUptime() {
    try {
        const response = await fetch('/api/bot/status', {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (!response.ok) return;
        
        const status = await response.json();
        
        if (status.uptime !== undefined) {
            const uptimeFormatted = formatUptime(status.uptime);
            
            // Update uptime display if on bot control tab
            const botStatusInfo = document.getElementById('botStatusInfo');
            if (botStatusInfo && !botStatusInfo.innerHTML.includes('Loading')) {
                const uptimeElements = botStatusInfo.querySelectorAll('div');
                uptimeElements.forEach(el => {
                    if (el.innerHTML.includes('<strong>Uptime:</strong>')) {
                        el.innerHTML = `<strong>Uptime:</strong> ${uptimeFormatted}`;
                    }
                });
            }
        }
    } catch (error) {
        // Silently fail - don't spam console
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

// ==================== EVENTS ====================

async function loadEvents() {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '<div class="loading">Loading events...</div>';

    try {
        const response = await fetch('/api/events', {
            headers: { 'X-Auth-Token': authToken }
        });
        const events = await response.json();

        if (events.length === 0) {
            container.innerHTML = '<p class="empty-state">No events found. Create your first event!</p>';
            return;
        }

        events.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

        container.innerHTML = events.map(event => {
            const eventDate = new Date(event.dateTime);
            const isPast = eventDate < new Date();
            const signupCount = Object.keys(event.signups || {}).length;
            
            // Check if it's an iCal event
            const isIcal = event.calendarSource && 
                           (event.calendarSourceId?.includes('http://') || 
                            event.calendarSourceId?.includes('https://'));
            const icalTag = isIcal ? '<span class="ical-badge">(iCal)</span>' : '';

            return `
                <div class="event-card ${isPast ? 'past-event' : ''}">
                    <div class="event-header">
                        <h3>${escapeHtml(event.title)} ${icalTag}</h3>
                        ${event.calendarLink ? `<a href="${event.calendarLink}" target="_blank" class="calendar-badge">📅 Google Calendar</a>` : ''}
                    </div>
                    <p class="event-description">${escapeHtml(event.description || 'No description')}</p>
                    <div class="event-meta">
                        <div class="event-time">
                            <strong>📅 ${eventDate.toLocaleString()}</strong>
                        </div>
                        <div class="event-duration">⏱️ ${event.duration} minutes</div>
                        <div class="event-signups">👥 ${signupCount}${event.maxParticipants > 0 ? `/${event.maxParticipants}` : ''} signed up</div>
                    </div>
                    ${event.roles && event.roles.length > 0 ? `
                        <div class="event-roles">
                            <strong>Roles:</strong> ${event.roles.map(r => `<span class="role-badge">${escapeHtml(r.emoji || '👤')} ${escapeHtml(r.name || r)}</span>`).join(' ')}
                        </div>
                    ` : ''}
                    <div class="event-actions">
                        <button class="btn btn-small btn-secondary" onclick="viewEvent('${event.id}')">View Details</button>
                        <button class="btn btn-small btn-danger" onclick="deleteEvent('${event.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        container.innerHTML = '<p class="error-text">Failed to load events</p>';
    }
}

async function createEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const dateTime = document.getElementById('eventDateTime').value;
    const duration = parseInt(document.getElementById('eventDuration').value);
    const maxParticipants = parseInt(document.getElementById('eventMaxParticipants').value);
    const rolesText = document.getElementById('eventRoles').value.trim();
    const guildId = document.getElementById('eventGuild').value;
    const addToCalendar = document.getElementById('addToGoogleCalendar')?.checked || false;
    const calendarId = addToCalendar ? document.getElementById('googleCalendarId')?.value : null;

    if (!title || !dateTime) {
        showAlert('Please fill in required fields', 'error', 'createEventAlert');
        return;
    }

    const roles = rolesText ? rolesText.split('\n').filter(r => r.trim()).map(r => {
        const parts = r.trim().split(' ');
        if (parts.length >= 2) {
            return {
                emoji: parts[0],
                name: parts.slice(1).join(' '),
                maxSlots: null
            };
        }
        return { emoji: '👤', name: r.trim(), maxSlots: null };
    }) : [];

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({
                title,
                description,
                dateTime,
                duration,
                maxParticipants,
                roles,
                guildId: guildId || null,
                addToCalendar,
                calendarId,
                createdBy: 'web_interface'
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Event created successfully!', 'success', 'createEventAlert');
            document.querySelector('#create-event form').reset();
            
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            document.getElementById('eventDateTime').value = now.toISOString().slice(0, 16);
            
            loadEvents();
            loadStats();
        } else {
            showAlert(data.error || 'Failed to create event', 'error', 'createEventAlert');
        }
    } catch (error) {
        console.error('Error creating event:', error);
        showAlert('Failed to create event', 'error', 'createEventAlert');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });

        const data = await response.json();

        if (data.success) {
            loadEvents();
            loadStats();
        } else {
            alert('Failed to delete event');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
    }
}

function viewEvent(eventId) {
    alert('Event details view - to be implemented');
}

// ==================== PRESETS ====================

async function loadPresets() {
    const container = document.getElementById('presetsContainer');
    container.innerHTML = '<div class="loading">Loading presets...</div>';

    try {
        const response = await fetch('/api/presets', {
            headers: { 'X-Auth-Token': authToken }
        });
        currentPresets = await response.json();

        if (currentPresets.length === 0) {
            container.innerHTML = '<p class="empty-state">No presets found. Create your first preset!</p>';
            return;
        }

        container.innerHTML = currentPresets.map(preset => `
            <div class="preset-card">
                <h3>${escapeHtml(preset.name)}</h3>
                <p class="preset-key">Key: ${escapeHtml(preset.key)}</p>
                <p class="preset-description">${escapeHtml(preset.description || 'No description')}</p>
                <div class="preset-meta">
                    <div>⏱️ ${preset.duration} minutes</div>
                    <div>👥 Max: ${preset.maxParticipants || 'Unlimited'}</div>
                </div>
                ${preset.roles && preset.roles.length > 0 ? `
                    <div class="preset-roles">
                        <strong>Roles:</strong> ${preset.roles.map(r => `<span class="role-badge">${escapeHtml(r.emoji || '👤')} ${escapeHtml(r.name)}</span>`).join(' ')}
                    </div>
                ` : ''}
                <div class="preset-actions">
                    <button class="btn btn-small btn-primary" onclick="usePreset('${preset.key}')">Use Preset</button>
                    <button class="btn btn-small btn-danger" onclick="deletePreset('${preset.key}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading presets:', error);
        container.innerHTML = '<p class="error-text">Failed to load presets</p>';
    }
}

async function createPreset() {
    const key = document.getElementById('presetKey').value.trim().toLowerCase();
    const name = document.getElementById('presetName').value.trim();
    const description = document.getElementById('presetDescription').value.trim();
    const duration = parseInt(document.getElementById('presetDuration').value);
    const maxParticipants = parseInt(document.getElementById('presetMaxParticipants').value);
    const rolesText = document.getElementById('presetRoles').value.trim();

    if (!key || !name || !duration) {
        showAlert('Please fill in required fields', 'error', 'createPresetAlert');
        return;
    }

    if (!/^[a-z0-9-]+$/.test(key)) {
        showAlert('Key must contain only lowercase letters, numbers, and hyphens', 'error', 'createPresetAlert');
        return;
    }

    const roles = rolesText ? rolesText.split('\n').filter(r => r.trim()).map(r => {
        const parts = r.trim().split(' ');
        if (parts.length >= 2) {
            return {
                emoji: parts[0],
                name: parts.slice(1).join(' '),
                maxSlots: null
            };
        }
        return { emoji: '👤', name: r.trim(), maxSlots: null };
    }) : [];

    try {
        const response = await fetch('/api/presets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({
                key,
                name,
                description,
                duration,
                maxParticipants,
                roles
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Preset created successfully!', 'success', 'createPresetAlert');
            document.querySelector('#create-preset form').reset();
            document.getElementById('presetDuration').value = 60;
            document.getElementById('presetMaxParticipants').value = 0;
            loadPresets();
            loadStats();
        } else {
            showAlert(data.error || 'Failed to create preset', 'error', 'createPresetAlert');
        }
    } catch (error) {
        console.error('Error creating preset:', error);
        showAlert('Failed to create preset', 'error', 'createPresetAlert');
    }
}

async function deletePreset(presetKey) {
    if (!confirm(`Are you sure you want to delete preset "${presetKey}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/presets/${presetKey}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });

        const data = await response.json();

        if (data.success) {
            loadPresets();
            loadStats();
        } else {
            alert('Failed to delete preset');
        }
    } catch (error) {
        console.error('Error deleting preset:', error);
        alert('Failed to delete preset');
    }
}

async function usePreset(presetKey) {
    const preset = currentPresets.find(p => p.key === presetKey);
    if (!preset) return;
    
    const dateTime = prompt('Enter date and time for the event (YYYY-MM-DDTHH:MM):');
    if (!dateTime) return;
    
    const guildSelect = document.getElementById('eventGuild');
    const guildId = guildSelect?.value || '';
    
    try {
        const response = await fetch('/api/events/from-preset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({
                presetKey,
                dateTime,
                guildId: guildId || null,
                createdBy: 'web_interface'
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Event created from preset successfully!');
            loadEvents();
            loadStats();
        } else {
            alert(data.error || 'Failed to create event');
        }
    } catch (error) {
        console.error('Error creating event from preset:', error);
        alert('Failed to create event');
    }
}

// ==================== GOOGLE CALENDAR ====================

async function loadCalendarStatus() {
    const statusDiv = document.getElementById('calendarStatus');
    statusDiv.innerHTML = '<div class="loading">Checking configuration...</div>';

    try {
        const response = await fetch('/api/calendars/status', {
            headers: { 'X-Auth-Token': authToken }
        });
        const data = await response.json();

        if (data.configured || data.hasIcalCalendars) {
            let statusText = '';
            if (data.configured) {
                statusText = 'Google Calendar API configured. You can add Google Calendars and public iCal URLs.';
            } else {
                statusText = 'iCal URLs supported. Add public calendar URLs (Google Calendar API not configured - write operations disabled).';
            }
            
            statusDiv.innerHTML = `
                <div class="status-indicator success">
                    <span class="status-dot"></span>
                    <div>
                        <strong>Calendar Integration Available</strong>
                        <p>${statusText}</p>
                    </div>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="status-indicator error">
                    <span class="status-dot"></span>
                    <div>
                        <strong>Calendar Not Configured</strong>
                        <p>You can still add public iCal URLs without Google Calendar API credentials.</p>
                        ${data.error ? `<p class="error-text">Error: ${data.error}</p>` : ''}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error checking calendar status:', error);
        statusDiv.innerHTML = '<p class="error-text">Failed to check calendar status</p>';
    }
}

async function manualSyncCalendar() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '🔄 Syncing...';
    
    try {
        const response = await fetch('/api/calendars/manual-sync', {
            method: 'POST',
            headers: { 'X-Auth-Token': authToken }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Sync complete!\n\n${data.message}\n\n${data.imported || 0} new events imported.`);
            loadEvents();
            loadStats();
        } else {
            alert(`❌ Sync failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error syncing calendar:', error);
        alert('❌ Sync failed. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Manual Sync Now';
    }
}

async function loadConfiguredCalendars() {
    const container = document.getElementById('configuredCalendarsList');
    container.innerHTML = '<div class="loading">Loading calendars...</div>';

    try {
        const response = await fetch('/api/calendars', {
            headers: { 'X-Auth-Token': authToken }
        });
        const calendars = await response.json();

        if (calendars.length === 0) {
            container.innerHTML = '<p class="empty-state">No calendars configured yet. Add one above to get started!</p>';
            return;
        }

        container.innerHTML = calendars.map(cal => {
            const isIcal = cal.calendarId.startsWith('http://') || cal.calendarId.startsWith('https://');
            const calType = isIcal ? '🔗 iCal URL' : '📅 Google Calendar';
            
            return `
                <div class="calendar-item">
                    <div class="calendar-info">
                        <h4>${escapeHtml(cal.name)} <span style="font-size: 0.8em; color: #888;">(${calType})</span></h4>
                        <p class="calendar-id">${escapeHtml(cal.calendarId)}</p>
                        <small>Added: ${new Date(cal.createdAt).toLocaleString()}</small>
                    </div>
                    <div class="calendar-actions">
                        <button class="btn btn-small btn-secondary" onclick="editCalendar(${cal.id}, '${escapeHtml(cal.name)}', '${escapeHtml(cal.calendarId)}')">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="deleteCalendar(${cal.id}, '${escapeHtml(cal.name)}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading calendars:', error);
        container.innerHTML = '<p class="error-text">Failed to load calendars</p>';
    }
}

async function loadAvailableCalendars() {
    const section = document.getElementById('availableCalendarsSection');
    const listDiv = document.getElementById('availableCalendarsList');

    section.classList.remove('hidden');
    listDiv.innerHTML = '<div class="loading">Loading available calendars...</div>';

    try {
        const response = await fetch('/api/calendars/available', {
            headers: { 'X-Auth-Token': authToken }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const calendars = await response.json();

        if (calendars.length === 0) {
            listDiv.innerHTML = '<p class="empty-state">No calendars found in your Google account</p>';
            return;
        }

        listDiv.innerHTML = calendars.map(cal => `
            <div class="available-calendar-item">
                <div class="calendar-info">
                    <h4>${escapeHtml(cal.summary)}</h4>
                    <p class="calendar-id">${escapeHtml(cal.id)}</p>
                    ${cal.description ? `<p class="calendar-description">${escapeHtml(cal.description)}</p>` : ''}
                </div>
                <button class="btn btn-primary btn-small" onclick="addCalendarFromList('${escapeHtml(cal.summary)}', '${escapeHtml(cal.id)}')">Add This Calendar</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading available calendars:', error);
        listDiv.innerHTML = `<p class="error-text">${error.message}</p>`;
    }
}

function showManualCalendarAdd() {
    document.getElementById('manualCalendarSection').classList.remove('hidden');
    document.getElementById('availableCalendarsSection').classList.add('hidden');
}

function hideManualCalendarAdd() {
    document.getElementById('manualCalendarSection').classList.add('hidden');
    document.getElementById('manualCalendarName').value = '';
    document.getElementById('manualCalendarId').value = '';
    hideAlert('addCalendarAlert');
}

async function addManualCalendar() {
    const name = document.getElementById('manualCalendarName').value.trim();
    const calendarId = document.getElementById('manualCalendarId').value.trim();

    if (!name || !calendarId) {
        showAlert('Please fill in all fields', 'error', 'addCalendarAlert');
        return;
    }

    const isIcalUrl = calendarId.startsWith('http://') || calendarId.startsWith('https://');
    
    if (isIcalUrl) {
        try {
            new URL(calendarId);
        } catch (e) {
            showAlert('Invalid URL format', 'error', 'addCalendarAlert');
            return;
        }
    }

    try {
        const response = await fetch('/api/calendars', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ name, calendarId })
        });

        const data = await response.json();

        if (data.success) {
            const calType = isIcalUrl ? 'iCal URL' : 'Google Calendar';
            showAlert(`${calType} added successfully!`, 'success', 'addCalendarAlert');
            setTimeout(() => {
                hideManualCalendarAdd();
                loadConfiguredCalendars();
                loadCalendarsForDropdowns();
            }, 1500);
        } else {
            showAlert(data.error || 'Failed to add calendar', 'error', 'addCalendarAlert');
        }
    } catch (error) {
        console.error('Error adding calendar:', error);
        showAlert('Failed to add calendar', 'error', 'addCalendarAlert');
    }
}

async function addCalendarFromList(name, calendarId) {
    try {
        const response = await fetch('/api/calendars', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ name, calendarId })
        });

        const data = await response.json();

        if (data.success) {
            alert('Calendar added successfully!');
            loadConfiguredCalendars();
            loadCalendarsForDropdowns();
            document.getElementById('availableCalendarsSection').classList.add('hidden');
        } else {
            alert(data.error || 'Failed to add calendar');
        }
    } catch (error) {
        console.error('Error adding calendar:', error);
        alert('Failed to add calendar');
    }
}

async function editCalendar(id, currentName, currentCalendarId) {
    const name = prompt('Calendar Name:', currentName);
    if (!name) return;

    const calendarId = prompt('Calendar ID or iCal URL:', currentCalendarId);
    if (!calendarId) return;
    
    const isIcalUrl = calendarId.startsWith('http://') || calendarId.startsWith('https://');
    if (isIcalUrl) {
        try {
            new URL(calendarId);
        } catch (e) {
            alert('Invalid URL format');
            return;
        }
    }

    try {
        const response = await fetch(`/api/calendars/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ name, calendarId })
        });

        const data = await response.json();

        if (data.success) {
            loadConfiguredCalendars();
            loadCalendarsForDropdowns();
        } else {
            alert(data.error || 'Failed to update calendar');
        }
    } catch (error) {
        console.error('Error updating calendar:', error);
        alert('Failed to update calendar');
    }
}

async function deleteCalendar(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/calendars/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });

        const data = await response.json();

        if (data.success) {
            loadConfiguredCalendars();
            loadCalendarsForDropdowns();
        } else {
            alert(data.error || 'Failed to delete calendar');
        }
    } catch (error) {
        console.error('Error deleting calendar:', error);
        alert('Failed to delete calendar');
    }
}

async function loadCalendarsForDropdowns() {
    try {
        const response = await fetch('/api/calendars', {
            headers: { 'X-Auth-Token': authToken }
        });
        const calendars = await response.json();

        const select1 = document.getElementById('googleCalendarId');

        if (calendars.length === 0) {
            if (select1) select1.innerHTML = '<option value="">No calendars configured</option>';
            return;
        }

        const options = calendars.map(cal => 
            `<option value="${cal.calendarId}">${escapeHtml(cal.name)}</option>`
        ).join('');

        if (select1) select1.innerHTML = options;
    } catch (error) {
        console.error('Error loading calendars for dropdowns:', error);
    }
}

function toggleCalendarSelect() {
    const checkbox = document.getElementById('addToGoogleCalendar');
    const selectGroup = document.getElementById('calendarSelectGroup');
    if (checkbox.checked) {
        selectGroup.classList.remove('hidden');
    } else {
        selectGroup.classList.add('hidden');
    }
}

// ==================== GUILDS & CONFIGURATION ====================

async function loadGuilds() {
    try {
        const response = await fetch('/api/guilds', {
            headers: { 'X-Auth-Token': authToken }
        });
        currentGuilds = await response.json();

        const selects = [
            document.getElementById('eventGuild'),
            document.getElementById('settingsGuildId'),
            document.getElementById('streamingGuildId')
        ];

        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Select a guild...</option>' +
                    currentGuilds.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
            }
        });
    } catch (error) {
        console.error('Error loading guilds:', error);
    }
}

async function loadGuildSettings(guildId) {
    if (!guildId) {
        document.getElementById('settingsContent').classList.add('hidden');
        document.getElementById('noGuildSelected').style.display = 'block';
        return;
    }

    document.getElementById('settingsContent').classList.remove('hidden');
    document.getElementById('noGuildSelected').style.display = 'none';

    try {
        const response = await fetch(`/api/event-channel/${guildId}`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const data = await response.json();
        document.getElementById('eventChannelInput').value = data.channelId || '';
    } catch (error) {
        console.error('Error loading event channel:', error);
    }

    try {
        const response = await fetch(`/api/streaming/${guildId}`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const data = await response.json();
        document.getElementById('notificationChannelInput').value = data.notificationChannelId || '';
    } catch (error) {
        console.error('Error loading streaming config:', error);
    }
}

async function saveEventChannel() {
    const guildId = document.getElementById('settingsGuildId').value;
    const channelId = document.getElementById('eventChannelInput').value.trim();

    if (!guildId) {
        showAlert('Please select a guild', 'error', 'eventChannelStatus');
        return;
    }

    try {
        const response = await fetch(`/api/event-channel/${guildId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ channelId })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Event channel saved successfully!', 'success', 'eventChannelStatus');
        } else {
            showAlert('Failed to save event channel', 'error', 'eventChannelStatus');
        }
    } catch (error) {
        console.error('Error saving event channel:', error);
        showAlert('Failed to save event channel', 'error', 'eventChannelStatus');
    }
}

async function clearEventChannel() {
    const guildId = document.getElementById('settingsGuildId').value;

    if (!guildId) {
        showAlert('Please select a guild', 'error', 'eventChannelStatus');
        return;
    }

    if (!confirm('Are you sure you want to clear the event channel?')) {
        return;
    }

    try {
        const response = await fetch(`/api/event-channel/${guildId}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('eventChannelInput').value = '';
            showAlert('Event channel cleared successfully!', 'success', 'eventChannelStatus');
        } else {
            showAlert('Failed to clear event channel', 'error', 'eventChannelStatus');
        }
    } catch (error) {
        console.error('Error clearing event channel:', error);
        showAlert('Failed to clear event channel', 'error', 'eventChannelStatus');
    }
}

async function saveNotificationChannel() {
    const guildId = document.getElementById('settingsGuildId').value;
    const channelId = document.getElementById('notificationChannelInput').value.trim();

    if (!guildId) {
        showAlert('Please select a guild', 'error', 'notificationStatus');
        return;
    }

    try {
        const response = await fetch(`/api/streaming/${guildId}/channel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ channelId })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Notification channel saved successfully!', 'success', 'notificationStatus');
        } else {
            showAlert('Failed to save notification channel', 'error', 'notificationStatus');
        }
    } catch (error) {
        console.error('Error saving notification channel:', error);
        showAlert('Failed to save notification channel', 'error', 'notificationStatus');
    }
}

// ==================== STREAMING CONFIG ====================

async function loadStreamingConfig(guildId) {
    if (!guildId) {
        document.getElementById('streamingContent').classList.add('hidden');
        document.getElementById('noStreamingGuildSelected').style.display = 'block';
        return;
    }

    document.getElementById('streamingContent').classList.remove('hidden');
    document.getElementById('noStreamingGuildSelected').style.display = 'none';
    
    try {
        const response = await fetch(`/api/streaming/${guildId}`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const config = await response.json();
        
        // Load Twitch streamers
        const twitchContainer = document.getElementById('twitchContainer');
        twitchContainer.innerHTML = '';
        
        if (config.twitch && config.twitch.streamers && config.twitch.streamers.length > 0) {
            config.twitch.streamers.forEach(streamer => {
                addTwitchRow(streamer);
            });
        } else {
            addTwitchRow();
        }
        
        // Load YouTube channels
        const youtubeContainer = document.getElementById('youtubeContainer');
        youtubeContainer.innerHTML = '';
        
        if (config.youtube && config.youtube.channels && config.youtube.channels.length > 0) {
            config.youtube.channels.forEach(channel => {
                addYouTubeRow(channel);
            });
        } else {
            addYouTubeRow();
        }
    } catch (error) {
        console.error('Error loading streaming config:', error);
    }
}

function addTwitchRow(username = '') {
    const container = document.getElementById('twitchContainer');
    const row = document.createElement('div');
    row.className = 'twitch-row';
    row.innerHTML = `
        <input type="text" placeholder="Twitch username" class="twitch-username" value="${escapeHtml(username)}">
        <button type="button" class="btn btn-danger" style="padding: 6px; min-width: 36px;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
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

async function saveTwitchConfig() {
    const guildId = document.getElementById('streamingGuildId').value;
    if (!guildId) {
        showAlert('Please select a guild', 'error', 'twitchStatus');
        return;
    }
    
    const rows = document.querySelectorAll('.twitch-row');
    const streamers = Array.from(rows)
        .map(row => row.querySelector('.twitch-username').value.trim())
        .filter(s => s);
    
    try {
        const response = await fetch(`/api/streaming/${guildId}/twitch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ streamers })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Twitch streamers saved successfully!', 'success', 'twitchStatus');
        } else {
            showAlert(data.error || 'Failed to save', 'error', 'twitchStatus');
        }
    } catch (error) {
        console.error('Error saving Twitch config:', error);
        showAlert('Failed to save Twitch streamers', 'error', 'twitchStatus');
    }
}

async function saveYouTubeConfig() {
    const guildId = document.getElementById('streamingGuildId').value;
    if (!guildId) {
        showAlert('Please select a guild', 'error', 'youtubeStatus');
        return;
    }
    
    const rows = document.querySelectorAll('.youtube-row');
    const channels = Array.from(rows)
        .map(row => row.querySelector('.youtube-channel').value.trim())
        .filter(c => c);
    
    try {
        const response = await fetch(`/api/streaming/${guildId}/youtube`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ channels })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('YouTube channels saved successfully!', 'success', 'youtubeStatus');
        } else {
            showAlert(data.error || 'Failed to save', 'error', 'youtubeStatus');
        }
    } catch (error) {
        console.error('Error saving YouTube config:', error);
        showAlert('Failed to save YouTube channels', 'error', 'youtubeStatus');
    }
}

// ==================== BOT CONTROL ====================

async function loadBotStatus() {
    const container = document.getElementById('botStatusInfo');
    container.innerHTML = '<div class="loading">Loading bot status...</div>';

    try {
        const response = await fetch('/api/bot/status', {
            headers: { 'X-Auth-Token': authToken }
        });
        const status = await response.json();

        container.innerHTML = `
            <div class="bot-status-grid">
                <div><strong>Status:</strong> ${status.status || 'Unknown'}</div>
                <div><strong>Uptime:</strong> ${formatUptime(status.uptime || 0)}</div>
                <div><strong>Guilds:</strong> ${status.guildCount || 0}</div>
                <div><strong>Auto-sync:</strong> ${status.autoSync?.enabled ? '✅ Enabled' : '❌ Disabled'}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading bot status:', error);
        container.innerHTML = '<p class="error-text">Failed to load bot status</p>';
    }
}

async function loadBotConfig() {
    const container = document.getElementById('botConfigInfo');
    container.innerHTML = '<div class="loading">Loading configuration...</div>';

    try {
        const response = await fetch('/api/autosync/status', {
            headers: { 'X-Auth-Token': authToken }
        });
        const config = await response.json();

        container.innerHTML = `
            <div class="bot-status-grid">
                <div><strong>Auto-sync:</strong> ${config.enabled ? '✅ Enabled' : '❌ Disabled'}</div>
                ${config.enabled ? `
                    <div><strong>Guild ID:</strong> ${config.guildId || 'N/A'}</div>
                    <div><strong>Channel ID:</strong> ${config.channelId || 'N/A'}</div>
                    <div><strong>Last Sync:</strong> ${config.lastSync ? new Date(config.lastSync).toLocaleString() : 'Never'}</div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error loading bot config:', error);
        container.innerHTML = '<p class="error-text">Failed to load configuration</p>';
    }
}

function reloadCommands() {
    if (confirm('Reload Discord commands? This may take a moment.')) {
        showAlert('Command reload requested', 'success', 'botControlAlert');
    }
}

async function restartBot() {
    try {
        // Check if bot is running in PM2
        const response = await fetch('/api/bot/pm2-status', {
            headers: { 'X-Auth-Token': authToken }
        });
        
        const data = await response.json();
        
        if (!data.pm2Running) {
            alert('⚠️ Bot is not running in PM2\n\nThe bot needs to be started with PM2 to support remote restart.\n\nRun: npm run pm2:start');
            return;
        }
        
        if (confirm('Restart the Discord bot? The web server will remain running.')) {
            const restartResponse = await fetch('/api/bot/restart', {
                method: 'POST',
                headers: { 'X-Auth-Token': authToken }
            });
            
            const restartData = await restartResponse.json();
            
            if (restartData.success) {
                showAlert('Bot restart requested successfully!', 'success', 'botControlAlert');
                setTimeout(() => {
                    loadBotStatus();
                }, 3000);
            } else {
                showAlert(restartData.error || 'Failed to restart bot', 'error', 'botControlAlert');
            }
        }
    } catch (error) {
        console.error('Error restarting bot:', error);
        showAlert('Failed to restart bot', 'error', 'botControlAlert');
    }
}

// ==================== COMMANDS ====================

async function loadCommands() {
    const container = document.getElementById('commandsList');
    container.innerHTML = '<div class="loading">Loading commands...</div>';

    try {
        const response = await fetch('/api/commands', {
            headers: { 'X-Auth-Token': authToken }
        });
        const commands = await response.json();

        const grouped = {};
        commands.forEach(cmd => {
            if (!grouped[cmd.category]) grouped[cmd.category] = [];
            grouped[cmd.category].push(cmd);
        });

        let html = '';
        for (const [category, cmds] of Object.entries(grouped)) {
            html += `<div class="command-category"><h3>${category}</h3>`;
            cmds.forEach(cmd => {
                html += `
                    <div class="command-item">
                        <code>${cmd.name}</code>
                        <p>${cmd.description}</p>
                    </div>
                `;
            });
            html += '</div>';
        }

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading commands:', error);
        container.innerHTML = '<p class="error-text">Failed to load commands</p>';
    }
}

// ==================== UI HELPERS ====================

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    if (event && event.target) {
        event.target.closest('.channel-item')?.classList.add('active');
    }

    if (tabName === 'events') loadEvents();
    if (tabName === 'presets') loadPresets();
    if (tabName === 'calendar') {
        loadCalendarStatus();
        loadConfiguredCalendars();
    }
    if (tabName === 'commands') loadCommands();
    if (tabName === 'bot-control') {
        loadBotStatus();
        loadBotConfig();
    }
    if (tabName === 'streaming') {
        const guildId = document.getElementById('streamingGuildId').value;
        if (guildId) loadStreamingConfig(guildId);
    }
    if (tabName === 'server-settings') {
        const guildId = document.getElementById('settingsGuildId').value;
        if (guildId) loadGuildSettings(guildId);
    }
}

function switchToMainView() {
    document.getElementById('eventsCategory').classList.remove('hidden');
    document.getElementById('presetsCategory').classList.remove('hidden');
    document.getElementById('configCategory').classList.add('hidden');

    document.querySelectorAll('.server-icon').forEach(icon => icon.classList.remove('active'));
    document.querySelectorAll('.server-icon')[0].classList.add('active');

    switchTab('events');
}

function switchToSettingsView() {
    document.getElementById('eventsCategory').classList.add('hidden');
    document.getElementById('presetsCategory').classList.add('hidden');
    document.getElementById('configCategory').classList.remove('hidden');

    document.querySelectorAll('.server-icon').forEach(icon => icon.classList.remove('active'));
    document.querySelectorAll('.server-icon')[1].classList.add('active');

    switchTab('server-settings');
}

function showAlert(message, type, elementId) {
    const alert = document.getElementById(elementId);
    if (!alert) return;

    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.classList.remove('hidden');

    setTimeout(() => {
        alert.classList.add('hidden');
    }, 5000);
}

function hideAlert(elementId) {
    const alert = document.getElementById(elementId);
    if (alert) {
        alert.classList.add('hidden');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}