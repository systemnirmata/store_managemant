// Lightweight frontend validation helpers
export function containsLetter(value) {
  return /[A-Za-z]/.test(String(value || ""));
}

export function isAllowedName(value) {
  if (!value) return false;
  const v = String(value).trim();
  // Allowed chars: letters, numbers, spaces, dash, underscore, dot
  if (!/^[A-Za-z0-9\s\-_.]+$/.test(v)) return false;
  // Must contain at least one letter (not only numbers)
  return containsLetter(v);
}

export function isValidPhone(value) {
  if (!value && value !== 0) return false;
  return /^\d{10}$/.test(String(value));
}

export function isValidEmail(value) {
  if (!value) return false;
  // simple but practical email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function isNonNegativeNumber(value) {
  if (value === "" || value === null || value === undefined) return false;
  const n = Number(value);
  return !Number.isNaN(n) && n >= 0;
}
