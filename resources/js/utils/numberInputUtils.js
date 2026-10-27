/**
 * Number Input Validation & Formatting Utilities for Rudra Jewellery
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
 * Normalizes numeric input string when user types into a field with default 0 / 0.000 / 0.00
 * Prevents '0' + '43' -> '043' or '4' + '0' -> '40' / '430'
 */
export const normalizeNumericInput = (newVal, prevVal = '') => {
  if (newVal === '' || newVal === null || newVal === undefined) return '';
  let str = String(newVal).trim();

  // If user typed a number when field was previously default '0' or '0.000' or '0.00'
  const prevStr = String(prevVal ?? '').trim();
  const wasDefaultZero = (
    prevStr === '0' ||
    prevStr === '0.0' ||
    prevStr === '0.00' ||
    prevStr === '0.000' ||
    (Number(prevStr) === 0 && !prevStr.includes('.'))
  );

  // Scenario 1: User typed non-zero digit when field had leading zeros:
  // e.g. '01' -> '1', '043' -> '43', '005' -> '5'
  // But preserve '0.' for decimals (e.g. '0.5', '0.014', '0.00015')
  if (/^0+[1-9]/.test(str)) {
    str = str.replace(/^0+([1-9])/, '$1');
  }

  // Scenario 2: Multiple leading zeros entered before decimal (e.g. '00.5' -> '0.5')
  if (/^00+\./.test(str)) {
    str = str.replace(/^0+/, '0');
  }

  return str;
};

/**
 * Auto-selects input value when focused if it represents zero (0, 0.0, 0.00, 0.000)
 * Uses both immediate select and microtask/timeout to survive browser mouseup caret positioning
 */
export const handleNumericFocus = (e) => {
  if (!e || !e.target) return;
  const target = e.target;
  const val = String(target.value ?? '').trim();
  if (
    val === '0' ||
    val === '0.0' ||
    val === '0.00' ||
    val === '0.000' ||
    (Number(val) === 0 && !val.includes('.'))
  ) {
    try {
      target.select();
    } catch (_) {}
    setTimeout(() => {
      try {
        target.select();
      } catch (_) {}
    }, 15);
  }
};

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
export const sanitizeInteger = (value, allowNegative = false, min = null, max = null, prevVal = '') => {
  if (value === '' || value === null || value === undefined) return '';
  let str = normalizeNumericInput(value, prevVal);
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
export const sanitizeDecimal = (value, allowNegative = false, maxDecimals = 3, min = null, max = null, prevVal = '') => {
  if (value === '' || value === null || value === undefined) return '';
  let str = normalizeNumericInput(value, prevVal);
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
