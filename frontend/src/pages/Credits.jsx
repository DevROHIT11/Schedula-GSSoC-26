import { useEffect, useState } from 'react';
import { Coins, Clock, TrendingUp, ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { api } from '../api/client';

const fmtDt = (s) => s ? new Date(s.replace(' ', 'T')).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function Credits() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/credits/me').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>;
  if (!data) return <div className="p-12 text-center text-ink-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <span className="eyebrow"><Coins size={11} className="text-accent-500" /> Wallet</span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 mt-2 tracking-tightest">Schedula credits</h1>
        <p className="text-sm text-ink-500 mt-1.5">Earn credits with every booking — redeem them on future services.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-7 col-span-1 md:col-span-2 bg-ink-900 text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-accent-500/30 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.16em] opacity-70 font-semibold flex items-center gap-2"><Coins size={12} /> Available balance</div>
            <div className="font-display text-6xl font-bold mt-3 tracking-tightest">{data.balance.toLocaleString()}</div>
            <div className="text-sm opacity-70 mt-2">1 credit = ₹1 off your next booking</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-400 flex items-center gap-2"><Clock size={12} /> Expiring soon</div>
          <div className="font-display text-3xl font-bold text-ink-900 mt-2 tracking-tightest">{data.expiring_soon.toLocaleString()}</div>
          <div className="text-xs text-ink-500 mt-1.5">Within next 30 days</div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-ink-900 mb-3 flex items-center gap-2"><TrendingUp size={16} /> Recent activity</h3>
        {data.transactions.length === 0 ? (
          <div className="text-sm text-ink-500">No activity yet.</div>
        ) : (
          <ul className="space-y-1">
            {data.transactions.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-3 border-b border-ink-200 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {t.amount > 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink-900">{t.reason}</div>
                    <div className="text-xs text-ink-500">{fmtDt(t.created_at)}{t.expires_at ? ` · expires ${fmtDt(t.expires_at)}` : ''}</div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${t.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5 bg-ink-50 border-dashed">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-amber-500 mt-0.5" />
          <div>
            <div className="font-semibold text-ink-900">How credits work</div>
            <ul className="text-sm text-ink-600 mt-1 space-y-1 list-disc pl-4">
              <li>Earn 5% back on every paid booking</li>
              <li>Gold subscribers earn 2x; Platinum subscribers earn 5x</li>
              <li>Credits expire 90 days from issue — use them or lose them</li>
              <li>Cancellations refund any credits used on that booking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
