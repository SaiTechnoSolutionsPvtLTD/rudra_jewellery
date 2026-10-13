/**
 * Global formatting and data sanitization helpers
 */

export function cleanProductName(name, designNo) {
  if (!name) return 'Jewellery Piece';
  let cleaned = String(name).trim();
  if (designNo && String(designNo).trim()) {
    const d = String(designNo).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`\\s*\\(?${d}\\)?$`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`\\s*-\\s*${d}$`, 'i'), '');
  }
  cleaned = cleaned.replace(/\s*\([A-Z0-9_-]+\)$/i, '');
  return cleaned.trim() || name;
}
