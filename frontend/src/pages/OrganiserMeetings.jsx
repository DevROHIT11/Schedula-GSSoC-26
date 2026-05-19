import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video, ExternalLink, Send, Pencil, Copy, Check, Clock,
  Calendar as CalIcon, User, Mail, Phone, RefreshCw, Loader2, Search,
} from 'lucide-react';
import { api } from '../api/client';
import { formatDateTime, formatTime, isHttpUrl } from '../utils/format';
import { useToast } from '../components/Toast.jsx';

// Calendly-style list of upcoming virtual meetings the organiser owns.
// Each row exposes: send-invite, copy-link, override-link, join.
export default function OrganiserMeetings() {
  const toast = useToast();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('upcoming');   // upcoming | past | all
  const [q, setQ]             = useState('');
  const [editing, setEditing] = useState(null);         // { id, value }
  const [copiedId, setCopiedId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/bookings/organiser/meetings')
      .then((d) => setMeetings(d.meetings || []))
      .catch((e) => toast.push({ kind: 'error', text: e.message }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const now = Date.now();
  const items = useMemo(() => {
    return meetings
      .map((m) => ({ ...m, _start: new Date(m.start_datetime.replace(' ', 'T')).getTime() }))
      .filter((m) => {
        if (filter === 'upcoming' && m._start < now - 60 * 1000) return false;
        if (filter === 'past'     && m._start >= now) return false;
        if (q && !`${m.service_name} ${m.customer_name} ${m.customer_email}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
  }, [meetings, filter, q, now]);

  const counts = useMemo(() => ({
    upcoming: meetings.filter((m) => new Date(m.start_datetime.replace(' ', 'T')).getTime() >= now - 60 * 1000).length,
    past:     meetings.filter((m) => new Date(m.start_datetime.replace(' ', 'T')).getTime() <  now).length,
    all:      meetings.length,
  }), [meetings, now]);

  const sendInvite = async (id) => {
    try {
      await api.post(`/bookings/${id}/send-invite`);
      toast.push({ kind: 'success', title: 'Invite sent', text: 'Customer received the meeting link via email + in-app.' });
    } catch (e) { toast.push({ kind: 'error', text: e.message }); }
  };

  const copyLink = async (m) => {
    try { await navigator.clipboard.writeText(m.meeting_link || ''); setCopiedId(m.id); setTimeout(() => setCopiedId(null), 1500); }
    catch { toast.push({ kind: 'error', text: 'Could not copy' }); }
  };

  const saveLink = async () => {
    if (!editing) return;
    if (!isHttpUrl(editing.value)) {
      toast.push({ kind: 'error', text: 'Enter a valid http(s) URL' }); return;
    }
    try {
      await api.put(`/bookings/${editing.id}/meeting-link`, { meeting_link: editing.value });
      toast.push({ kind: 'success', text: 'Meeting link updated' });
      setEditing(null);
      load();
    } catch (e) { toast.push({ kind: 'error', text: e.message }); }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <Video size={20} className="text-brand-600" /> Meetings
          </h1>
          <p className="text-sm text-ink-500">Virtual bookings where you're the host. Send the join link or override with your own room URL.</p>
        </div>
        <button onClick={load} className="btn-outline"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="flex bg-ink-100 rounded-lg p-0.5 text-sm">
          {[
            { k: 'upcoming', label: `Upcoming (${counts.upcoming})` },
            { k: 'past',     label: `Past (${counts.past})` },
            { k: 'all',      label: `All (${counts.all})` },
          ].map((t) => (
            <button key={t.k} onClick={() => setFilter(t.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === t.k ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input !pl-9" placeholder="Search by service, customer, email…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-28 shimmer-bg" />)}
        </div>
      )}

      {!loading && !items.length && (
        <div className="card p-12 text-center">
          <Video size={36} className="mx-auto text-ink-300" />
          <h3 className="font-semibold text-ink-900 mt-3">No {filter === 'all' ? '' : filter} virtual meetings</h3>
          <p className="text-sm text-ink-500 mt-1">When customers book a virtual service of yours, the meeting will show up here.</p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((m) => {
          const startMs = m._start;
          const minsTo  = Math.round((startMs - now) / 60000);
          const inWindow = minsTo >= -10 && minsTo <= 15;     // -10..+15 minutes
          const isPast = startMs < now - 10 * 60 * 1000;
          const status = isPast ? 'past' : inWindow ? 'live' : minsTo > 0 ? 'upcoming' : 'late';

          return (
            <li key={m.id} className={`card overflow-hidden border-l-4 transition ${
              status === 'live'     ? 'border-l-emerald-500' :
              status === 'upcoming' ? 'border-l-brand-500' :
              status === 'past'     ? 'border-l-ink-200' : 'border-l-amber-500'}`}>
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-ink-900 text-base sm:text-lg">{m.service_name}</h3>
                      <span className="pill-slate">{m.duration_minutes} min</span>
                      {status === 'live' && (
                        <span className="pill-green animate-pulse-soft">● Live now</span>
                      )}
                      {status === 'upcoming' && minsTo <= 60 && (
                        <span className="pill-amber">Starts in {minsTo} min</span>
                      )}
                      {status === 'past' && <span className="pill-slate">Past</span>}
                    </div>
                    <div className="text-sm text-ink-500 mt-1 flex items-center gap-1.5">
                      <CalIcon size={13} /> {formatDateTime(m.start_datetime)} · {formatTime(m.end_datetime)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {m.meeting_link && (
                      <a href={m.meeting_link} target="_blank" rel="noreferrer"
                         className={`btn-primary !py-1.5 !px-3 text-xs ${status === 'live' ? 'animate-pulse-soft' : ''}`}>
                        <ExternalLink size={12} /> Join
                      </a>
                    )}
                    <button onClick={() => copyLink(m)} className="btn-outline !py-1.5 !px-3 text-xs" disabled={!m.meeting_link}>
                      {copiedId === m.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copiedId === m.id ? 'Copied' : 'Copy link'}
                    </button>
                    <button onClick={() => sendInvite(m.id)} className="btn-soft !py-1.5 !px-3 text-xs">
                      <Send size={12} /> Send invite
                    </button>
                    <button onClick={() => setEditing({ id: m.id, value: m.meeting_link || '' })}
                            className="btn-ghost !py-1.5 !px-3 text-xs">
                      <Pencil size={12} /> Edit link
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-ink-200">
                  <div className="text-sm">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-ink-400 mb-0.5">Invitee</div>
                    <div className="flex items-center gap-2 text-ink-900 font-medium"><User size={13} className="text-ink-500" /> {m.customer_name}</div>
                    <div className="flex items-center gap-2 text-ink-500 text-xs mt-0.5"><Mail size={11} /> {m.customer_email}</div>
                    {m.customer_phone && (
                      <div className="flex items-center gap-2 text-ink-500 text-xs"><Phone size={11} /> {m.customer_phone}</div>
                    )}
                  </div>
                  <div className="text-sm">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-ink-400 mb-0.5">Meeting link</div>
                    {editing && editing.id === m.id ? (
                      <div className="flex gap-2">
                        <input className="input !py-1.5 text-xs flex-1"
                               placeholder="https://zoom.us/j/… or https://meet.google.com/…"
                               value={editing.value}
                               onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
                        <button onClick={saveLink} className="btn-primary !py-1.5 !px-3 text-xs">Save</button>
                        <button onClick={() => setEditing(null)} className="btn-ghost !py-1.5 !px-3 text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div className="font-mono text-xs text-ink-700 truncate">{m.meeting_link || <span className="text-ink-400 italic">— not configured —</span>}</div>
                    )}
                    <div className="text-[11px] text-ink-500 mt-1">
                      Provider: <span className="capitalize">{(m.virtual_provider || 'jitsi').replace('_', ' ')}</span> · Booking #{m.id} · <Link to={`/booking/${m.id}`} className="text-brand-600 hover:underline">View</Link>
                    </div>
                  </div>
                </div>

                {status === 'live' && (
                  <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
                    <Clock size={12} /> Meeting is happening now — tap <b>Join</b> to enter the room.
                    {m.customer_name} is expected.
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
