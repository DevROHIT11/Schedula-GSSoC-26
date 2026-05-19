import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Star, Zap, ArrowUpRight } from 'lucide-react';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* ── Editorial side panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-white border-r border-ink-200 relative overflow-hidden">
        {/* Soft warm wash + grain */}
        <div className="absolute -bottom-40 -right-32 w-[34rem] h-[34rem] rounded-full bg-accent-100/60 blur-3xl" />
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand-100/60 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-2xl bg-ink-900 flex items-center justify-center text-white font-display font-bold text-lg">S</div>
          <div>
            <div className="font-display font-bold text-lg leading-none tracking-crisp text-ink-900">Schedula</div>
            <div className="text-xs text-ink-500 mt-1">Smart appointment scheduling</div>
          </div>
        </Link>

        <div className="relative z-10 max-w-md">
          <span className="eyebrow"><span className="w-1.5 h-1.5 rounded-full bg-accent-500" /> Welcome to Schedula</span>
          <h2 className="font-display text-4xl font-semibold text-ink-900 mt-4 leading-[1.1] tracking-tightest">
            Real-time slots,
            <br />
            <span className="font-serif italic font-medium text-accent-600">transparent pricing,</span>
            <br />
            instant confirmation.
          </h2>
          <p className="text-ink-600 mt-5 leading-relaxed">
            Healthcare, sports, counseling, events, interviews and more — book in seconds, reschedule with a tap, get reminded automatically.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-9">
            {[
              { k: '50K+', v: 'Bookings completed' },
              { k: '4.9★', v: 'Average rating' },
              { k: '6',    v: 'Service categories' },
            ].map((s) => (
              <div key={s.k} className="bg-ink-50 border border-ink-200 rounded-2xl p-4">
                <div className="font-display text-2xl font-bold text-ink-900 tracking-crisp">{s.k}</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-[0.12em] mt-1.5 leading-tight">{s.v}</div>
              </div>
            ))}
          </div>

          <ul className="mt-8 space-y-2.5 text-sm text-ink-700">
            <li className="flex items-center gap-2.5"><ShieldCheck size={15} className="text-sage-600" /> Verified providers across India</li>
            <li className="flex items-center gap-2.5"><Zap size={15} className="text-accent-500" /> Instant confirmation — no callbacks</li>
            <li className="flex items-center gap-2.5"><Star size={15} className="text-amber-500 fill-amber-500" /> Earn credits on every booking</li>
          </ul>
        </div>

        <div className="text-xs text-ink-500 relative z-10 flex items-center justify-between">
          <span>© Schedula · Built for VIT × Odoo Hackathon</span>
          <Link to="/" className="inline-flex items-center gap-1 hover:text-ink-900 transition">Visit site <ArrowUpRight size={12} /></Link>
        </div>
      </div>

      {/* ── Form column ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-ink-50">
        <div className="lg:hidden mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center text-white font-display font-bold">S</div>
            <span className="font-display font-bold tracking-crisp">Schedula</span>
          </Link>
        </div>
        <div className="max-w-md w-full mx-auto">
          <span className="eyebrow"><Sparkles size={11} className="text-accent-500" /> Account</span>
          <h1 className="font-display text-3xl sm:text-[2.4rem] font-semibold text-ink-900 mt-3 tracking-tightest leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 mt-2 leading-relaxed">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-7 text-sm text-ink-500 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
