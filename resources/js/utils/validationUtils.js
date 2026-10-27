/**
 * Centralized Form Input Validation & Sanitization Utilities
 * Rudra Jewellery ERP
 */

// Key codes allowed during typing
const CONTROL_KEYS = [
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
];

/**
 * 1. Mobile / Phone Validation
 * Exactly 10 digits for Indian mobile numbers (starts with 6, 7, 8, or 9; or exactly 10 digits)
 */
export const isValidIndianMobile = (phone) => {
  if (!phone) return false;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return /^[6-9]\d{9}$/.test(cleaned);
};

export const validateMobile = (phone, arg2 = true, arg3 = undefined) => {
  const isArg2String = typeof arg2 === 'string';
  const label = isArg2String ? arg2 : 'Mobile number';
  const required = isArg2String ? (arg3 !== undefined ? !!arg3 : true) : !!arg2;

  const str = String(phone || '').trim();
  if (!str) {
    return required ? `${label} is required` : null;
  }
  let digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    digitsOnly = digitsOnly.slice(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.slice(1);
  }
  if (digitsOnly.length !== 10) {
    return `${label} must be exactly 10 digits`;
  }
  if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
    return `Enter a valid 10-digit Indian ${label.toLowerCase()} (starting with 6, 7, 8, or 9)`;
  }
  return null;
};

export const sanitizeMobile = (value) => {
  if (!value) return '';
  let cleaned = String(value).replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.slice(0, 10);
};

export const handleMobileKeyDown = (e) => {
  if (CONTROL_KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * 2. Email Validation
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
};

export const sanitizeEmail = (email) => {
  if (!email) return '';
  return String(email).toLowerCase().replace(/\s+/g, '');
};

export const validateEmail = (email, arg2 = false, arg3 = undefined) => {
  const isArg2String = typeof arg2 === 'string';
  const label = isArg2String ? arg2 : 'Email address';
  const required = isArg2String ? (arg3 !== undefined ? !!arg3 : false) : !!arg2;

  const str = String(email || '').trim().toLowerCase();
  if (!str) {
    return required ? `${label} is required` : null;
  }
  if (!isValidEmail(str)) {
    return `Please enter a valid ${label.toLowerCase()} (e.g. user@example.com)`;
  }
  return null;
};

/**
 * 3. Person Names Validation
 * Allows letters, spaces, hyphens, apostrophes, dots. Rejects digits and special symbols.
 */
export const isValidPersonName = (name) => {
  if (!name) return false;
  const str = String(name).trim();
  if (str.length < 2 || str.length > 100) return false;
  return /^[A-Za-z\u00C0-\u024F\u0900-\u097F\s.'-]+$/.test(str);
};

export const validatePersonName = (name, fieldLabel = 'Name', required = true) => {
  const str = String(name || '').trim();
  if (!str) {
    return required ? `${fieldLabel} is required` : null;
  }
  if (str.length < 2) {
    return `${fieldLabel} must be at least 2 characters`;
  }
  if (/\d/.test(str)) {
    return `${fieldLabel} cannot contain numbers`;
  }
  if (!/^[A-Za-z\u00C0-\u024F\u0900-\u097F\s.'-]+$/.test(str)) {
    return `${fieldLabel} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  return null;
};

export const handlePersonNameKeyDown = (e) => {
  if (CONTROL_KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }
  if (!/^[A-Za-z\u00C0-\u024F\u0900-\u097F\s.'-]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * 4. Business / Company Name Validation
 * Allows letters, numbers, spaces, and normal business punctuation.
 */
export const validateBusinessName = (name, fieldLabel = 'Company Name', required = true) => {
  const str = String(name || '').trim();
  if (!str) {
    return required ? `${fieldLabel} is required` : null;
  }
  if (str.length < 2) {
    return `${fieldLabel} must be at least 2 characters`;
  }
  return null;
};

/**
 * 5. Required Non-Empty Text Validation
 */
export const validateRequired = (val, fieldLabel = 'This field') => {
  if (val === null || val === undefined) return `${fieldLabel} is required`;
  if (typeof val === 'string' && val.trim() === '') return `${fieldLabel} is required`;
  if (Array.isArray(val) && val.length === 0) return `Please select at least one ${fieldLabel}`;
  return null;
};

/**
 * 6. PIN Code Validation (India)
 * Exactly 6 digits
 */
export const isValidPincode = (pin) => {
  if (!pin) return false;
  return /^[1-9][0-9]{5}$/.test(String(pin).trim());
};

export const validatePincode = (pin, required = false) => {
  const str = String(pin || '').trim();
  if (!str) {
    return required ? 'PIN code is required' : null;
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length !== 6 || !/^[1-9][0-9]{5}$/.test(digits)) {
    return 'Enter a valid 6-digit PIN code';
  }
  return null;
};

export const sanitizePincode = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 6);
};

export const handlePincodeKeyDown = (e) => {
  if (CONTROL_KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  const target = e.target;
  if (target && typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
    const selectedLength = target.selectionEnd - target.selectionStart;
    if (target.value && target.value.length >= 6 && selectedLength === 0) {
      e.preventDefault();
    }
  }
};

/**
 * 7. GSTIN Validation (India)
 * 15 characters: 2 digits state code, 10 chars PAN, 1 entity code, 1 Z, 1 checksum
 */
export const isValidGSTIN = (gstin) => {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(String(gstin).trim());
};

export const validateGSTIN = (gstin, required = false) => {
  const str = String(gstin || '').trim().toUpperCase();
  if (!str) {
    return required ? 'GSTIN is required' : null;
  }
  if (!isValidGSTIN(str)) {
    return 'Enter a valid 15-character GSTIN (e.g. 33AAAAA0000A1Z5)';
  }
  return null;
};

export const sanitizeGSTIN = (value) => {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
};

/**
 * 8. PAN Validation (India)
 * 10 characters: 5 letters, 4 digits, 1 letter
 */
export const isValidPAN = (pan) => {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(String(pan).trim());
};

export const validatePAN = (pan, required = false) => {
  const str = String(pan || '').trim().toUpperCase();
  if (!str) {
    return required ? 'PAN number is required' : null;
  }
  if (!isValidPAN(str)) {
    return 'Enter a valid 10-character PAN (e.g. ABCDE1234F)';
  }
  return null;
};

export const sanitizePAN = (value) => {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 10);
};

/**
 * 9. Non-negative Numeric Range Validation
 */
export const validateNonNegativeNumber = (
  value,
  fieldLabel = 'Value',
  { required = true, allowZero = true, min = null, max = null, integerOnly = false } = {}
) => {
  if (value === '' || value === null || value === undefined) {
    return required ? `${fieldLabel} is required` : null;
  }
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldLabel} must be a valid number`;
  }
  if (integerOnly && !Number.isInteger(num)) {
    return `${fieldLabel} must be a whole number`;
  }
  if (!allowZero && num === 0) {
    return `${fieldLabel} must be greater than zero`;
  }
  if (num < 0) {
    return `${fieldLabel} cannot be negative`;
  }
  if (min !== null && num < min) {
    return `${fieldLabel} cannot be less than ${min}`;
  }
  if (max !== null && num > max) {
    return `${fieldLabel} cannot exceed ${max}`;
  }
  return null;
};

/**
 * 10. Date Validation
 */
export const validateDate = (dateVal, fieldLabel = 'Date', required = true) => {
  if (!dateVal) {
    return required ? `${fieldLabel} is required` : null;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    return `Please enter a valid ${fieldLabel.toLowerCase()}`;
  }
  return null;
};

/**
 * 11. Dropdown / Master Record Selection
 */
export const validateSelection = (val, fieldLabel = 'Selection', required = true) => {
  if (val === null || val === undefined || val === '' || val === '0' || val === 0) {
    return required ? `Please select a ${fieldLabel.toLowerCase()}` : null;
  }
  return null;
};

/**
 * 12. IFSC Code Validation (India)
 * 11 characters: 4 letters bank code, '0', 6 alphanumeric characters branch code
 */
export const isValidIFSC = (ifsc) => {
  if (!ifsc) return false;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(ifsc).trim());
};

export const validateIFSC = (ifsc, required = false) => {
  const str = String(ifsc || '').trim().toUpperCase();
  if (!str) {
    return required ? 'IFSC code is required' : null;
  }
  if (!isValidIFSC(str)) {
    return 'Enter a valid 11-character IFSC code (e.g. SBIN0001234)';
  }
  return null;
};

export const sanitizeIFSC = (value) => {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 11);
};

/**
 * 13. Bank Account Number Validation
 * 9 to 18 digits numeric
 */
export const isValidAccountNumber = (acc) => {
  if (!acc) return false;
  return /^\d{9,18}$/.test(String(acc).trim());
};

export const validateAccountNumber = (acc, required = false) => {
  const str = String(acc || '').trim();
  if (!str) {
    return required ? 'Account number is required' : null;
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 18) {
    return 'Account number must be between 9 and 18 digits';
  }
  return null;
};

export const sanitizeAccountNumber = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 18);
};

