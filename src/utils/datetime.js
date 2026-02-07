// src/utils/datetime.js

/**
 * Parse DD-MM-YYYY HH:MM format (with optional AM/PM)
 * @param {string} dateTimeStr - Date time string
 * @returns {Date|null} - Parsed date or null if invalid
 */
function parseDateTime(dateTimeStr) {
    const parts = dateTimeStr.trim().split(' ');
    
    if (parts.length < 2) {
        return null;
    }
    
    const datePart = parts[0];
    const timePart = parts[1];
    const meridiem = parts[2]?.toUpperCase();
    
    const dateComponents = datePart.split('-');
    if (dateComponents.length !== 3) {
        return null;
    }
    
    const day = parseInt(dateComponents[0]);
    const month = parseInt(dateComponents[1]) - 1;
    const year = parseInt(dateComponents[2]);
    
    const timeComponents = timePart.split(':');
    if (timeComponents.length !== 2) {
        return null;
    }
    
    let hours = parseInt(timeComponents[0]);
    const minutes = parseInt(timeComponents[1]);
    
    if (meridiem) {
        if (meridiem === 'PM' && hours < 12) {
            hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }
    }
    
    const dateTime = new Date(year, month, day, hours, minutes);
    
    if (isNaN(dateTime.getTime())) {
        return null;
    }
    
    return dateTime;
}

/**
 * Format date for display
 * @param {string} dateTimeStr - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${day}-${month}-${year} ${hours}:${minutes} ${meridiem}`;
}

/**
 * Get Unix timestamp from Date
 * @param {Date|string} date - Date object or ISO string
 * @returns {number} - Unix timestamp
 */
function getUnixTimestamp(date) {
    return Math.floor(new Date(date).getTime() / 1000);
}

/**
 * Check if date is in the past
 * @param {string} dateTimeStr - ISO date string
 * @returns {boolean} - True if date is in the past
 */
function isPast(dateTimeStr) {
    return new Date(dateTimeStr) < new Date();
}

/**
 * Check if date is upcoming (in the future)
 * @param {string} dateTimeStr - ISO date string
 * @returns {boolean} - True if date is in the future
 */
function isUpcoming(dateTimeStr) {
    return new Date(dateTimeStr) > new Date();
}

module.exports = {
    parseDateTime,
    formatDateTime,
    getUnixTimestamp,
    isPast,
    isUpcoming
};
