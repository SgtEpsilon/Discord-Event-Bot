// public/calendars.js

// Check authentication on page load
checkAuth();

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        if (!response.ok) {
            window.location.href = 'login.html';
        } else {
            loadCalendarStatus();
            loadConfiguredCalendars();
        }
    } catch (error) {
        window.location.href = 'login.html';
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    window.location.href = 'login.html';
}

function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('statusMessage');
    messageDiv.textContent = message;
    messageDiv.className = `status-message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

async function loadCalendarStatus() {
    try {
        const response = await fetch('/api/calendars/status');
        const data = await response.json();
        
        const statusDiv = document.getElementById('calendarStatus');
        if (data.configured) {
            statusDiv.innerHTML = `
                <div class="status-indicator success">
                    <span class="status-dot"></span>
                    <strong>Google Calendar Configured</strong>
                    <p>Credentials file loaded successfully. You can now add calendars.</p>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="status-indicator error">
                    <span class="status-dot"></span>
                    <strong>Google Calendar Not Configured</strong>
                    <p>Please add credentials file and restart the bot. See instructions below.</p>
                    ${data.error ? `<p class="error-text">Error: ${data.error}</p>` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error checking calendar status:', error);
    }
}

async function loadConfiguredCalendars() {
    try {
        const response = await fetch('/api/calendars');
        const calendars = await response.json();
        
        const listDiv = document.getElementById('configuredCalendarsList');
        
        if (calendars.length === 0) {
            listDiv.innerHTML = '<p class="empty-state">No calendars configured yet. Add one above to get started!</p>';
            return;
        }
        
        listDiv.innerHTML = calendars.map(cal => `
            <div class="calendar-item">
                <div class="calendar-info">
                    <h3>${escapeHtml(cal.name)}</h3>
                    <p class="calendar-id">${escapeHtml(cal.calendarId)}</p>
                    <small>Added: ${new Date(cal.createdAt).toLocaleString()}</small>
                </div>
                <div class="calendar-actions">
                    <button onclick="editCalendar(${cal.id}, '${escapeHtml(cal.name)}', '${escapeHtml(cal.calendarId)}')" 
                            class="btn btn-small btn-secondary">Edit</button>
                    <button onclick="deleteCalendar(${cal.id}, '${escapeHtml(cal.name)}')" 
                            class="btn btn-small btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading calendars:', error);
        document.getElementById('configuredCalendarsList').innerHTML = 
            '<p class="error-text">Failed to load calendars</p>';
    }
}

async function loadAvailableCalendars() {
    const section = document.getElementById('availableCalendarsSection');
    const listDiv = document.getElementById('availableCalendarsList');
    
    section.style.display = 'block';
    listDiv.innerHTML = '<div class="loading">Loading available calendars...</div>';
    
    try {
        const response = await fetch('/api/calendars/available');
        
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
                <button onclick="addCalendarFromList('${escapeHtml(cal.summary)}', '${escapeHtml(cal.id)}')" 
                        class="btn btn-primary btn-small">Add This Calendar</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading available calendars:', error);
        listDiv.innerHTML = `<p class="error-text">${error.message}</p>`;
    }
}

function showManualAdd() {
    document.getElementById('manualAddSection').style.display = 'block';
    document.getElementById('availableCalendarsSection').style.display = 'none';
}

function hideManualAdd() {
    document.getElementById('manualAddSection').style.display = 'none';
    document.getElementById('calendarName').value = '';
    document.getElementById('calendarId').value = '';
}

async function addCalendarFromList(name, calendarId) {
    try {
        const response = await fetch('/api/calendars', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, calendarId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Calendar added successfully!', 'success');
            loadConfiguredCalendars();
            document.getElementById('availableCalendarsSection').style.display = 'none';
        } else {
            showMessage(data.error || 'Failed to add calendar', 'error');
        }
    } catch (error) {
        console.error('Error adding calendar:', error);
        showMessage('Failed to add calendar', 'error');
    }
}

async function addCalendar() {
    const name = document.getElementById('calendarName').value.trim();
    const calendarId = document.getElementById('calendarId').value.trim();
    
    if (!name || !calendarId) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/calendars', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, calendarId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Calendar added successfully!', 'success');
            hideManualAdd();
            loadConfiguredCalendars();
        } else {
            showMessage(data.error || 'Failed to add calendar', 'error');
        }
    } catch (error) {
        console.error('Error adding calendar:', error);
        showMessage('Failed to add calendar', 'error');
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, calendarId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Calendar updated successfully!', 'success');
            loadConfiguredCalendars();
        } else {
            showMessage(data.error || 'Failed to update calendar', 'error');
        }
    } catch (error) {
        console.error('Error updating calendar:', error);
        showMessage('Failed to update calendar', 'error');
    }
}

async function deleteCalendar(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/calendars/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Calendar deleted successfully!', 'success');
            loadConfiguredCalendars();
        } else {
            showMessage(data.error || 'Failed to delete calendar', 'error');
        }
    } catch (error) {
        console.error('Error deleting calendar:', error);
        showMessage('Failed to delete calendar', 'error');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}