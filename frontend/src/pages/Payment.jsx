import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Loader2, ChevronLeft, ShieldCheck, CreditCard, AlertTriangle, FlaskConical, Smartphone, QrCode } from 'lucide-react';
import { api } from '../api/client';
import { loadRazorpay, openRazorpay } from '../utils/razorpay';
import { useAuth } from '../context/AuthContext.jsx';
import UpiQrModal from '../components/UpiQrModal.jsx';

export default function Payment() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [config, setConfig] = useState({ is_mock: true, key_id: '', upi_vpa: 'success@razorpay', upi_name: 'Schedula' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${id}`).then(setData).catch((e) => setError(e.message));
    api.get('/payment/config').then(setConfig).catch(() => {});
    loadRazorpay();
  }, [id]);

  const payRazorpay = async () => {
    setBusy(true); setError(''); setInfo('');
    let order = null;
    try {
      order = await api.post('/payment/create-order', { booking_id: Number(id) });

      let resp;
      if (order.is_mock) {
        setInfo('Demo mode — simulating Razorpay checkout…');
        await new Promise((r) => setTimeout(r, 700));
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
          prefill: user
            ? { name: user.full_name || '', email: user.email || '', contact: user.phone || '' }
            : {},
          notes: { booking_id: String(order.booking_id) },
        });
      }

      const v = await api.post('/payment/verify', resp);
      setInfo(`Payment successful — earned ${v.reward_credits} credits.`);
      setTimeout(() => nav(`/booking/${id}`), 800);
    } catch (e) {
      if (order?.razorpay_order_id && /cancel|fail/i.test(e.message || '')) {
        api.post('/payment/fail', { razorpay_order_id: order.razorpay_order_id }).catch(() => {});
      }
      setError(e.message || 'Payment could not be completed');
    } finally {
      setBusy(false);
    }
  };

  const confirmUpi = async () => {
    setError(''); setInfo('');
    try {
      const v = await api.post('/payment/upi-confirm', {
        booking_id: Number(id),
        upi_reference: `upi_qr_${Date.now()}`,
      });
      setInfo(`Payment recorded — earned ${v.reward_credits} credits.`);
      setQrOpen(false);
      setTimeout(() => nav(`/booking/${id}`), 800);
    } catch (e) {
      setError(e.message || 'Could not record UPI payment');
    }
  };

  if (!data) return <div className="p-12 text-center text-ink-500">Loading…</div>;
  const b = data.booking;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => nav(-1)} className="btn-ghost mb-5"><ChevronLeft size={16} /> Back</button>

      <div className="mb-6">
        <span className="eyebrow">Checkout</span>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 mt-2 tracking-crisp">Complete your payment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3 pb-5 border-b border-ink-200">
            <div className="flex items-center gap-2.5 text-ink-900">
              <Lock size={18} className="text-ink-500" /> <h2 className="font-display text-lg font-semibold tracking-crisp">Choose payment method</h2>
            </div>
            {config.is_mock
              ? <span className="pill-amber"><FlaskConical size={10} /> Test / Demo mode</span>
              : <span className="pill-green"><ShieldCheck size={10} /> Live mode</span>}
          </div>

          {error && (
            <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 mt-4 text-sm flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}
          {info && <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 p-3 mt-4 text-sm">{info}</div>}

          {/* Option 1 — Razorpay */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 mt-5 hover:border-ink-400 transition">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-ink-900 text-white flex items-center justify-center flex-shrink-0"><CreditCard size={18} /></div>
              <div className="flex-1">
                <div className="font-display font-semibold text-ink-900 tracking-crisp">Razorpay Checkout</div>
                <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                  Card · UPI · Net Banking · Wallets — handled through Razorpay's secure checkout.
                </p>
              </div>
            </div>
            <button className="btn-primary w-full !py-3 mt-5" disabled={busy} onClick={payRazorpay}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {busy ? 'Processing…' : `Pay ₹${Number(b.total_amount).toFixed(2)} with Razorpay`}
            </button>
          </div>

          {/* Option 2 — UPI QR (always available, perfect for live demos) */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 mt-4 hover:border-ink-400 transition">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-accent-500 text-white flex items-center justify-center flex-shrink-0"><QrCode size={18} /></div>
              <div className="flex-1">
                <div className="font-display font-semibold text-ink-900 flex items-center gap-2 tracking-crisp">
                  Scan UPI QR
                  <span className="pill-slate">Demo</span>
                </div>
                <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                  Open a phone-scannable QR code. Works with any UPI app — Google Pay, PhonePe, Paytm, BHIM.
                </p>
              </div>
            </div>
            <button className="btn-outline w-full !py-3 mt-5" onClick={() => setQrOpen(true)}>
              <Smartphone size={16} /> Show UPI QR for ₹{Number(b.total_amount).toFixed(2)}
            </button>
          </div>

          {config.is_mock && (
            <div className="card p-4 bg-amber-50 border-amber-200 mt-5 text-sm">
              <div className="font-semibold text-amber-900 flex items-center gap-2"><FlaskConical size={14} /> Demo mode</div>
              <p className="text-amber-800 mt-1 leading-relaxed">
                No real charge happens. Add <code className="mx-1 bg-amber-100 px-1.5 py-0.5 rounded">RAZORPAY_KEY_ID</code> and
                <code className="mx-1 bg-amber-100 px-1.5 py-0.5 rounded">RAZORPAY_KEY_SECRET</code> to <code className="bg-amber-100 px-1.5 py-0.5 rounded">backend/.env</code> and restart for live mode.
              </p>
            </div>
          )}

          <p className="text-center text-xs text-ink-500 flex items-center justify-center gap-1 mt-5">
            <ShieldCheck size={12} /> PCI-DSS compliant · 256-bit encryption
          </p>
        </div>

        <aside className="card p-6 lg:sticky lg:top-24 self-start">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-400 mb-3">Order summary</div>
          <div className="font-display font-semibold text-ink-900 text-base leading-snug tracking-crisp pb-3 border-b border-ink-200">{b.service_name}</div>
          <div className="space-y-2.5 text-sm pt-4">
            <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span className="font-medium">₹{Number(b.subtotal_amount || b.total_amount).toFixed(2)}</span></div>
            {Number(b.discount_amount) > 0 && (
              <div className="flex justify-between text-sage-700"><span>Discount</span><span>−₹{Number(b.discount_amount).toFixed(2)}</span></div>
            )}
            {Number(b.tax_amount) > 0 && (
              <div className="flex justify-between"><span className="text-ink-500">GST</span><span className="font-medium">₹{Number(b.tax_amount).toFixed(2)}</span></div>
            )}
            {Number(b.credits_used) > 0 && (
              <div className="flex justify-between text-accent-700"><span>Credits</span><span>−₹{Number(b.credits_used).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between items-center pt-1"><span className="text-ink-500">Status</span><span className="pill-amber">Awaiting payment</span></div>
            <div className="border-t border-ink-200 pt-3 flex justify-between items-end">
              <span className="font-display font-semibold text-ink-900">Total</span>
              <span className="font-display text-2xl font-bold text-ink-900 tracking-tightest">₹{Number(b.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>

      <UpiQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        amount={b.total_amount}
        vpa={config.upi_vpa}
        name={config.upi_name}
        note={`Schedula booking #${b.id}`}
        onConfirm={confirmUpi}
      />
    </div>
  );
}
