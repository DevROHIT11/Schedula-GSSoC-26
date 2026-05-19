import { useEffect, useState } from 'react';
import { Video, X, Clock } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import JoinMeetingButton from './JoinMeetingButton.jsx';

// Live banner that surfaces virtual bookings starting within ±15 min of now.
// Polls /bookings/mine every 60s while the user is signed in.
export default function UpcomingMeetingBanner() {
  const { user } = useAuth();
  const [active, setActive] = useState(null);    // booking row, or null
  const [tick, setTick] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('schedula:dismissed_meetings') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    if (!user) { setActive(null); return; }
    let cancelled = false;
    const fetchNext = () => {
      api.get('/bookings/mine')
        .then((d) => {
          if (cancelled) return;
          const now = Date.now();
          const upcoming = (d.bookings || [])
            .filter((b) => b.appointment_type === 'virtual' && b.status !== 'cancelled')
            .map((b) => ({ ...b, _start: new Date(b.start_datetime.replace(' ', 'T')).getTime() }))
            .filter((b) => b._start >= now - 15 * 60 * 1000 && b._start <= now + 30 * 60 * 1000)
            .sort((a, b) => a._start - b._start);
          setActive(upcoming[0] || null);
        })
        .catch(() => {});
    };
    fetchNext();
    const poll = setInterval(fetchNext, 60 * 1000);
    const ticker = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(ticker); };
  }, [user]);

  if (!active || dismissed.includes(active.id)) return null;

  const minsTo = Math.round((active._start - Date.now()) / 60000);
  const isLive = minsTo <= 0;
  const label = isLive
    ? `Live now — your meeting started ${Math.abs(minsTo)} min ago`
    : `Starting in ${minsTo} min`;

  const dismiss = () => {
    const next = [...dismissed, active.id];
    setDismissed(next);
    sessionStorage.setItem('schedula:dismissed_meetings', JSON.stringify(next));
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${isLive ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50' : 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50'} shadow-soft animate-slide-up mb-4`}>
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isLive ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} ${isLive ? 'animate-pulse-soft' : ''}`}>
          <Video size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-900 truncate">{active.service_name}</div>
          <div className={`text-xs ${isLive ? 'text-emerald-700' : 'text-amber-700'} font-medium flex items-center gap-1`}>
            <Clock size={11} /> {label} <span className="text-ink-400">· {active.start_datetime.replace(' ', ' at ').slice(5)}</span>
          </div>
        </div>
        <JoinMeetingButton booking={active} size="sm" />
        <button onClick={dismiss} className="p-1 rounded-md hover:bg-ink-100 text-ink-500" title="Dismiss">
          <X size={14} />
        </button>
      </div>
      <span className="hidden">{tick}</span>
    </div>
  );
}
