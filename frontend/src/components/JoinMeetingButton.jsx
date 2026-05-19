import { useEffect, useState } from 'react';
import { Video, Lock, Clock, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from './Toast.jsx';
import { meetingJoinState, humanCountdown } from '../utils/format';

// Customer-facing gated Join button. Calls /bookings/:id/join-link which
// only returns the URL inside the live window. Outside the window, shows a
// live countdown chip — no redirect happens.
export default function JoinMeetingButton({ booking, className = '', size = 'md' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // Live tick so the countdown updates without a full re-render of the parent.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // Server may already have given us a state (preferred) — otherwise compute.
  const state = booking?.meeting_state || meetingJoinState(booking?.start_datetime, booking?.end_datetime);

  const padding = size === 'sm' ? '!py-1.5 !px-3 text-xs' : 'text-sm';

  const join = async () => {
    setBusy(true);
    try {
      const d = await api.get(`/bookings/${booking.id}/join-link`);
      if (d.meeting_link) window.open(d.meeting_link, '_blank', 'noopener');
      else toast.push({ kind: 'error', text: d.message || 'Meeting not yet available' });
    } catch (e) {
      // 403 with state info — surface a friendly toast
      const ms = e.data?.message;
      if (ms) toast.push({ kind: 'warn', text: ms });
      else toast.push({ kind: 'error', text: e.message });
    } finally { setBusy(false); }
  };

  if (state.state === 'live') {
    return (
      <button onClick={join} disabled={busy} title="Open meeting room"
        className={`btn-primary ${padding} animate-pulse-soft ${className}`}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
        Join meeting
      </button>
    );
  }
  if (state.state === 'pending') {
    return (
      <span className={`pill-amber ${padding} ${className}`} title="Opens 5 min before start">
        <Lock size={12} /> Join opens {humanCountdown(state.minsToOpen)}
      </span>
    );
  }
  if (state.state === 'ended') {
    return (
      <span className={`pill-slate ${padding} ${className}`} title="Window closed">
        <Clock size={12} /> Meeting ended
      </span>
    );
  }
  return null;
}
