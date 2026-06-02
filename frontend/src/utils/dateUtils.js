/**
 * Date formatting utilities for consistent date/time display across the application
 */

/**
 * Format date with time - used for action logs, status updates, timestamps
 * @param {string|Date} date - The date to format
 * @param {Object} options - Optional formatting options
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return 'N/A';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return new Date(date).toLocaleString('en-US', defaultOptions);
  } catch {
    return 'N/A';
  }
};

/**
 * Format date only - used for dates like possession date, completion date
 * @param {string|Date} date - The date to format
 * @param {Object} options - Optional formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  try {
    return new Date(date).toLocaleDateString('en-US', defaultOptions);
  } catch {
    return 'N/A';
  }
};

/**
 * Format date in long format - used for schedules, detailed dates
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string with weekday
 */
export const formatDateLong = (date) => {
  if (!date) return 'N/A';

  try {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Format relative time - used for recent actions
 * @param {string|Date} date - The date to format
 * @returns {string} Relative time string (e.g., "2 hours ago") or formatted date
 */
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';

  try {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    // For older dates, show date with time
    return formatDateTime(date);
  } catch {
    return 'N/A';
  }
};

/**
 * Format time only - used for scheduled times
 * @param {string|Date} date - The date/time to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return 'N/A';

  try {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Format time string (HH:MM) to 12-hour format with AM/PM
 * @param {string} timeString - Time string in HH:MM format (e.g., "10:00", "14:30")
 * @returns {string} Formatted time string (e.g., "10:00 AM", "2:30 PM")
 */
export const formatTimeString = (timeString) => {
  if (!timeString) return 'N/A';

  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return 'N/A';
  }
};

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {string|Date} date - The date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateInput = (date) => {
  if (!date) return '';

  try {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export default {
  formatDateTime,
  formatDate,
  formatDateLong,
  formatRelativeTime,
  formatTime,
  formatTimeString,
  formatDateInput
};