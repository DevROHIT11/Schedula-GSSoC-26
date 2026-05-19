import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, MapPin, Star, User, Video, Tag, Share2, ArrowRight, Calendar } from 'lucide-react';
import { api } from '../api/client';
import { imageFor } from '../utils/serviceVisuals';

export default function ServiceDetail({ share }) {
  const { id, token } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = share ? `/services/share/${token}` : `/services/${id}`;
    api.get(url)
      .then((d) => share ? setData({ service: d.service }) : setData(d))
      .catch((e) => setError(e.message));
  }, [id, token, share]);

  const shareLink = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: data?.service?.name });
      else { await navigator.clipboard.writeText(url); alert('Link copied to clipboard'); }
    } catch { /* empty */ }
  };

  if (error) return <div className="card border-rose-200 bg-rose-50 text-rose-700 p-4">{error}</div>;
  if (!data) return <div className="p-12 text-center text-ink-500">Loading…</div>;
  const s = data.service;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => nav(-1)} className="btn-ghost mb-5"><ChevronLeft size={16} /> Back</button>
      <div className="card overflow-hidden">
        <div className="relative aspect-[21/9] bg-cover bg-center bg-ink-100" style={{ backgroundImage: `url(${imageFor(s)})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex flex-wrap gap-2 mb-4">
              {s.category_name && <span className="pill bg-white/95 text-ink-800 backdrop-blur">{s.category_name}</span>}
              {s.appointment_type === 'virtual' && <span className="pill bg-ink-900 text-white"><Video size={11} /> Virtual</span>}
              {Number(s.price) > 0 ? <span className="pill bg-accent-500 text-white"><Tag size={11} /> ₹{Number(s.price).toFixed(0)}</span> : <span className="pill bg-sage-500 text-white">Free</span>}
              {Number(s.rating) > 0 && <span className="pill bg-white/95 text-ink-800"><Star size={11} fill="currentColor" /> {Number(s.rating).toFixed(1)} ({s.rating_count})</span>}
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tightest leading-[1.05] max-w-2xl">{s.name}</h1>
          </div>
        </div>

        <div className="p-7 sm:p-9 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
          <div>
            <span className="eyebrow">About this service</span>
            <p className="text-ink-700 leading-relaxed mt-3 text-[15px]">{s.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <Info icon={Clock} label="Duration" value={`${s.duration_minutes} min`} />
              <Info icon={User} label="Organiser" value={s.organiser_name} />
              {s.appointment_type === 'virtual'
                ? <Info icon={Video} label="Mode" value="Virtual" />
                : <Info icon={MapPin} label="City" value={s.city || '—'} />}
              <Info icon={Calendar} label="Schedule" value={s.schedule_type === 'weekly' ? 'Weekly' : 'Flexible'} />
            </div>
            {s.venue && (
              <div className="card p-4 mt-5 bg-ink-50 border-dashed">
                <div className="text-xs text-ink-500 mb-1 uppercase tracking-wide font-semibold">Venue</div>
                <div className="text-sm">{s.venue}</div>
              </div>
            )}

            {data.reviews && data.reviews.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-ink-900 mb-3">What customers say</h3>
                <div className="space-y-3">
                  {data.reviews.map((r, i) => (
                    <div key={i} className="card p-4">
                      <div className="flex items-center gap-1 text-amber-500 mb-1">
                        {Array.from({ length: r.rating }).map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
                      </div>
                      <p className="text-sm text-ink-700">{r.comment}</p>
                      <div className="text-xs text-ink-400 mt-2">— {r.full_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24 self-start">
            <div className="card p-6">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-400">Starting at</div>
              <div className="font-display text-4xl font-bold text-ink-900 mt-2 tracking-tightest">
                {Number(s.price) > 0 ? `₹${Number(s.price).toFixed(0)}` : 'Free'}
              </div>
              {Number(s.tax_percent) > 0 && <div className="text-xs text-ink-500 mt-1.5">+{s.tax_percent}% tax {Number(s.tax_threshold) > 0 && `(over ₹${s.tax_threshold})`}</div>}
              <Link to={`/book/${s.id}`} className="btn-primary w-full !py-3 mt-5">Book now <ArrowRight size={14} /></Link>
              <button onClick={shareLink} className="btn-outline w-full mt-2"><Share2 size={14} /> Share link</button>
            </div>
            <div className="card p-5 text-xs text-ink-600 leading-relaxed space-y-1.5">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-400 mb-2">Good to know</div>
              {Boolean(s.advance_payment) && <div className="flex gap-2"><span>💳</span> Advance payment required to confirm.</div>}
              {!!Number(s.manual_confirmation) && <div className="flex gap-2"><span>⏳</span> Manual confirmation by provider.</div>}
              {!!Number(s.manage_capacity) && <div className="flex gap-2"><span>👥</span> Up to {s.max_per_slot} per slot.</div>}
              {Number(s.buffer_minutes) > 0 && <div className="flex gap-2"><span>⏸</span> {s.buffer_minutes}-min buffer between slots.</div>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50/50 p-4">
      <div className="flex items-center gap-2 text-[10px] text-ink-400 uppercase tracking-[0.14em] font-semibold">
        <Icon size={13} /> {label}
      </div>
      <div className="text-sm font-semibold text-ink-900 mt-1.5 truncate">{value}</div>
    </div>
  );
}
