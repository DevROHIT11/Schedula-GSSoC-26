// Centralised time / currency / link helpers.

const HM_RE = /^(\d{1,2}):(\d{1,2})/;

// Accepts "HH:MM", "HH:MM:SS", "YYYY-MM-DD HH:MM:SS" or Date — returns "9:00 AM".
export function formatTime(input) {
  if (!input) return '';
  if (input instanceof Date) {
    const h = input.getHours();
    const m = input.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  const s = String(input).trim();
  // MySQL "YYYY-MM-DD HH:MM:SS"
  const dt = s.length >= 16 ? s.slice(11) : s;
  const m = dt.match(HM_RE);
  if (!m) return s;
  const h = Number(m[1]);
  const mn = Number(m[2]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mn).padStart(2, '0')} ${ampm}`;
}

// "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" → "Mon, May 4"
export function formatShortDate(input) {
  if (!input) return '';
  const s = String(input).trim();
  const isoLike = s.length === 10 ? `${s}T00:00:00` : s.replace(' ', 'T');
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// "YYYY-MM-DD HH:MM:SS" → "Mon, May 4 · 9:00 AM"
export function formatDateTime(input) {
  if (!input) return '';
  const s = String(input).trim().replace(' ', 'T');
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(input);
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return `${date} · ${formatTime(d)}`;
}

export function formatINR(n, opts = {}) {
  const v = Number(n || 0);
  return `₹${v.toLocaleString('en-IN', {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 2,
  })}`;
}

export const isHttpUrl = (s) => /^https?:\/\/[^\s]+$/i.test(String(s || '').trim());

// Mirrors backend utils/meeting.js. The join window opens 5 min before the
// scheduled start and stays open until 15 min after the scheduled end.
const JOIN_EARLY = 5 * 60 * 1000;
const JOIN_LATE  = 15 * 60 * 1000;

export function meetingJoinState(start, end, now = Date.now()) {
  if (!start) return { state: 'unknown' };
  const s = new Date(String(start).replace(' ', 'T')).getTime();
  const e = new Date(String(end || start).replace(' ', 'T')).getTime();
  const open  = s - JOIN_EARLY;
  const close = e + JOIN_LATE;
  if (now < open)  return { state: 'pending', minsToOpen: Math.ceil((open - now) / 60000), startsInMin: Math.ceil((s - now) / 60000) };
  if (now > close) return { state: 'ended' };
  return { state: 'live', minsRemaining: Math.ceil((close - now) / 60000) };
}

// Human-readable countdown: "in 2 days", "in 4 hrs", "in 12 min", "now"
export function humanCountdown(min) {
  if (min == null) return '';
  if (min <= 0) return 'now';
  if (min < 60) return `in ${min} min`;
  const hrs = Math.floor(min / 60);
  const rem = min % 60;
  if (hrs < 24) return rem ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `in ${days} day${days > 1 ? 's' : ''}`;
}

// Resolve relative /uploads URLs returned by the API to the full backend URL.
export function resolveAsset(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) {
    const base = import.meta.env.VITE_API_BASE_URL || '';
    return base + url;
  }
  return url;
}
