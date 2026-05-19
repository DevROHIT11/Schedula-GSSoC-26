// Centralised input filters & validators. Use the *filter* helpers inside
// onChange to PREVENT bad characters from being entered, and the *is*
// helpers to check final values before submit.

export const onlyDigits   = (s) => String(s || '').replace(/\D/g, '');
export const onlyFloat    = (s) => {
  const cleaned = String(s || '').replace(/[^0-9.]/g, '');
  // Keep only one dot.
  const i = cleaned.indexOf('.');
  if (i === -1) return cleaned;
  return cleaned.slice(0, i + 1) + cleaned.slice(i + 1).replace(/\./g, '');
};

// Phone: allow leading +, digits, spaces and hyphens — strip everything else
// while typing so users CAN'T enter letters at all. Cap at 18 chars
// (e.g. "+91 98765 43210" plus padding).
export const filterPhone  = (s) => String(s || '').replace(/[^\d+\s\-]/g, '').slice(0, 18);

export const filterAlpha  = (s) => String(s || '').replace(/[^a-zA-Z\s'.\-]/g, '');
export const filterEmail  = (s) => String(s || '').replace(/\s+/g, '').slice(0, 160);

export const isValidPhone = (s) => {
  const d = onlyDigits(s);
  return d.length >= 10 && d.length <= 15;
};
export const isValidEmail = (s) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

export const isValidName  = (s) => {
  const t = String(s || '').trim();
  return t.length >= 2 && /^[a-zA-Z\s'.\-]+$/.test(t);
};

export const isValidUrl   = (s) => /^https?:\/\/[^\s]+$/i.test(String(s || '').trim());

export const isPositive   = (s) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0;
};
export const inRange      = (min, max) => (s) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= min && n <= max;
};

// Returns the FIRST error message, or null if all checks pass.
// Each rule is a [predicate, message] tuple.
export function firstError(value, rules) {
  for (const [ok, msg] of rules) if (!ok(value)) return msg;
  return null;
}
