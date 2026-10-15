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

  // Scenario 1: Cursor was at end, typed 1 -> '01', or 43 -> '043'
  // Remove leading zeros before any non-zero digit: '01' -> '1', '04' -> '4', '043' -> '43', '005' -> '5'
  // But preserve '0.' for decimals (e.g. '0.5', '0.014')
  if (/^0+[1-9]/.test(str)) {
    str = str.replace(/^0+([1-9])/, '$1');
  }

  // Scenario 2: Cursor was at start (before '0'):
  // User typed 1 -> '10', or 43 -> '430'
  // When previously default zero, strip the trailing zero that was the old default
  if (wasDefaultZero && !str.includes('.') && str.endsWith('0') && str !== '0' && str !== '00') {
    str = str.replace(/0$/, '');
  }

  // Scenario 3: If previously was '0.000' or '0.00' or '0.0' and user typed digits at beginning:
  // e.g. '40.000' -> '4' or '430.000' -> '43'
  if (wasDefaultZero && (prevStr === '0.000' || prevStr === '0.00' || prevStr === '0.0') && /^[1-9]+0\.(000|00|0)$/.test(str)) {
    str = str.replace(/0\.(000|00|0)$/, '');
  }

  // Scenario 4: Multiple leading zeros entered before decimal (e.g. '00.5')
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
