# Razorpay setup — step-by-step

The platform ships with two payment paths:

- **Mock / demo mode** — runs out of the box, no keys needed. Real bookings flow end-to-end but no real charge happens. The Payment screen shows a yellow "Test / Demo mode" pill.
- **Live mode** — uses Razorpay's real checkout (Card, UPI, Net Banking, Wallets). Activates the moment you put real keys in `backend/.env` and restart the server.

Follow the steps below to flip from mock → live.

---

## 1 · Create a Razorpay account

1. Go to <https://dashboard.razorpay.com/signup>.
2. Sign up with your business email. You can fill business details later.
3. After sign-in, you'll land on the **Razorpay Dashboard**.

> **Important:** new accounts start in **Test Mode** by default. Test keys still let you run the full real Razorpay checkout — they only differ in that no actual money moves and you must use the published Razorpay test cards/UPI handles.

---

## 2 · Generate your API keys

1. In the dashboard sidebar, click **Settings** → **API Keys**.
   Direct link: <https://dashboard.razorpay.com/app/keys>.
2. Click **Generate Test Key** (top-right).
3. Razorpay will show **Key ID** (starts with `rzp_test_…`) and **Key Secret** *exactly once*. Copy both immediately. You'll never see the secret again — you'd have to regenerate.
4. Optional: click **Download Keys** to save a `.txt` for safekeeping.

When you're ready to go live, repeat the same steps in **Live Mode** to get `rzp_live_…` keys.

---

## 3 · Wire the keys into the backend

Open `backend/.env` (create it from `backend/.env.example` if it doesn't exist):

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
```

Restart the backend:

```bash
cd backend
npm run dev          # nodemon picks up .env automatically
```

You should see this in the server log on boot:

```
[razorpay] LIVE mode — using key rzp_test_xxx…
```

(If you see `MOCK mode`, the keys aren't being read — double-check spelling, no quotes around values, and that you restarted the process.)

---

## 4 · Test it

1. Visit the app, sign in, pick any service that has **Advance payment required** (e.g. *Therapy Session*, *Mock Interview*, *Photo Studio Session*) and complete the booking flow.
2. On the Payment step you'll see a **green "Live mode"** pill instead of the yellow demo banner.
3. Click **Pay …** — the official Razorpay modal opens.
4. Use a Razorpay test instrument:

   | Method | Value |
   |---|---|
   | Card | `4111 1111 1111 1111`, any future expiry, any CVV |
   | UPI  | `success@razorpay` (always succeeds) |
   | UPI (failure path) | `failure@razorpay` |
   | Net Banking | pick any bank, click "Success" on the simulator |

5. After success the modal closes, the frontend calls `POST /api/payment/verify`, the booking flips to **confirmed**, and you're redirected to the booking detail. You'll also see `+credits` rewarded in the topbar.

A failed/cancelled payment lands back on the Payment screen with a clear error message and the booking remains `pending`, so you can retry.

---

## 5 · Verify on the dashboard

Razorpay Dashboard → **Transactions** → **Orders** / **Payments**:

- You'll see the order that was created (matching `razorpay_order_id` in your DB's `payments` table).
- Successful payments show under Payments with the captured amount.

---

## 6 · Going to production

When you're ready for real money:

1. Complete **KYC** in the Razorpay dashboard (PAN, bank account, address proof). Required by RBI.
2. Once activated, switch the dashboard to **Live Mode** (top-right toggle) and generate **Live API Keys**.
3. Replace `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `backend/.env` with the `rzp_live_…` pair.
4. Restart the backend. The server log should print `[razorpay] LIVE mode — using key rzp_live_…`.

> Treat the **secret** like a database password — never commit it, never log it, rotate it if leaked. The frontend only ever receives the `key_id` (public) via the `/api/payment/create-order` response — the secret stays on the server.

---

## How the integration is wired

| Step | Endpoint | Purpose |
|---|---|---|
| 1 | `GET /api/payment/config` | Frontend probe: are we in live or mock mode? |
| 2 | `POST /api/payment/create-order` | Creates a Razorpay order (live SDK) or a mock order. Stores a `pending` row in `payments` keyed by `razorpay_order_id`. |
| 3 | Razorpay Checkout (browser) | User pays. On success Razorpay returns `{razorpay_payment_id, razorpay_order_id, razorpay_signature}`. |
| 4 | `POST /api/payment/verify` | Backend HMAC-SHA256 verifies the signature with `KEY_SECRET`, marks the payment success, flips the booking to `confirmed`, awards 5 % credits, fires a notification. |
| 5 | `POST /api/payment/fail` | Idempotent — called when the user dismisses the modal so the orphaned pending row is cleaned up. |

Verification logic (`backend/src/controllers/paymentController.js`):

```js
const expected = crypto
  .createHmac('sha256', KEY_SECRET)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');
verified = safeTimingEq(expected, razorpay_signature);
```

A booking is **never** marked `paid` unless this check passes — there is no other code path that flips `payment_status` for a Razorpay order.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Server logs `[razorpay] MOCK mode` even after putting keys in `.env` | `.env` lives in **`backend/.env`** (not project root). Restart the backend after editing. Make sure there are no quotes around the values. |
| Modal opens but immediately errors "Bad request" | The `key_id` and `key_secret` belong to different accounts/modes. Re-generate as a single pair from one mode. |
| Modal opens, payment succeeds, but the app says "Order not found" | The browser is hitting a different backend than the one that created the order (e.g. you have two backends running). Kill all `node` processes and start fresh. |
| `Signature verification failed` after a successful payment | The `KEY_SECRET` in `.env` doesn't match the key that was used to create the order. Regenerate keys, restart, retry. |
| Razorpay checkout doesn't load (white screen) | Browser blocked the script. Allowlist `checkout.razorpay.com` in any ad-blocker / privacy extension. |
| "User cancelled" toast every time | The modal's `ondismiss` is firing — user is closing the modal before paying. Expected behavior; the booking stays `pending` and can be paid again from `Profile → Pay now`. |

---

## Summary

```
┌─ Mock (default) ──────────────┐    ┌─ Live ──────────────────────────┐
│ keys blank in .env            │    │ rzp_test_… or rzp_live_… in .env │
│ "Test / Demo mode" pill       │ →  │ "Live mode" pill                 │
│ no real charge                │    │ real Razorpay checkout           │
│ booking still flows correctly │    │ HMAC-verified payment            │
└───────────────────────────────┘    └──────────────────────────────────┘
```

That's it — drop the keys, restart, you're live.
