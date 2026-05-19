import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Clock, MapPin, User, Phone, ShieldCheck, Mail, Loader2,
  Video, X, RefreshCw, CreditCard, Star, MessageSquare, Camera, Upload, Trash2,
} from 'lucide-react';
import { downloadICalFile, getGoogleCalendarLink } from '../utils/calendarExport';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client';
import { imageFor } from '../utils/serviceVisuals';
import { formatDateTime } from '../utils/format';
import { filterPhone, filterAlpha } from '../utils/validators';
import JoinMeetingButton from '../components/JoinMeetingButton.jsx';

const fmtDt = formatDateTime;

const STATUS_PILL = {
  confirmed:    'pill-green',
  reserved:     'pill-amber',
  pending:      'pill-amber',
  cancelled:    'pill-rose',
  completed:    'pill-slate',
  rescheduled:  'pill-brand',
};

function ApptCard({ b, onCancel }) {
  return (
    <div className="card overflow-hidden flex flex-col sm:flex-row gap-3 hover:shadow-card hover:border-ink-300 transition">
      <div className="sm:w-44 aspect-[16/9] sm:aspect-auto bg-cover bg-center bg-ink-100"
           style={{ backgroundImage: `url(${imageFor({ name: b.service_name })})` }} />
      <div className="flex-1 p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-semibold text-ink-900 tracking-crisp">{b.service_name}</h3>
          <span className={STATUS_PILL[b.status] || 'pill-slate'}>{b.status}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
          <span className="flex items-center gap-1"><CalendarDays size={12} /> {fmtDt(b.start_datetime)}</span>
          <span className="flex items-center gap-1"><User size={12} /> {b.resource_name}</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {b.duration_minutes} min</span>
          {b.appointment_type === 'virtual' && <span className="flex items-center gap-1 text-brand-600"><Video size={12} /> Virtual</span>}
          {b.venue && b.appointment_type !== 'virtual' && <span className="flex items-center gap-1"><MapPin size={12} /> {b.venue}</span>}
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {b.payment_status !== 'not_required' && <span className="pill-slate">payment: {b.payment_status}</span>}
          {b.appointment_type === 'virtual' && b.status !== 'cancelled' && (
            <JoinMeetingButton booking={b} size="sm" />
          )}
        </div>
          <div className="flex flex-wrap gap-2 mt-2">
          {b.payment_status === 'pending' && b.status !== 'cancelled' && (
            <Link to={`/booking/${b.id}/pay`} className="btn-primary !py-1.5 !px-3 text-xs"><CreditCard size={12} /> Pay now</Link>
          )}
          <Link to={`/booking/${b.id}`} className="btn-outline !py-1.5 !px-3 text-xs">View</Link>
          <button onClick={() => downloadICalFile(b)} className="btn-ghost !py-1.5 !px-3 text-xs"><CalendarDays size={12} /> Download</button>
          <a href={getGoogleCalendarLink(b)} target="_blank" rel="noreferrer" className="btn-outline !py-1.5 !px-3 text-xs">Add to Google</a>
          {b.status !== 'cancelled' && (
            <Link to={`/booking/${b.id}/reschedule`} className="btn-ghost !py-1.5 !px-3 text-xs"><RefreshCw size={12} /> Reschedule</Link>
          )}
          {b.status !== 'cancelled' && (
            <button onClick={() => onCancel(b.id)} className="btn-ghost !py-1.5 !px-3 text-xs text-rose-600 hover:bg-rose-50"><X size={12} /> Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stars({ value, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= value ? 'text-amber-500 fill-amber-500' : 'text-ink-200 fill-ink-100'} />
      ))}
    </span>
  );
}

function FeedbackCard({ r }) {
  return (
    <div className="card p-4 hover:border-ink-300 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to={`/services/${r.service_id}`} className="font-display font-semibold text-ink-900 tracking-crisp hover:underline truncate block">
            {r.service_name}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <Stars value={r.rating} />
            <span className="text-xs text-ink-500">· {fmtDt(r.created_at)}</span>
          </div>
        </div>
      </div>
      {r.comment && <p className="text-sm text-ink-700 mt-3 leading-relaxed">{r.comment}</p>}
      {r.booking_id && (
        <Link to={`/booking/${r.booking_id}`} className="text-xs text-brand-600 hover:underline mt-3 inline-block">
          View booking →
        </Link>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, refresh } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [credits, setCredits] = useState(0);
  const [subscription, setSubscription] = useState(null);

  // Avatar upload state
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');

  // Feedback state
  const [reviews, setReviews] = useState([]);
  const [reviewsSort, setReviewsSort] = useState('latest'); // 'latest' | 'highest'
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const reload = () => api.get('/bookings/mine').then((d) => setBookings(d.bookings)).catch((e) => setError(e.message));

  const loadReviews = async (sort = reviewsSort) => {
    setReviewsLoading(true);
    try {
      const d = await api.get(`/services/reviews/mine?sort=${encodeURIComponent(sort)}`);
      setReviews(d.reviews || []);
    } catch { /* silent */ }
    finally { setReviewsLoading(false); }
  };

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name, phone: user.phone || '' });
    reload();
    loadReviews('latest');
    api.get('/credits/me').then((d) => setCredits(d.balance || 0)).catch(() => {});
    api.get('/subscriptions/mine').then((d) => setSubscription(d.subscription)).catch(() => {});
    // Re-fetch reviews when the tab regains focus so feedback newly submitted
    // elsewhere shows up without a manual refresh.
    const onFocus = () => loadReviews();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { loadReviews(reviewsSort); /* eslint-disable-next-line */ }, [reviewsSort]);

  const save = async (e) => {
    e.preventDefault(); setInfo(''); setError('');
    if (form.phone) {
      const digits = form.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        setError('Mobile number must be 10–15 digits.'); return;
      }
    }
    setBusy(true);
    try { await api.put('/auth/me', form); await refresh(); setInfo('Profile updated.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { setAvatarErr('Please pick an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { setAvatarErr('Image must be under 4 MB.'); return; }
    setAvatarBusy(true); setAvatarErr(''); setError('');
    try {
      const up = await api.upload('/uploads', file);
      await api.put('/auth/me', { avatar_url: up.url });
      await refresh();
      setInfo('Profile photo updated.');
    } catch (err) {
      setAvatarErr(err.message || 'Upload failed');
    } finally {
      setAvatarBusy(false);
      e.target.value = '';
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true); setAvatarErr(''); setError('');
    try {
      await api.put('/auth/me', { avatar_url: '' });
      await refresh();
      setInfo('Profile photo removed.');
    } catch (err) {
      setAvatarErr(err.message || 'Could not remove photo');
    } finally {
      setAvatarBusy(false);
    }
  };

  const sendPhoneOtp = async () => {
    setError(''); setInfo('');
    try { await api.post('/auth/phone/send-otp', { phone: form.phone }); setPhoneOtpSent(true); setInfo('OTP sent to your phone (check server log for demo).'); }
    catch (e) { setError(e.message); }
  };

  const verifyPhoneOtp = async () => {
    setError(''); setInfo('');
    try { await api.post('/auth/phone/verify-otp', { otp: phoneOtp }); await refresh(); setInfo('Phone verified.'); setPhoneOtpSent(false); setPhoneOtp(''); }
    catch (e) { setError(e.message); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try { await api.post(`/bookings/${id}/cancel`); reload(); }
    catch (e) { setError(e.message); }
  };

  const now = Date.now();
  const upcoming = useMemo(() => bookings.filter((b) => new Date(b.start_datetime.replace(' ', 'T')).getTime() >= now && b.status !== 'cancelled'), [bookings]);
  const past = useMemo(() => bookings.filter((b) => new Date(b.start_datetime.replace(' ', 'T')).getTime() < now || b.status === 'cancelled'), [bookings]);
  const initials = (user?.full_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const avatar = user?.avatar_url || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="eyebrow">Profile</span>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 mt-2 tracking-tightest">My appointments</h1>
            <p className="text-sm text-ink-500 mt-1.5">Upcoming and past bookings, plus the feedback you've shared.</p>
          </div>
        </div>
        {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}

        <section>
          <h3 className="text-[11px] font-semibold text-ink-500 uppercase tracking-[0.14em] mb-4">Upcoming</h3>
          {upcoming.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-ink-100 mx-auto flex items-center justify-center text-2xl">📭</div>
              <p className="text-ink-500 mb-3 mt-3">You have no upcoming appointments.</p>
              <Link to="/" className="btn-primary inline-flex">Browse services</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => <ApptCard key={b.id} b={b} onCancel={cancel} />)}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-[11px] font-semibold text-ink-500 uppercase tracking-[0.14em] mb-4">Past & cancelled</h3>
          {past.length === 0 ? (
            <p className="text-ink-500 text-sm">No history yet.</p>
          ) : (
            <div className="space-y-3">
              {past.slice(0, 10).map((b) => <ApptCard key={b.id} b={b} onCancel={cancel} />)}
            </div>
          )}
        </section>

        {/* My feedback — visible immediately after submitting a review elsewhere */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-[11px] font-semibold text-ink-500 uppercase tracking-[0.14em] flex items-center gap-1.5">
                <MessageSquare size={11} /> My feedback {reviews.length > 0 && <span className="text-ink-700 normal-case tracking-normal text-xs">· {reviews.length}</span>}
              </h3>
            </div>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-500">Sort by</span>
                <select
                  value={reviewsSort}
                  onChange={(e) => setReviewsSort(e.target.value)}
                  className="input !w-auto !py-1.5 !text-xs">
                  <option value="latest">Latest</option>
                  <option value="highest">Highest rated</option>
                </select>
                <button onClick={() => loadReviews()} className="btn-ghost !p-2" title="Refresh">
                  <RefreshCw size={14} className={reviewsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
          </div>

          {reviewsLoading && reviews.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="card p-4 space-y-2">
                  <div className="h-4 shimmer-bg w-2/3" />
                  <div className="h-3 shimmer-bg w-1/3" />
                  <div className="h-3 shimmer-bg w-full" />
                </div>
              ))}
            </div>
          )}

          {!reviewsLoading && reviews.length === 0 && (
            <div className="card p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-ink-100 mx-auto flex items-center justify-center text-ink-400">
                <MessageSquare size={20} />
              </div>
              <p className="text-sm text-ink-500 mt-3 max-w-md mx-auto">You haven't submitted any feedback yet. After your appointment, share a rating from the booking detail page.</p>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviews.map((r) => <FeedbackCard key={r.id} r={r} />)}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <div className="card p-6">
          {/* ── Avatar ────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-ink-200">
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-ink-900 text-white font-display text-lg font-bold flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              {/* Click-to-replace overlay */}
              <label className={`absolute inset-0 rounded-2xl flex items-center justify-center bg-ink-900/60 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition cursor-pointer ${avatarBusy ? 'opacity-100' : ''}`}>
                {avatarBusy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} disabled={avatarBusy} />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold truncate tracking-crisp">{user?.full_name}</div>
              <div className="text-xs text-ink-500 truncate mt-0.5">{user?.email}</div>
              <div className="flex items-center gap-2 mt-2">
                <label className="btn-ghost !py-1 !px-2 text-[11px] cursor-pointer">
                  <Upload size={11} /> {avatar ? 'Replace' : 'Upload photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} disabled={avatarBusy} />
                </label>
                {avatar && (
                  <button onClick={removeAvatar} disabled={avatarBusy} className="btn-ghost !py-1 !px-2 text-[11px] text-rose-600 hover:bg-rose-50">
                    <Trash2 size={11} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          {avatarErr && <div className="text-xs text-rose-600 mb-3">{avatarErr}</div>}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="pill-slate capitalize">{user?.role}</span>
            {user?.is_verified && <span className="pill-green"><ShieldCheck size={10} /> Email verified</span>}
            {user?.is_phone_verified && <span className="pill-green"><ShieldCheck size={10} /> Phone verified</span>}
            {subscription && <span className="pill-brand">{subscription.name} plan</span>}
          </div>
          {info && <div className="text-sm text-sage-700 bg-sage-50 border border-sage-200 rounded-xl p-3 mb-3">{info}</div>}

          <form className="space-y-3" onSubmit={save}>
            <div><label className="label flex items-center gap-1"><User size={12} /> Full name</label>
              <input className="input" value={form.full_name}
                     onChange={(e) => setForm({ ...form, full_name: filterAlpha(e.target.value) })} /></div>
            <div><label className="label flex items-center gap-1"><Phone size={12} /> Mobile number</label>
              <input type="tel" inputMode="numeric" className="input" value={form.phone}
                     onChange={(e) => setForm({ ...form, phone: filterPhone(e.target.value) })}
                     placeholder="9876543210" /></div>
            <div><label className="label flex items-center gap-1"><Mail size={12} /> Email</label>
              <input className="input bg-ink-50" value={user?.email || ''} disabled /></div>
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}{busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          {!user?.is_phone_verified && (
            <div className="mt-4 pt-4 border-t border-ink-200">
              <div className="text-xs text-ink-500 mb-2">Verify your phone to receive SMS reminders.</div>
              {!phoneOtpSent ? (
                <button onClick={sendPhoneOtp} className="btn-outline w-full">Send phone OTP</button>
              ) : (
                <div className="flex gap-2">
                  <input className="input text-center tracking-widest" placeholder="OTP"
                    value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} />
                  <button onClick={verifyPhoneOtp} className="btn-primary">Verify</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-400">Schedula credits</div>
          <div className="font-display text-4xl font-bold text-ink-900 mt-2 tracking-tightest">{credits.toLocaleString()}</div>
          <div className="text-xs text-ink-500 mt-1.5">1 credit = ₹1 off your next booking</div>
          <Link to="/credits" className="btn-outline w-full mt-5">Manage credits</Link>
        </div>
      </aside>
    </div>
  );
}
