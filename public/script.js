// public/script.js - Discord Event Bot Web Interface

let authToken = localStorage.getItem('authToken');
let currentPresets = [];
let currentGuilds = [];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Set default datetime to 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    
    const eventDateTime = document.getElementById('eventDateTime');
    const fromPresetDateTime = document.getElementById('fromPresetDateTime');
    
    if (eventDateTime) eventDateTime.value = now.toISOString().slice(0, 16);
    if (fromPresetDateTime) fromPresetDateTime.value = now.toISOString().slice(0, 16);
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
            // Clear form
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
    // Clear sensitive data
    document.getElementById('eventsContainer').innerHTML = '<div class="loading">Please login to view events</div>';
    document.getElementById('presetsContainer').innerHTML = '<div class="loading">Please login to view presets</div>';
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

        // Sort by date
        events.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

        container.innerHTML = events.map(event => {
            const eventDate = new Date(event.dateTime);
            const isPast = eventDate < new Date();
            const signupCount = Object.keys(event.signups || {}).length;

            return `
                <div class="event-card ${isPast ? 'past-event' : ''}">
                    <div class="event-header">
                        <h3>${escapeHtml(event.title)}</h3>
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
                            <strong>Roles:</strong> ${event.roles.map(r => `<span class="role-badge">${escapeHtml(r)}</span>`).join(' ')}
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

    const roles = rolesText ? rolesText.split('\n').filter(r => r.trim()) : [];

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
                calendarId
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Event created successfully!', 'success', 'createEventAlert');
            document.querySelector('#create-event form').reset();
            
            // Reset datetime to 1 hour from now
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
                        <strong>Roles:</strong> ${preset.roles.map(r => `<span class="role-badge">${escapeHtml(r)}</span>`).join(' ')}
                    </div>
                ` : ''}
                <div class="preset-actions">
                    <button class="btn btn-small btn-primary" onclick="usePreset('${preset.key}')">Use Preset</button>
                    <button class="btn btn-small btn-danger" onclick="deletePreset('${preset.key}')">Delete</button>
                </div>
            </div>
        `).join('');

        // Update preset dropdown
        updatePresetDropdown();
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

    const roles = rolesText ? rolesText.split('\n').filter(r => r.trim()) : [];

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

function usePreset(presetKey) {
    switchTab('create-from-preset');
    document.getElementById('fromPresetKey').value = presetKey;
    updatePresetPreview();
}

function updatePresetDropdown() {
    const select = document.getElementById('fromPresetKey');
    select.innerHTML = '<option value="">-- Select a preset --</option>' +
        currentPresets.map(p => `<option value="${p.key}">${escapeHtml(p.name)}</option>`).join('');
}

function updatePresetPreview() {
    const presetKey = document.getElementById('fromPresetKey').value;
    const preview = document.getElementById('presetPreview');
    const details = document.getElementById('presetPreviewDetails');

    if (!presetKey) {
        preview.classList.add('hidden');
        return;
    }

    const preset = currentPresets.find(p => p.key === presetKey);
    if (preset) {
        details.innerHTML = `
            <strong>${escapeHtml(preset.name)}</strong><br>
            ${preset.description ? escapeHtml(preset.description) + '<br>' : ''}
            Duration: ${preset.duration} minutes<br>
            Max Participants: ${preset.maxParticipants || 'Unlimited'}<br>
            ${preset.roles && preset.roles.length > 0 ? `Roles: ${preset.roles.join(', ')}` : 'No roles'}
        `;
        preview.classList.remove('hidden');
    }
}

async function createFromPreset() {
    const presetKey = document.getElementById('fromPresetKey').value;
    const title = document.getElementById('fromPresetTitle').value.trim();
    const dateTime = document.getElementById('fromPresetDateTime').value;
    const guildId = document.getElementById('fromPresetGuild').value;
    const addToCalendar = document.getElementById('fromPresetAddToCalendar')?.checked || false;
    const calendarId = addToCalendar ? document.getElementById('fromPresetGoogleCalendarId')?.value : null;

    if (!presetKey || !dateTime) {
        showAlert('Please select a preset and date/time', 'error', 'fromPresetAlert');
        return;
    }

    try {
        const response = await fetch('/api/events/from-preset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({
                presetKey,
                title: title || null,
                dateTime,
                guildId: guildId || null,
                addToCalendar,
                calendarId
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Event created from preset successfully!', 'success', 'fromPresetAlert');
            document.querySelector('#create-from-preset form').reset();
            
            // Reset datetime
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            document.getElementById('fromPresetDateTime').value = now.toISOString().slice(0, 16);
            
            document.getElementById('presetPreview').classList.add('hidden');
            loadEvents();
            loadStats();
        } else {
            showAlert(data.error || 'Failed to create event', 'error', 'fromPresetAlert');
        }
    } catch (error) {
        console.error('Error creating event from preset:', error);
        showAlert('Failed to create event', 'error', 'fromPresetAlert');
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

        if (data.configured) {
            statusDiv.innerHTML = `
                <div class="status-indicator success">
                    <span class="status-dot"></span>
                    <div>
                        <strong>Google Calendar Configured</strong>
                        <p>Credentials file loaded successfully. You can now add calendars.</p>
                    </div>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="status-indicator error">
                    <span class="status-dot"></span>
                    <div>
                        <strong>Google Calendar Not Configured</strong>
                        <p>Please add credentials file and restart the bot. See instructions below.</p>
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

        container.innerHTML = calendars.map(cal => `
            <div class="calendar-item">
                <div class="calendar-info">
                    <h4>${escapeHtml(cal.name)}</h4>
                    <p class="calendar-id">${escapeHtml(cal.calendarId)}</p>
                    <small>Added: ${new Date(cal.createdAt).toLocaleString()}</small>
                </div>
                <div class="calendar-actions">
                    <button class="btn btn-small btn-secondary" onclick="editCalendar(${cal.id}, '${escapeHtml(cal.name)}', '${escapeHtml(cal.calendarId)}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteCalendar(${cal.id}, '${escapeHtml(cal.name)}')">Delete</button>
                </div>
            </div>
        `).join('');
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
            showAlert('Calendar added successfully!', 'success', 'addCalendarAlert');
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

    const calendarId = prompt('Calendar ID:', currentCalendarId);
    if (!calendarId) return;

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
        const select2 = document.getElementById('fromPresetGoogleCalendarId');

        if (calendars.length === 0) {
            if (select1) select1.innerHTML = '<option value="">No calendars configured</option>';
            if (select2) select2.innerHTML = '<option value="">No calendars configured</option>';
            return;
        }

        const options = calendars.map(cal => 
            `<option value="${cal.calendarId}">${escapeHtml(cal.name)}</option>`
        ).join('');

        if (select1) select1.innerHTML = options;
        if (select2) select2.innerHTML = options;
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

function toggleFromPresetCalendarSelect() {
    const checkbox = document.getElementById('fromPresetAddToCalendar');
    const selectGroup = document.getElementById('fromPresetCalendarSelectGroup');
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

        // Update all guild selects
        const selects = [
            document.getElementById('eventGuild'),
            document.getElementById('fromPresetGuild'),
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

    // Load event channel
    try {
        const response = await fetch(`/api/event-channel/${guildId}`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const data = await response.json();
        document.getElementById('eventChannelInput').value = data.channelId || '';
    } catch (error) {
        console.error('Error loading event channel:', error);
    }

    // Load streaming config
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

function loadStreamingConfig(guildId) {
    if (!guildId) {
        document.getElementById('streamingContent').classList.add('hidden');
        document.getElementById('noStreamingGuildSelected').style.display = 'block';
        return;
    }

    document.getElementById('streamingContent').classList.remove('hidden');
    document.getElementById('noStreamingGuildSelected').style.display = 'none';
}

function addTwitchRow() {
    const container = document.getElementById('twitchContainer');
    const row = document.createElement('div');
    row.className = 'twitch-row';
    row.innerHTML = `
        <input type="text" placeholder="Twitch username" class="twitch-username">
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

function saveTwitchConfig() {
    showAlert('Twitch configuration saved (placeholder)', 'success', 'twitchStatus');
}

function saveYouTubeConfig() {
    showAlert('YouTube configuration saved (placeholder)', 'success', 'youtubeStatus');
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
                <div><strong>Uptime:</strong> ${status.uptime || 'N/A'}</div>
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

function restartBot() {
    if (confirm('Restart the Discord bot? The web server will remain running.')) {
        showAlert('Bot restart requested', 'success', 'botControlAlert');
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

        // Group by category
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
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all channel items
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active to clicked channel item
    if (event && event.target) {
        event.target.closest('.channel-item')?.classList.add('active');
    }

    // Load data for specific tabs
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}