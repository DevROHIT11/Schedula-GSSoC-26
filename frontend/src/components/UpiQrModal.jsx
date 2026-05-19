import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle2, Smartphone, Loader2, Copy, Check, ExternalLink } from 'lucide-react';

// ---------- UPI deep-link builders ----------
// All UPI apps honor the universal `upi://pay?…` scheme — when multiple are
// installed, the OS shows a chooser. Each major app also exposes an
// app-specific scheme that opens it directly, which we use for "Pay with X"
// buttons so the user lands inside their preferred app immediately.
function upiParams({ vpa, name, amount, note }) {
  return new URLSearchParams({
    pa: vpa,
    pn: name,
    am: Number(amount).toFixed(2),
    cu: 'INR',
    tn: note || 'Schedula booking',
  }).toString();
}

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

// Brand-styled SVG glyphs (small, inline, license-safe geometric marks).
const GpayLogo = () => (
  <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
    <circle cx="18" cy="18" r="18" fill="#fff" stroke="#dadce0" />
    <path d="M27.7 18.2c0-.7-.06-1.3-.18-1.95H18v3.7h5.45c-.24 1.27-.95 2.34-2.02 3.07v2.55h3.27c1.91-1.76 3-4.36 3-7.37z" fill="#4285F4" />
    <path d="M18 28c2.73 0 5.02-.9 6.7-2.43l-3.27-2.55c-.91.6-2.07.97-3.43.97-2.64 0-4.88-1.78-5.68-4.18H8.94v2.62A10 10 0 0 0 18 28z" fill="#34A853" />
    <path d="M12.32 19.81a6 6 0 0 1 0-3.83v-2.62H8.94a10 10 0 0 0 0 9.07l3.38-2.62z" fill="#FBBC04" />
    <path d="M18 11.95c1.49 0 2.83.51 3.88 1.52l2.9-2.9C23.02 8.97 20.73 8 18 8a10 10 0 0 0-9.06 5.36l3.38 2.62c.8-2.4 3.04-4.03 5.68-4.03z" fill="#EA4335" />
  </svg>
);
const PhonePeLogo = () => (
  <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
    <rect width="36" height="36" rx="6" fill="#5F259F" />
    <path d="M22.7 11.5h-3.4v6.8h-3.4v-2.2h-2.6V11.5H10v13h3.4v-2.6h2.6V25h3.3v-3.6c2.5-.4 4-2.2 4-4.5 0-2.7-1.7-4.4-4-4.4h-1l-1 .1v-1.1h5.4z" fill="#fff" />
  </svg>
);
const PaytmLogo = () => (
  <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
    <rect width="36" height="36" rx="6" fill="#fff" stroke="#dadce0" />
    <text x="18" y="22" textAnchor="middle" fontFamily="Inter, Arial" fontSize="9.5" fontWeight="800" fill="#00BAF2">Paytm</text>
  </svg>
);
const BhimLogo = () => (
  <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
    <rect width="36" height="36" rx="6" fill="#FF6B00" />
    <text x="18" y="22" textAnchor="middle" fontFamily="Inter, Arial" fontSize="10" fontWeight="800" fill="#fff">BHIM</text>
  </svg>
);

export default function UpiQrModal({ open, onClose, amount, vpa, name, note, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const mobile = useMemo(isMobile, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const params = upiParams({ vpa, name, amount, note });

  // App-specific deep links. The fallback (`upi://`) lets the OS show its
  // chooser when no specific app is targeted.
  const apps = [
    { id: 'gpay',     name: 'Google Pay', logo: GpayLogo,    href: `tez://upi/pay?${params}`,    bg: 'bg-white',         color: 'text-ink-900', border: 'border-ink-200' },
    { id: 'phonepe',  name: 'PhonePe',    logo: PhonePeLogo, href: `phonepe://pay?${params}`,    bg: 'bg-[#5F259F]',     color: 'text-white',   border: 'border-[#5F259F]' },
    { id: 'paytm',    name: 'Paytm',      logo: PaytmLogo,   href: `paytmmp://pay?${params}`,    bg: 'bg-white',         color: 'text-ink-900', border: 'border-ink-200' },
    { id: 'bhim',     name: 'BHIM',       logo: BhimLogo,    href: `upi://pay?${params}`,        bg: 'bg-white',         color: 'text-ink-900', border: 'border-ink-200' },
  ];
  const universalHref = `upi://pay?${params}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(vpa); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(); }
    finally { setBusy(false); }
  };

  const QrPanel = (
    <div className="flex flex-col items-center">
      <div className="p-4 bg-white rounded-2xl border border-ink-200 shadow-soft">
        <QRCodeSVG value={universalHref} size={196} level="M" includeMargin={false} />
      </div>
      <div className="text-[11px] text-ink-500 mt-2">Scan with any UPI app on your phone</div>
    </div>
  );

  const AppButtons = (
    <div className="grid grid-cols-2 gap-2">
      {apps.map((app) => (
        <a
          key={app.id}
          href={app.href}
          rel="noreferrer"
          className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border ${app.bg} ${app.color} ${app.border} text-sm font-semibold hover:shadow-md transition active:scale-[0.98]`}
          title={mobile ? `Open ${app.name}` : `${app.name} link (opens on mobile only)`}
        >
          <app.logo />
          <span>{app.name}</span>
        </a>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6 relative animate-slide-up max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><X size={18} /></button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 mb-3">
            <Smartphone size={22} />
          </div>
          <h2 className="text-xl font-bold text-ink-900">Pay ₹{Number(amount).toFixed(2)} via UPI</h2>
          <p className="text-xs text-ink-500 mt-1">
            {mobile
              ? 'Tap your favourite UPI app to pay instantly.'
              : 'Scan the QR with your phone, or use the app links from a mobile device.'}
          </p>
        </div>

        {mobile ? (
          <>
            <div className="mt-5">{AppButtons}</div>
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-ink-200" />
              <span className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">or scan</span>
              <div className="flex-1 h-px bg-ink-200" />
            </div>
            <div className="flex justify-center">{QrPanel}</div>
          </>
        ) : (
          <>
            <div className="mt-5 flex justify-center">{QrPanel}</div>
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-ink-200" />
              <span className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">or open on mobile</span>
              <div className="flex-1 h-px bg-ink-200" />
            </div>
            {AppButtons}
            <div className="text-[10px] text-ink-400 mt-2 flex items-center justify-center gap-1">
              <ExternalLink size={10} /> App buttons require a UPI app installed (mobile only)
            </div>
          </>
        )}

        <div className="card p-3 bg-ink-50 border-dashed mt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide font-semibold text-ink-500">Pay to</div>
              <div className="font-mono text-sm font-medium truncate">{vpa}</div>
            </div>
            <button onClick={copy} className="btn-ghost !py-1.5 !px-2 text-xs" title="Copy UPI ID">
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <button className="btn-primary w-full !py-3 mt-3" onClick={confirm} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {busy ? 'Confirming…' : "I've completed the payment"}
        </button>

        <p className="text-[11px] text-center text-ink-400 mt-3 leading-relaxed">
          Demo flow: clicking <b>"I've completed the payment"</b> marks this booking as paid in our system.
          For verified Razorpay payments, use the <b>Pay with Razorpay</b> button instead.
        </p>
      </div>
    </div>
  );
}
