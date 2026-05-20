import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Crown, Award, Loader2, QrCode, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { loadRazorpay, openRazorpay } from '../utils/razorpay';
import UpiQrModal from '../components/UpiQrModal.jsx';

const PLAN_ICON = { silver: Sparkles, gold: Award, platinum: Crown };

export default function Plans() {
  const nav = useNavigate();
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [payConfig, setPayConfig] = useState({ upi_vpa: 'success@razorpay', upi_name: 'Schedula', is_mock: true });

  useEffect(() => {
    api.get('/subscriptions/plans').then((d) => setPlans(d.plans || [])).catch((e) => setError(e.message));
    api.get('/subscriptions/mine').then((d) => setCurrent(d.subscription)).catch(() => {});
    api.get('/payment/config').then(setPayConfig).catch(() => {});
  }, []);

  const handleSubscribeClick = (plan) => {
    if (plan.price_monthly === 0) {
      subscribeFree(plan.key);
    } else {
      setSelectedPlan(plan);
    }
  };

  const subscribeFree = async (planKey) => {
    setBusyKey(planKey); setError(''); setInfo('');
    try {
      const d = await api.post('/subscriptions/subscribe', { plan_key: planKey });
      setInfo(`Activated ${d.plan}. ${d.bonus_credits ? `+${d.bonus_credits} bonus credits added!` : ''}`);
      const m = await api.get('/subscriptions/mine');
      setCurrent(m.subscription);
    } catch (e) { setError(e.message); }
    finally { setBusyKey(null); }
  };

  const submitPayment = async () => {
    if (!selectedPlan) return;
    setBusyKey(selectedPlan.key); setError(''); setInfo('');
    let order = null;
    try {
      order = await api.post('/payment/create-subscription-order', { plan_key: selectedPlan.key });
      let resp;
      if (order.is_mock) {
        await new Promise((r) => setTimeout(r, 600));
        resp = {
          razorpay_order_id:   order.razorpay_order_id,
          razorpay_payment_id: `pay_demo_${Date.now()}`,
          razorpay_signature:  'mock',
        };
      } else {
        const ok = await loadRazorpay();
        if (!ok) throw new Error('Could not load Razorpay checkout — check your internet connection.');
        resp = await openRazorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: order.name,
          description: order.description,
          order_id: order.razorpay_order_id,
          prefill: {},
          notes: { plan_key: selectedPlan.key },
        });
      }
      resp.plan_key = selectedPlan.key;
      const d = await api.post('/payment/verify-subscription', resp);
      setInfo(`Activated ${d.plan}. ${d.bonus_credits ? `+${d.bonus_credits} bonus credits added!` : ''}`);
      const m = await api.get('/subscriptions/mine');
      setCurrent(m.subscription);
      setSelectedPlan(null);
    } catch (e) {
      setError(e.message || 'Payment failed');
    } finally {
      setBusyKey(null);
    }
  };

  const confirmUpi = async () => {
    if (!selectedPlan) return;
    setError(''); setInfo('');
    try {
      const d = await api.post('/payment/upi-confirm-subscription', {
        plan_key: selectedPlan.key,
        upi_reference: `upi_qr_${Date.now()}`,
      });
      setInfo(`Activated ${d.plan}. ${d.bonus_credits ? `+${d.bonus_credits} bonus credits added!` : ''}`);
      const m = await api.get('/subscriptions/mine');
      setCurrent(m.subscription);
      setQrOpen(false);
      setSelectedPlan(null);
    } catch (e) { setError(e.message || 'Could not record UPI payment'); }
  };

  const cancel = async () => {
    if (!confirm('Cancel your current subscription?')) return;
    await api.post('/subscriptions/cancel');
    setCurrent(null);
    setInfo('Subscription cancelled.');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <span className="eyebrow inline-flex"><Sparkles size={11} className="text-accent-500" /> Subscription</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ink-900 mt-3 tracking-tightest leading-tight">
          Choose the plan that
          <br />
          <span className="font-serif italic font-medium text-accent-600">fits your routine.</span>
        </h1>
        <p className="text-ink-500 mt-4 max-w-xl mx-auto leading-relaxed">Unlock priority booking, free reschedules, and faster credit accrual. Upgrade or cancel any time.</p>
      </div>

      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm mb-4">{error}</div>}
      {info && <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 p-3 text-sm mb-4">{info}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p, i) => {
          const Icon = PLAN_ICON[p.key] || Sparkles;
          const isCurrent = current && current.key === p.key;
          const featured = p.key === 'gold';
          return (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`card p-7 flex flex-col relative ${featured ? 'ring-2 ring-ink-900 border-ink-900' : ''}`}>
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 pill bg-accent-500 text-white shadow-soft">Most popular</span>
              )}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: p.color }}>
                <Icon size={22} />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink-900 mt-4 tracking-crisp">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-ink-900 tracking-tightest">₹{Number(p.price_monthly).toFixed(0)}</span>
                <span className="text-sm text-ink-500">/ month</span>
              </div>
              <ul className="space-y-2 mt-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                    <Check size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn-outline w-full mt-6" onClick={cancel}>Cancel subscription</button>
              ) : (
                <button className={`${featured ? 'btn-primary' : 'btn-outline'} w-full mt-6`}
                  onClick={() => handleSubscribeClick(p)} disabled={busyKey === p.key}>
                  {busyKey === p.key ? <Loader2 size={14} className="animate-spin" /> : null}
                  {busyKey === p.key ? 'Activating…' : (p.price_monthly === 0 ? 'Activate' : 'Subscribe')}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-10">
        <button onClick={() => nav('/')} className="btn-ghost">Continue browsing services →</button>
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedPlan(null)}>
          <div className="card w-full max-w-lg p-6 sm:p-7 relative animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPlan(null)} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-ink-100 text-ink-500">
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
              Payment
            </h2>
            <p className="text-sm text-ink-500 mt-1">
              Card, UPI, Net Banking & wallets — all via Razorpay's secure checkout.
            </p>
            <div className="card p-4 bg-ink-50 border-dashed mt-4 mb-5">
              <div className="text-sm">
                <div className="font-semibold text-ink-900">Total to pay: ₹{Number(selectedPlan.price_monthly).toFixed(2)}</div>
                <div className="text-xs text-ink-500 mt-1">
                  Click "Pay" below to launch Razorpay. Subscription is activated only after payment succeeds.
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end mt-6">
              <button className="btn-outline !py-2.5" onClick={() => setQrOpen(true)} disabled={busyKey === selectedPlan.key}>
                <QrCode size={16} /> Pay via UPI QR
              </button>
              <button className="btn-primary !py-2.5" disabled={busyKey === selectedPlan.key} onClick={submitPayment}>
                {busyKey === selectedPlan.key ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Pay ₹{Number(selectedPlan.price_monthly).toFixed(2)} with Razorpay
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPlan && (
        <UpiQrModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          amount={selectedPlan.price_monthly}
          vpa={payConfig.upi_vpa}
          name={payConfig.upi_name}
          note={`Schedula ${selectedPlan.name} Subscription`}
          onConfirm={confirmUpi}
        />
      )}
    </div>
  );
}
