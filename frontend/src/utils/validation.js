// Common validation utilities for forms

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @param {string} fieldName - Field name for error messages (default: 'Email ID')
 */
export const validateEmail = (email, fieldName = 'Email ID') => {
  if (!email) return `${fieldName} is required.`;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return `Please enter a valid ${fieldName}.`;
  return null;
};

/**
 * Validate phone number (supports Indian, UAE/Dubai, and international formats)
 * India: 10 digits starting with 6, 7, 8, or 9 (mobile), or with country code +91
 * UAE/Dubai: 9 digits starting with 5 (mobile), or with country code +971
 * International: 8-15 digits, may start with +
 */
export const validatePhone = (phone, country = null) => {
  if (!phone) return 'Contact Number is required.';

  // Remove spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Indian phone number validation
  if (country === 'India' || country === 'india') {
    // With country code: +91 followed by 10 digits starting with 6,7,8,9
    // Without country code: 10 digits starting with 6,7,8,9
    const indiaWithCode = /^\+91[6-9]\d{9}$/;
    const indiaWithoutCode = /^[6-9]\d{9}$/;
    if (!indiaWithCode.test(cleanPhone) && !indiaWithoutCode.test(cleanPhone)) {
      return 'Enter a valid Indian mobile number (10 digits starting with 6-9, or +91 prefix).';
    }
    return null;
  }

  // UAE/Dubai phone number validation
  if (country === 'UAE' || country === 'United Arab Emirates' || country === 'Dubai' || country === 'dubai') {
    // With country code: +971 followed by 9 digits (mobile starts with 5)
    // Without country code: 9 digits starting with 5
    const uaeWithCode = /^\+971[1-9]\d{8}$/;
    const uaeWithoutCode = /^[1-9]\d{8}$/;
    if (!uaeWithCode.test(cleanPhone) && !uaeWithoutCode.test(cleanPhone)) {
      return 'Enter a valid UAE mobile number (9 digits, or +971 prefix).';
    }
    return null;
  }

  // General international validation (8-15 digits, may start with +)
  const phoneRegex = /^\+?[0-9]{8,15}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return 'Enter a valid mobile number (8-15 digits, optionally with country code).';
  }
  return null;
};

/**
 * Validate required field
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required.`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required.`;
  }
  return null;
};

/**
 * Validate minimum length
 */
export const validateMinLength = (value, minLength, fieldName = 'This field') => {
  if (!value) return null; // Let validateRequired handle empty
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters.`;
  }
  return null;
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (value, maxLength, fieldName = 'This field') => {
  if (!value) return null;
  if (value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters.`;
  }
  return null;
};

/**
 * Validate positive number
 */
export const validatePositiveNumber = (value, fieldName = 'This field') => {
  if (value === '' || value === undefined || value === null) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return `${fieldName} must be a valid number.`;
  if (num < 0) return `${fieldName} must be a positive number.`;
  return null;
};

/**
 * Validate price/amount (positive, up to 2 decimal places)
 */
export const validatePrice = (value, fieldName = 'Price') => {
  if (value === '' || value === undefined || value === null) {
    return `${fieldName} is required.`;
  }
  const num = parseFloat(value);
  if (isNaN(num)) return `${fieldName} must be a valid number.`;
  if (num <= 0) return `${fieldName} must be greater than 0.`;
  // Check for more than 2 decimal places
  const decimalPart = value.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return `${fieldName} can have at most 2 decimal places.`;
  }
  return null;
};

/**
 * Validate name (letters, spaces, hyphens, apostrophes only)
 */
export const validateName = (value, fieldName = 'Name') => {
  if (!value) return `${fieldName} is required.`;
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(value)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes.`;
  }
  if (value.length < 2) return `${fieldName} must be at least 2 characters.`;
  if (value.length > 50) return `${fieldName} must be less than 50 characters.`;
  return null;
};

/**
 * Validate entity name (office, property, etc.) - must contain at least some alphanumeric characters
 * Allows letters, numbers, spaces, hyphens, apostrophes, and common punctuation
 * Rejects names that consist only of special characters or whitespace
 */
export const validateEntityName = (value, fieldName = 'Name') => {
  if (!value) return `${fieldName} is required.`;

  // Trim whitespace
  const trimmedValue = value.trim();

  // Check if empty after trim
  if (trimmedValue.length === 0) {
    return `${fieldName} is required.`;
  }

  // Check minimum length
  if (trimmedValue.length < 2) {
    return `${fieldName} must be at least 2 characters.`;
  }

  // Check maximum length
  if (trimmedValue.length > 100) {
    return `${fieldName} must be less than 100 characters.`;
  }

  // Must contain at least one alphanumeric character (letter or number)
  if (!/[a-zA-Z0-9]/.test(trimmedValue)) {
    return `${fieldName} must contain at least one letter or number.`;
  }

  // Allow letters, numbers, spaces, hyphens, apostrophes, commas, periods, parentheses, and ampersands
  const validNameRegex = /^[a-zA-Z0-9\s\-',.&()]+$/;
  if (!validNameRegex.test(trimmedValue)) {
    return `${fieldName} contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, commas, periods, parentheses, and ampersands are allowed.`;
  }

  return null;
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be less than 128 characters.';
  // Check for at least one uppercase, one lowercase, one number, and one special character
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(password);
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
  }
  return null;
};

/**
 * Validate URL
 */
export const validateUrl = (url, required = false) => {
  if (!url) {
    if (required) return 'URL is required.';
    return null;
  }
  try {
    new URL(url);
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com).';
  }
};

/**
 * Validate date (not in past)
 */
export const validateFutureDate = (date, fieldName = 'Date') => {
  if (!date) return `${fieldName} is required.`;
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    return `${fieldName} cannot be in the past.`;
  }
  return null;
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDateFormat = (date) => {
  if (!date) return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return 'Please enter a valid date.';
  }
  return null;
};

/**
 * Sanitize input - remove leading/trailing whitespace and dangerous characters
 */
export const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

/**
 * Validate form and return errors object
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules (field: [validators])
 * @returns {Object} errors - Object with field names as keys and error messages as values
 */
export const validateForm = (data, rules) => {
  const errors = {};
  Object.keys(rules).forEach(field => {
    const validators = rules[field];
    for (const validator of validators) {
      const error = validator(data[field]);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  return errors;
};

/**
 * Check if errors object has any errors
 */
export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

/**
 * Validate ZIP/Postal code
 */
export const validateZipCode = (zipCode, country = 'India') => {
  if (!zipCode) return null; // Optional field

  const cleanZip = zipCode.trim();

  // India: 6 digits
  if (country === 'India') {
    if (!/^\d{6}$/.test(cleanZip)) {
      return 'PIN code must be 6 digits.';
    }
    return null;
  }

  // UAE: varies but typically 5 digits or alphanumeric
  if (country === 'UAE' || country === 'United Arab Emirates') {
    if (!/^[a-zA-Z0-9]{3,10}$/.test(cleanZip)) {
      return 'Please enter a valid postal code.';
    }
    return null;
  }

  // Generic: alphanumeric, 3-10 characters
  if (!/^[a-zA-Z0-9\s\-]{3,10}$/.test(cleanZip)) {
    return 'Please enter a valid postal code.';
  }
  return null;
};

/**
 * Validate area/size (positive number)
 */
export const validateArea = (value, fieldName = 'Area') => {
  if (!value || value === '') return null; // Optional
  const num = parseFloat(value);
  if (isNaN(num)) return `${fieldName} must be a valid number.`;
  if (num <= 0) return `${fieldName} must be greater than 0.`;
  if (num > 999999999) return `${fieldName} is too large.`;
  return null;
};

/**
 * Validate integer (whole number)
 */
export const validateInteger = (value, fieldName = 'This field') => {
  if (!value || value === '') return null; // Optional
  const num = parseInt(value, 10);
  if (isNaN(num)) return `${fieldName} must be a whole number.`;
  return null;
};

/**
 * Validate percentage (0-100)
 */
export const validatePercentage = (value, fieldName = 'Percentage') => {
  if (!value || value === '') return null; // Optional
  const num = parseFloat(value);
  if (isNaN(num)) return `${fieldName} must be a valid number.`;
  if (num < 0 || num > 100) return `${fieldName} must be between 0 and 100.`;
  return null;
};

/**
 * Validate coordinates (latitude/longitude)
 */
export const validateCoordinates = (lat, lng) => {
  if (!lat && !lng) return null; // Both optional
  if (lat && (isNaN(parseFloat(lat)) || parseFloat(lat) < -90 || parseFloat(lat) > 90)) {
    return 'Latitude must be between -90 and 90.';
  }
  if (lng && (isNaN(parseFloat(lng)) || parseFloat(lng) < -180 || parseFloat(lng) > 180)) {
    return 'Longitude must be between -180 and 180.';
  }
  return null;
};

/**
 * Restrict input to only allow certain characters
 * Usage: onChange={(e) => handleNumericInput(e, setFormData)}
 */
export const handleNumericInput = (e, setter, field) => {
  const value = e.target.value.replace(/[^0-9]/g, '');
  if (field) {
    setter(prev => ({ ...prev, [field]: value }));
  }
  return value;
};

/**
 * Restrict input to only allow phone number characters (numbers and +)
 * Usage: onChange={(e) => handlePhoneInput(e, setFormData, 'phone')}
 */
export const handlePhoneInput = (e, setter, field) => {
  // Allow only numbers and + at the start
  let value = e.target.value;
  // Remove any character that's not a digit or +
  value = value.replace(/[^\d+]/g, '');
  // Ensure + only appears at the start
  if (value.indexOf('+') > 0) {
    value = value.replace(/\+/g, '');
  }
  // Remove duplicate + at the start
  if (value.startsWith('++')) {
    value = '+' + value.replace(/\+/g, '');
  }
  // Limit to 15 digits (plus optional + prefix)
  if (value.startsWith('+')) {
    if (value.length > 16) value = value.substring(0, 16);
  } else {
    if (value.length > 15) value = value.substring(0, 15);
  }
  if (field) {
    setter(prev => ({ ...prev, [field]: value }));
  }
  return value;
};

/**
 * Restrict input to only allow alphanumeric characters
 */
export const handleAlphanumericInput = (e, setter, field) => {
  const value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
  if (field) {
    setter(prev => ({ ...prev, [field]: value }));
  }
  return value;
};

/**
 * Restrict input to only allow numbers with decimals
 */
export const handleDecimalInput = (e, setter, field, maxDecimals = 2) => {
  let value = e.target.value;
  // Allow only numbers and one decimal point
  value = value.replace(/[^0-9.]/g, '');
  // Ensure only one decimal point
  const parts = value.split('.');
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('');
  }
  // Limit decimal places
  if (parts[1] && parts[1].length > maxDecimals) {
    value = parts[0] + '.' + parts[1].substring(0, maxDecimals);
  }
  if (field) {
    setter(prev => ({ ...prev, [field]: value }));
  }
  return value;
};

/**
 * Validate phone number with country code
 * @param {string} phone - Phone number (may include country code)
 * @param {string} countryCode - ISO country code (IN, AE, US, etc.)
 * @param {string} fieldName - Field name for error messages (default: 'Contact Number')
 */
export const validatePhoneWithCountry = (phone, countryCode = 'IN', fieldName = 'Contact Number') => {
  if (!phone) return `${fieldName} is required.`;

  // Country validation rules
  const countryRules = {
    'IN': { minLength: 10, maxLength: 10, regex: /^[6-9]\d{9}$/, message: `${fieldName} must be 10 digits starting with 6-9.` },
    'AE': { minLength: 9, maxLength: 9, regex: /^[1-9]\d{8}$/, message: `${fieldName} must be 9 digits.` },
    'US': { minLength: 10, maxLength: 10, regex: /^\d{10}$/, message: `${fieldName} must be 10 digits.` },
    'GB': { minLength: 10, maxLength: 11, regex: /^\d{10,11}$/, message: `${fieldName} must be 10-11 digits.` },
    'SA': { minLength: 9, maxLength: 9, regex: /^\d{9}$/, message: `${fieldName} must be 9 digits.` },
    'QA': { minLength: 8, maxLength: 8, regex: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
    'KW': { minLength: 8, maxLength: 8, regex: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
    'BH': { minLength: 8, maxLength: 8, regex: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
    'OM': { minLength: 8, maxLength: 8, regex: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
    'SG': { minLength: 8, maxLength: 8, regex: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
    'MY': { minLength: 9, maxLength: 10, regex: /^\d{9,10}$/, message: `${fieldName} must be 9-10 digits.` },
    'AU': { minLength: 9, maxLength: 9, regex: /^\d{9}$/, message: `${fieldName} must be 9 digits.` },
    'CA': { minLength: 10, maxLength: 10, regex: /^\d{10}$/, message: `${fieldName} must be 10 digits.` },
  };

  // Remove spaces, dashes, parentheses and country code prefix
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Remove country code prefix if present
  const countryCodePrefixes = {
    'IN': '+91', 'AE': '+971', 'US': '+1', 'GB': '+44', 'SA': '+966',
    'QA': '+974', 'KW': '+965', 'BH': '+973', 'OM': '+968', 'SG': '+65',
    'MY': '+60', 'AU': '+61', 'CA': '+1',
  };

  const prefix = countryCodePrefixes[countryCode] || '';
  if (prefix && cleanPhone.startsWith(prefix)) {
    cleanPhone = cleanPhone.slice(prefix.length);
  }

  // Get rules for the country
  const rules = countryRules[countryCode] || { minLength: 5, maxLength: 15, regex: /^.{5,15}$/, message: `Please enter a valid ${fieldName}.` };

  // Validate length
  if (cleanPhone.length < rules.minLength) {
    return `${fieldName} must be at least ${rules.minLength} digits.`;
  }
  if (cleanPhone.length > rules.maxLength) {
    return `${fieldName} must be no more than ${rules.maxLength} digits.`;
  }

  // Validate format
  if (rules.regex && !rules.regex.test(cleanPhone)) {
    return rules.message;
  }

  return null;
};

/**
 * Get country dial code from ISO code
 */
export const getDialCode = (countryCode) => {
  const dialCodes = {
    'IN': '+91', 'AE': '+971', 'US': '+1', 'GB': '+44', 'SA': '+966',
    'QA': '+974', 'KW': '+965', 'BH': '+973', 'OM': '+968', 'SG': '+65',
    'MY': '+60', 'AU': '+61', 'CA': '+1', 'DE': '+49', 'FR': '+33',
    'NZ': '+64', 'ZA': '+27', 'NG': '+234', 'EG': '+20', 'PK': '+92',
    'BD': '+880', 'LK': '+94', 'NP': '+977',
  };
  return dialCodes[countryCode] || '';
};