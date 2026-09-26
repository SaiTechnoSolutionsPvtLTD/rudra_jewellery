/**
 * Number Input Validation & Formatting Utilities for Rudhra Jewellers
 */

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
 * Handle keydown for Integer fields (Quantity, Pieces, Count, Stock, Days, etc.)
 */
export const handleIntegerKeyDown = (e, allowNegative = false) => {
  if (CONTROL_KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }
  if (allowNegative && e.key === '-' && !e.currentTarget.value.includes('-')) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * Handle keydown for Decimal fields (Weights, Rates, Amounts, Percentages, etc.)
 */
export const handleDecimalKeyDown = (e, allowNegative = false) => {
  if (CONTROL_KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }
  if (allowNegative && e.key === '-' && !e.currentTarget.value.includes('-')) {
    return;
  }
  if (e.key === '.') {
    if (e.currentTarget.value.includes('.')) {
      e.preventDefault();
    }
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * Sanitize integer inputs (from typing, paste, or programmatic update)
 */
export const sanitizeInteger = (value, allowNegative = false, min = null, max = null) => {
  if (value === '' || value === null || value === undefined) return '';
  let str = String(value);
  if (allowNegative) {
    str = str.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
  } else {
    str = str.replace(/[^0-9]/g, '');
  }
  if (str === '' || str === '-') return str;
  let num = parseInt(str, 10);
  if (isNaN(num)) return '';
  if (min !== null && num < min) num = min;
  if (max !== null && num > max) num = max;
  return String(num);
};

/**
 * Sanitize decimal inputs (supporting jewellery precision like 3 decimals for weights)
 */
export const sanitizeDecimal = (value, allowNegative = false, maxDecimals = 3, min = null, max = null) => {
  if (value === '' || value === null || value === undefined) return '';
  let str = String(value);
  if (allowNegative) {
    str = str.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '');
  } else {
    str = str.replace(/[^0-9.]/g, '');
  }
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }
  const updatedParts = str.split('.');
  if (updatedParts[1] && updatedParts[1].length > maxDecimals) {
    str = updatedParts[0] + '.' + updatedParts[1].slice(0, maxDecimals);
  }
  if (min !== null && str !== '' && str !== '-' && str !== '.') {
    const num = parseFloat(str);
    if (!isNaN(num) && num < min) return String(min);
  }
  if (max !== null && str !== '' && str !== '-' && str !== '.') {
    const num = parseFloat(str);
    if (!isNaN(num) && num > max) return String(max);
  }
  return str;
};
