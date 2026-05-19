// Lazy loader for the Razorpay Checkout script. Resolves only once even if
// called multiple times, and gracefully fails if the SDK is unreachable.

let scriptPromise = null;

export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload  = () => resolve(true);
    s.onerror = () => { scriptPromise = null; resolve(false); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Open the Razorpay checkout. Returns a promise:
//   resolves with { razorpay_order_id, razorpay_payment_id, razorpay_signature } on success
//   rejects with Error(reason) on dismiss / failure
export function openRazorpay(opts) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error('Razorpay SDK not loaded'));
    let settled = false;
    const safe = (fn) => (...args) => { if (settled) return; settled = true; fn(...args); };

    const rzp = new window.Razorpay({
      ...opts,
      handler: safe((resp) => resolve(resp)),
      modal: { ondismiss: safe(() => reject(new Error('Payment cancelled'))) },
      theme: { color: '#6366f1' },
    });
    rzp.on('payment.failed', safe((resp) => {
      const reason = resp?.error?.description || resp?.error?.reason || 'Payment failed';
      reject(new Error(reason));
    }));
    rzp.open();
  });
}
