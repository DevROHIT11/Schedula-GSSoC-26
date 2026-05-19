import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Star, Video, Users, Bookmark, ArrowUpRight } from 'lucide-react';
import { imageFor, descriptionFor } from '../utils/serviceVisuals';
import { formatINR } from '../utils/format';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

export default function ServiceCard({ service: s, to, savedIds, onToggleSaved }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const img = imageFor(s);
  const desc = descriptionFor(s);
  const price = Number(s.price || 0);
  const link = to || `/book/${s.id}`;
  const isVirtual = s.appointment_type === 'virtual';
  const cityLabel = s.city || s.venue;

  useEffect(() => {
    if (savedIds) setSaved(savedIds.has(s.id));
  }, [savedIds, s.id]);

  const toggleSave = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user || busy) return;
    setBusy(true);
    try {
      if (saved) { await api.del(`/saved/${s.id}`); setSaved(false); onToggleSaved?.(s.id, false); }
      else { await api.post(`/saved/${s.id}`); setSaved(true); onToggleSaved?.(s.id, true); }
    } catch { /* ignore */ }
    finally { setBusy(false); }
  };

  return (
    <Link to={link} className="card-hover overflow-hidden group flex flex-col animate-fade-in">
      {/* Editorial image — clean, slightly muted on hover; no heavy gradient overlay */}
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        <img src={img} alt={s.name}
             onError={(e) => { e.currentTarget.style.display = 'none'; }}
             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />

        {/* Top-left chips */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {s.category_name && (
            <span className="pill bg-white/95 text-ink-800 backdrop-blur shadow-soft">{s.category_name}</span>
          )}
          {isVirtual && (
            <span className="pill bg-ink-900 text-white"><Video size={11} /> Virtual</span>
          )}
        </div>

        {/* Top-right save button */}
        {user && (
          <button onClick={toggleSave} disabled={busy}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur transition shadow-soft
              ${saved ? 'bg-accent-500 text-white' : 'bg-white/95 text-ink-700 hover:text-accent-600'}`}
            title={saved ? 'Remove from saved' : 'Save'}>
            <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Content panel */}
      <div className="p-5 flex-1 flex flex-col gap-3.5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-[1.05rem] font-semibold text-ink-900 leading-snug line-clamp-2 tracking-crisp">
              {s.name}
            </h3>
            <span className="font-display font-semibold text-ink-900 text-base whitespace-nowrap">
              {price > 0 ? formatINR(price) : 'Free'}
            </span>
          </div>
          <p className="text-[13px] text-ink-500 line-clamp-2 mt-1.5 leading-relaxed">{desc}</p>
        </div>

        <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><Clock size={12} /> {s.duration_minutes} min</span>
          {!!s.manage_capacity && (
            <span className="inline-flex items-center gap-1"><Users size={12} /> Up to {s.max_per_slot}</span>
          )}
          {Number(s.rating) > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700"><Star size={12} fill="currentColor" /> {Number(s.rating).toFixed(1)}</span>
          )}
          {cityLabel && (
            <span className="inline-flex items-center gap-1 truncate"><MapPin size={12} /> <span className="truncate">{cityLabel}</span></span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-ink-200">
          <span className="text-xs text-ink-500 truncate">by <span className="text-ink-800 font-medium">{s.organiser_name}</span></span>
          <span className="text-xs font-semibold text-ink-900 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
            Book <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}
