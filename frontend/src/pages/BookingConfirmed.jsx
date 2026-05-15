import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, Video, MapPin, RefreshCw, X, Star, Share2, CreditCard, Check, Clock as ClockIcon, CalendarDays as CalendarIcon } from 'lucide-react';
import { api } from '../api/client';
import { imageFor } from '../utils/serviceVisuals';
import { formatDateTime } from '../utils/format';
import { downloadICalFile, getGoogleCalendarLink } from '../utils/calendarExport';
import JoinMeetingButton from '../components/JoinMeetingButton.jsx';

const fmtDate = formatDateTime;

const googleCalendarUrl = (b) => {
  const fmt = (mysqlDt) => {
    const d = new Date(mysqlDt.replace(' ', 'T'));
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${b.service_name} appointment`,
    dates: `${fmt(b.start_datetime)}/${fmt(b.end_datetime)}`,
    details: `Provider: ${b.resource_name}\nStatus: ${b.status}\n${b.meeting_link ? `Meeting: ${b.meeting_link}` : ''}`,
    location: b.appointment_type === 'virtual' ? (b.meeting_link || 'Virtual meeting') : (b.venue || ''),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const STATUS_LABEL = {
  confirmed: 'Appointment confirmed',
  reserved: 'Appointment reserved',
  pending: 'Awaiting payment',
  cancelled: 'Appointment cancelled',
  completed: 'Appointment completed',
};
const STATUS_PILL = {
  confirmed: 'pill-green', reserved: 'pill-amber', pending: 'pill-amber',
  cancelled: 'pill-rose', completed: 'pill-slate',
};

export default function BookingConfirmed() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const load = () => api.get(`/bookings/${id}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const cancel = async () => {
    if (!confirm('Cancel this appointment?')) return;
    setBusy(true);
    try { await api.post(`/bookings/${id}/cancel`); load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const [shareMsg, setShareMsg] = useState('');
  const share = async () => {
    const b = data?.booking;
    if (!b) return;
    // Share the public service link, not the private booking detail.
    const link = `${window.location.origin}/services/${b.service_id}`;
    const text = `I booked ${b.service_name} on ${fmtDate(b.start_datetime)}.\n${link}`;
    try {
      if (navigator.share) await navigator.share({ url: link, title: 'My appointment', text });
      else {
        await navigator.clipboard.writeText(text);
        setShareMsg('Link copied to clipboard');
        setTimeout(() => setShareMsg(''), 2500);
      }
    } catch { /* user cancelled */ }
  };

  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const submitReview = async () => {
    setError('');
    try {
      await api.post(`/services/${data.booking.service_id}/review`,
        { rating, comment, booking_id: data.booking.id });
      setReviewing(false);
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 6000);
    } catch (e) { setError(e.message); }
  };

  if (error) return <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3">{error}</div>;
  if (!data) return <div className="p-12 text-center text-ink-500">Loading…</div>;
  const b = data.booking;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => nav(-1)} className="btn-ghost mb-4"><ChevronLeft size={16} /> Back</button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">{STATUS_LABEL[b.status] || 'Appointment'}</h1>
              <p className="text-sm text-ink-500 mt-1">Booking #{b.id} · {b.service_name}</p>
            </div>
            <span className={`${STATUS_PILL[b.status] || 'pill-slate'} text-sm !px-3 !py-1 capitalize font-semibold`}>{b.status}</span>
          </div>

          {/* Status timeline — Booked → Paid → Confirmed → Completed */}
          <Timeline booking={b} />


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Row label="Time" value={fmtDate(b.start_datetime)} />
            <Row label="Duration" value={`${b.duration_minutes} min`} />
            <Row label="Provider" value={b.resource_name} />
            <Row label="Service" value={b.service_name} />
            {b.appointment_type === 'virtual'
              ? <Row label="Mode" value={<span className="inline-flex items-center gap-1"><Video size={14} className="text-brand-600" /> Virtual</span>} />
              : <Row label="Venue" value={<span className="inline-flex items-center gap-1"><MapPin size={14} /> {b.venue || '—'}</span>} />}
            {b.capacity_taken > 1 && <Row label="People" value={b.capacity_taken} />}
            <Row label="Payment" value={b.payment_status} />
            {b.discount_code && <Row label="Discount" value={b.discount_code} />}
          </div>

          {b.appointment_type === 'virtual' && b.status !== 'cancelled' && (
            <div className="mt-5">
              <JoinMeetingButton booking={b} />
              {b.meeting_state?.state === 'pending' && (
                <p className="text-xs text-ink-500 mt-2">
                  Your meeting room opens 5 minutes before the scheduled start.
                  You'll get an email + in-app alert the moment it's ready.
                </p>
              )}
            </div>
          )}

          {data.answers.length > 0 && (
            <div className="mt-6 pt-5 border-t border-ink-200">
              <h3 className="text-sm font-bold text-ink-700 uppercase tracking-wide mb-3">Submitted answers</h3>
              <div className="space-y-2 text-sm">
                {data.answers.map((a, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <span className="text-ink-500">{a.question}</span>
                    <span className="font-medium text-ink-900 text-right">{a.answer_text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-ink-200 flex flex-wrap gap-2">
            {b.payment_status === 'pending' && b.status !== 'cancelled' && (
              <Link to={`/booking/${b.id}/pay`} className="btn-primary"><CreditCard size={14} /> Pay now (₹{Number(b.total_amount).toFixed(2)})</Link>
            )}
            {b.status !== 'cancelled' && (
              <>
                <Link to={`/booking/${b.id}/reschedule`} className="btn-outline"><RefreshCw size={14} /> Reschedule</Link>
                <button className="btn-ghost text-rose-600 hover:bg-rose-50" disabled={busy} onClick={cancel}><X size={14} /> Cancel</button>
              </>
            )}
            <button onClick={share} className="btn-ghost"><Share2 size={14} /> Share</button>
            {shareMsg && <span className="text-xs text-emerald-700 self-center">{shareMsg}</span>}
            {b.status === 'completed' && !reviewing && (
              <button onClick={() => setReviewing(true)} className="btn-soft"><Star size={14} /> Leave review</button>
            )}
            <Link to="/profile" className="btn-ghost ml-auto">My bookings →</Link>
          </div>

          {reviewing && (
            <div className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5 mt-4">
              <div className="font-display font-semibold text-ink-900 mb-1 tracking-crisp">Rate your experience</div>
              <p className="text-xs text-ink-500 mb-3">Your feedback helps other customers and is visible to the provider and admin.</p>
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="hover:scale-110 transition">
                    <Star size={26} className={n <= rating ? 'text-amber-500 fill-amber-500' : 'text-ink-300'} />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium text-ink-600 self-center">{rating}/5</span>
              </div>
              <textarea className="input min-h-[88px]" placeholder="Tell us about it…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="flex gap-2 mt-3">
                <button className="btn-primary" onClick={submitReview}>Submit review</button>
                <button className="btn-ghost" onClick={() => setReviewing(false)}>Cancel</button>
              </div>
            </div>
          )}
          {reviewSubmitted && (
            <div className="rounded-2xl border border-sage-200 bg-sage-50 text-sage-800 p-4 mt-4 text-sm flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><Star size={14} className="text-sage-700 fill-sage-700" /> Thanks — your feedback is now visible in your profile.</span>
              <Link to="/profile" className="font-semibold hover:underline whitespace-nowrap">View my feedback →</Link>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="card overflow-hidden">
            <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url(${imageFor({ name: b.service_name })})` }} />
            <div className="p-4">
              <h3 className="font-bold">Save the date</h3>
              <button onClick={() => downloadICalFile(b)} className="btn-outline w-full mt-3">
                <CalendarIcon size={14} /> Download calendar
              </button>
              <a href={getGoogleCalendarLink(b)} target="_blank" rel="noreferrer" className="btn-ghost w-full mt-3">
                <CalendarPlus size={14} /> Add to Google Calendar
              </a>
              <p className="text-xs text-ink-500 mt-3 leading-relaxed">A confirmation email was sent to your registered address. You can reschedule any time before the appointment starts.</p>
            </div>
          </div>

          {data.payments && data.payments.length > 0 && (
            <div className="card p-4">
              <h3 className="font-bold mb-3 text-sm">Payments</h3>
              <div className="space-y-2 text-sm">
                {data.payments.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span className="text-ink-500 capitalize">{p.method}</span>
                    <span className="font-semibold">₹{Number(p.amount).toFixed(2)} · {p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900 text-right">{value}</span>
    </div>
  );
}

function Timeline({ booking: b }) {
  const cancelled = b.status === 'cancelled';
  const paid = b.payment_status === 'paid';
  const needsPay = b.payment_status === 'pending';
  const confirmed = b.status === 'confirmed' || b.status === 'completed';
  const completed = b.status === 'completed';

  const steps = [
    { key: 'booked',  label: 'Booked',     done: true,                                  active: false },
    { key: 'paid',    label: needsPay ? 'Awaiting payment' : 'Paid', done: paid || b.payment_status === 'not_required', active: needsPay && !cancelled },
    { key: 'confirmed', label: 'Confirmed', done: confirmed,                              active: !confirmed && !cancelled && !needsPay },
    { key: 'completed', label: 'Completed', done: completed,                              active: false },
  ];

  return (
    <ol className="my-5 grid grid-cols-4 gap-2">
      {steps.map((s, i) => {
        const reached = s.done;
        const isActive = s.active;
        return (
          <li key={s.key} className="flex flex-col items-center text-center">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-0.5 ${i === 0 ? 'invisible' : reached ? 'bg-emerald-400' : 'bg-ink-200'}`} />
              <div className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold border-2 transition
                ${cancelled ? 'border-rose-300 bg-rose-50 text-rose-600' :
                  reached ? 'border-emerald-500 bg-emerald-500 text-white' :
                  isActive ? 'border-brand-500 bg-brand-50 text-brand-700 animate-pulse-soft' :
                  'border-ink-200 bg-white text-ink-400'}`}>
                {reached && !cancelled ? <Check size={14} /> : i + 1}
              </div>
              <div className={`flex-1 h-0.5 ${i === steps.length - 1 ? 'invisible' : reached ? 'bg-emerald-400' : 'bg-ink-200'}`} />
            </div>
            <div className={`mt-1 text-[11px] font-medium ${reached ? 'text-ink-800' : isActive ? 'text-brand-700' : 'text-ink-400'}`}>
              {cancelled && i > 0 ? '—' : s.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
