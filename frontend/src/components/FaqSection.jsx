import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

// Curated FAQs for an appointment-booking platform. Tone matches the rest
// of the product: helpful, specific, brand-aware.
const FAQS = [
  {
    q: 'How do I book an appointment?',
    a: 'Pick a category from the homepage tiles, choose a service, then walk through the 7-step flow: provider → date → slot → details → payment → confirmation. Most bookings take under a minute.',
  },
  {
    q: 'Can I reschedule or cancel my booking?',
    a: 'Yes — open Profile → Upcoming → Reschedule (or Cancel). Paid bookings are refunded automatically; any credits used are returned to your wallet immediately. Gold and Platinum members can reschedule for free.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Cards (Visa, Master, Rupay), UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking and wallets — all handled securely through Razorpay. You can also scan a UPI QR right inside the app.',
  },
  {
    q: 'How do I join a virtual appointment?',
    a: 'Every virtual booking gets a unique meeting link. Open your booking detail and click "Join virtual meeting" — it opens a Jitsi room (or your provider\'s Meet/Zoom URL). Both you and the provider land in the same room.',
  },
  {
    q: 'What are Schedula credits and how do they work?',
    a: 'You earn 5% credits on every paid booking — 2× as a Gold member and 5× as Platinum. 1 credit = ₹1 off your next booking, capped at 50% of the order. Credits expire 90 days from issue.',
  },
  {
    q: 'What\'s the difference between Silver, Gold and Platinum plans?',
    a: 'Silver is free with standard booking and a 14-day visibility window. Gold (₹299/mo) unlocks priority slots, 30-day horizon, 2× credits and free reschedules. Platinum (₹799/mo) adds VIP-only slots, full 365-day horizon, 5× credits and dedicated support.',
  },
  {
    q: 'Are my payments secure?',
    a: 'Yes. Card details never touch our servers — Razorpay is PCI-DSS compliant with 256-bit encryption and HMAC-SHA256 signature verification. Bookings are only marked paid after the signature is verified server-side.',
  },
  {
    q: 'Can I book on behalf of someone else?',
    a: 'During the Details step, switch "Booking for" to "Someone else" and enter their name and phone. Reminders and the meeting link are then routed to them while billing stays with you.',
  },
  {
    q: 'What if I miss my appointment?',
    a: 'Reach out to the provider through the booking detail page. No-show policies vary by service, but most allow a one-time reschedule within 48 hours. Credits used on the booking are not refunded for no-shows.',
  },
];

// Floating decorative shapes — purely visual, sit behind the content.
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Big soft colour orbs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-200/40 blur-3xl animate-breathe" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-amber-200/40 blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 -translate-y-1/2 -left-12 w-56 h-56 rounded-full bg-fuchsia-200/30 blur-3xl animate-breathe" style={{ animationDelay: '4s' }} />

      {/* Small SVG icons drifting around */}
      <svg className="absolute top-10 right-[18%] w-9 h-9 text-brand-300 animate-float-y" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>

      <svg className="absolute bottom-16 left-[12%] w-10 h-10 text-amber-300 animate-orbit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>

      <svg className="absolute top-20 left-1/3 w-8 h-8 text-fuchsia-300 animate-float-x" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3l2.4 5 5.6.8-4 3.9 1 5.6L12 15.7 6.9 18.3l1-5.6-4-3.9 5.6-.8z" />
      </svg>

      <svg className="absolute bottom-10 right-[28%] w-7 h-7 text-emerald-300 animate-orbit-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>

      <svg className="absolute top-1/2 right-8 w-6 h-6 text-violet-300 animate-float-y" style={{ animationDelay: '1.5s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>

      <svg className="absolute bottom-1/3 left-12 w-10 h-10 text-sky-300 animate-orbit" style={{ animationDelay: '3s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </svg>

      {/* Soft dot grid for texture */}
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />
    </div>
  );
}

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0);    // first question open by default

  return (
    <section
      aria-labelledby="faq-heading"
      className="relative overflow-hidden rounded-3xl border border-ink-200 bg-gradient-to-b from-white via-brand-50/50 to-white py-12 sm:py-16 px-4 sm:px-6"
    >
      <FloatingShapes />

      <div className="relative max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <span className="eyebrow inline-flex"><Sparkles size={11} className="text-accent-500" /> Need help?</span>
          <h2 id="faq-heading" className="font-display text-3xl sm:text-5xl font-semibold text-ink-900 mt-3 leading-[1.04] tracking-tightest">
            Frequently
            <br />
            <span className="font-serif italic font-medium text-accent-600">asked questions.</span>
          </h2>
          <p className="text-ink-500 mt-4 max-w-xl mx-auto leading-relaxed">
            Quick answers about booking, payments, plans and more. Can't find yours? Open the chat in the bottom-right corner.
          </p>
        </header>

        <ul className="space-y-3">
          {FAQS.map((f, i) => {
            const open = openIdx === i;
            return (
              <li key={i}
                  className={`rounded-2xl border bg-white/80 backdrop-blur-sm transition-all duration-300
                              ${open
                                ? 'border-brand-300 shadow-[0_18px_40px_-22px_rgba(99,102,241,0.45)]'
                                : 'border-ink-150 border-ink-200 hover:border-brand-200 hover:shadow-md'}`}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? -1 : i)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left group"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-full grid place-items-center flex-shrink-0 transition
                                  ${open ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-100'}`}
                      aria-hidden="true"
                    >
                      <HelpCircle size={16} />
                    </span>
                    <span className={`font-semibold text-base sm:text-lg ${open ? 'text-ink-900' : 'text-ink-800'}`}>
                      {f.q}
                    </span>
                  </span>
                  <ChevronDown
                    size={20}
                    className={`flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-brand-600' : 'text-ink-400 group-hover:text-ink-700'}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 pl-16 text-ink-600 leading-relaxed text-[15px]">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>

        <div className="text-center mt-10">
          <p className="text-sm text-ink-500">
            Still need help? <a href="#" onClick={(e) => { e.preventDefault(); document.querySelector('[aria-label="Notifications"]')?.focus(); }} className="text-brand-600 font-semibold hover:underline">Open chat</a> at the bottom-right or email <span className="font-medium text-ink-700">support@schedula.app</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
