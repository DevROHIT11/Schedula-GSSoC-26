import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Search, ShieldCheck, Zap, Star, ArrowUpRight } from 'lucide-react';
import { api } from '../api/client';
import ServiceCard from '../components/ServiceCard.jsx';
import CategoryGrid from '../components/CategoryGrid.jsx';
import FaqSection from '../components/FaqSection.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

// Hero taglines that rotate every few seconds. The accent word swaps with each
// line so the eye-catching tail picks up the orange.
const HERO_LINES = [
  { lead: 'Book trusted services',         accent: 'in seconds.' },
  { lead: 'Real-time slots,',              accent: 'zero waiting.' },
  { lead: 'From dentist to therapy —',     accent: 'one tap away.' },
  { lead: 'Pay smart, earn credits,',      accent: 'book again.' },
];
const HERO_ROTATE_MS = 4200;

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [heroQuery, setHeroQuery] = useState('');
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    let id;
    const start = () => { id = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_LINES.length), HERO_ROTATE_MS); };
    const stop  = () => { if (id) clearInterval(id); };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  useEffect(() => {
    api.get('/services/recommended').then((d) => setRecommended(d.services || [])).catch(() => {});
    if (user) api.get('/saved/ids').then((d) => setSavedIds(new Set(d.ids || []))).catch(() => {});
    else setSavedIds(new Set());
  }, [user]);

  const onToggleSaved = (id, saved) => {
    setSavedIds((prev) => { const next = new Set(prev); if (saved) next.add(id); else next.delete(id); return next; });
  };

  return (
    <div className="space-y-14">
      {/* ── Editorial hero — paper surface, oversized display type ─────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-ink-200 bg-white">
        {/* Subtle paper texture + warm corner wash */}
        <div className="absolute inset-0 bg-mesh-1 opacity-60" aria-hidden />
        <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-accent-100/60 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-24 w-[24rem] h-[24rem] rounded-full bg-brand-100/70 blur-3xl" aria-hidden />

        <div className="relative px-6 sm:px-12 py-12 sm:py-16">
          <div className="max-w-3xl">
            <span className="eyebrow"><span className="w-1.5 h-1.5 rounded-full bg-accent-500" /> Smart scheduling for every routine</span>

            {/* Rotating display headline */}
            <h1 className="font-display text-[2.4rem] sm:text-[3.6rem] lg:text-[4.4rem] font-bold mt-5 leading-[1.02] tracking-tightest text-ink-900 relative min-h-[5.2rem] sm:min-h-[7.5rem] lg:min-h-[9.5rem]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={heroIdx}
                  initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                  className="block"
                >
                  {HERO_LINES[heroIdx].lead}{' '}
                  <span className="font-serif italic font-medium text-accent-600">
                    {HERO_LINES[heroIdx].accent}
                  </span>
                </motion.span>
              </AnimatePresence>
              <span className="absolute -bottom-1 left-0 hidden sm:flex gap-1.5">
                {HERO_LINES.map((_, i) => (
                  <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i === heroIdx ? 'w-7 bg-ink-900' : 'w-1.5 bg-ink-200'}`} />
                ))}
              </span>
            </h1>

            <p className="text-ink-600 mt-7 text-base sm:text-lg max-w-xl leading-relaxed">
              Real-time availability across <b className="text-ink-900">healthcare, sports, counseling, events, interviews</b> and virtual services. No calls. No waiting. Just bookings that fit your day.
            </p>

            {/* Inline search — paper input with primary CTA */}
            <form
              onSubmit={(e) => { e.preventDefault(); const q = heroQuery.trim(); nav(q ? `/search?q=${encodeURIComponent(q)}` : '/search'); }}
              className="mt-8 flex flex-col sm:flex-row gap-2 max-w-2xl">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  className="w-full pl-12 pr-4 py-4 rounded-full text-ink-900 placeholder-ink-400 bg-white border border-ink-200 outline-none focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10 transition"
                  placeholder="Try “dentist near me”, “yoga class”, “career coach”…"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary !py-4 !px-7 text-sm">
                Find services <ArrowRight size={15} />
              </button>
            </form>

            {/* Trust strip */}
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-ink-600">
              <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-sage-600" /> Verified providers</span>
              <span className="flex items-center gap-2"><Zap size={15} className="text-accent-500" /> Instant confirmation</span>
              <span className="flex items-center gap-2"><Star size={15} className="text-amber-500 fill-amber-500" /> 4.9 average rating</span>
              <span className="flex items-center gap-2 text-ink-500">·</span>
              <span className="flex items-center gap-2 text-ink-500">50,000+ bookings completed</span>
            </div>

            {!user && (
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link to="/register" className="btn-accent">Create an account</Link>
                <Link to="/plans" className="btn-outline">View plans <ArrowUpRight size={14} /></Link>
              </div>
            )}
          </div>

          {/* Decorative editorial number — Mobbin-esque corner type */}
          <div className="hidden lg:block absolute right-12 bottom-10 text-right">
            <div className="font-serif italic text-ink-300 text-7xl leading-none select-none">'26</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 mt-2">Smart scheduling, made human</div>
          </div>
        </div>
      </motion.section>

      {/* ── Categories ─────────────────────────────────────────────────── */}
      <CategoryGrid />

      {/* ── Recommended ─────────────────────────────────────────────────
          Auto-scrolling marquee with edge fades. Pauses on hover so users can
          read and click any card. */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <span className="eyebrow"><Sparkles size={11} className="text-accent-500" /> Hand-picked</span>
              <h2 className="section-title mt-2">Recommended for you</h2>
              <p className="section-sub mt-1">
                Top-rated picks {user?.city ? `near ${user.city}` : 'across the platform'} — hover to pause the scroll.
              </p>
            </div>
            <Link to="/search" className="text-sm font-medium text-ink-900 inline-flex items-center gap-1.5 hover:gap-2 transition-all">
              See all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="relative group rounded-3xl bg-white border border-ink-200 overflow-hidden">
            <div className="absolute -top-8 left-10 w-48 h-48 rounded-full bg-brand-100/40 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 right-10 w-56 h-56 rounded-full bg-accent-100/40 blur-3xl pointer-events-none" />
            <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 z-10 bg-gradient-to-r from-white via-white/85 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 z-10 bg-gradient-to-l from-white via-white/85 to-transparent pointer-events-none" />

            <div
              className="flex gap-5 animate-marquee group-hover:[animation-play-state:paused] py-6 px-4"
              style={{ width: 'max-content' }}
            >
              {[...recommended, ...recommended].map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className="w-[280px] sm:w-[320px] flex-shrink-0"
                  aria-hidden={i >= recommended.length}
                >
                  <ServiceCard service={s} savedIds={savedIds} onToggleSaved={onToggleSaved} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works — editorial three-step strip ──────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <span className="eyebrow">Process</span>
            <h2 className="section-title mt-2">Booking shouldn't be this easy.</h2>
            <p className="section-sub mt-1">It is. Three steps from "I need this" to "see you Tuesday".</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { n: '01', t: 'Find your service', d: 'Browse by category or search by name, city, or provider. Real-time availability shown up front.' },
            { n: '02', t: 'Pick a slot that fits', d: 'See open windows the moment they update — no double-booking, no email back-and-forth.' },
            { n: '03', t: 'Pay & relax', d: 'Card, UPI, or wallet — confirmed instantly. Earn credits on every booking.' },
          ].map((s) => (
            <div key={s.n} className="card p-7 hover:border-ink-300 transition group">
              <div className="font-serif italic text-ink-300 text-5xl leading-none">{s.n}</div>
              <h3 className="font-display text-xl font-semibold text-ink-900 mt-4 tracking-crisp">{s.t}</h3>
              <p className="text-sm text-ink-600 mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <FaqSection />
    </div>
  );
}
