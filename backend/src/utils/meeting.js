// Single source of truth for "can this meeting be joined right now?".
// Window: from 5 minutes BEFORE start to 15 minutes AFTER end. Outside that
// window the join button is gated on the frontend AND the backend rejects
// /join-link requests.

const JOIN_EARLY_MS = 5 * 60 * 1000;     // 5 min early grace
const JOIN_LATE_MS  = 15 * 60 * 1000;    // can still join up to 15 min after end

function parseMysql(dt) {
  if (!dt) return NaN;
  return new Date(String(dt).replace(' ', 'T')).getTime();
}

function joinWindow(start, end) {
  const s = parseMysql(start);
  const e = parseMysql(end);
  return { open: s - JOIN_EARLY_MS, close: e + JOIN_LATE_MS };
}

function isJoinable(start, end, now = Date.now()) {
  const { open, close } = joinWindow(start, end);
  return now >= open && now <= close;
}

function joinState(start, end, now = Date.now()) {
  const sMs = parseMysql(start);
  const eMs = parseMysql(end);
  const { open, close } = joinWindow(start, end);
  if (now < open)  return { state: 'pending',  ms_until_open: open - now,  starts_in_min: Math.ceil((sMs - now) / 60000) };
  if (now > close) return { state: 'ended',    ms_since_close: now - close };
  return { state: 'live', ms_until_close: close - now };
}

module.exports = { isJoinable, joinState, JOIN_EARLY_MS, JOIN_LATE_MS };
