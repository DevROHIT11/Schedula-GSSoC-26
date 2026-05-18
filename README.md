# Schedula

**Booking a service shouldn't take five emails and a phone call.**

Schedula is a simple appointment booking app built for the **Odoo x VIT Hackathon 2026**. You can use it to find a service, see open time slots, and book in under a minute. It works for doctors, gyms, therapy, events, mock interviews, and online sessions — all in one app.

It's not just a calendar with a pay button. Customers, organisers, and admins each get their own pages. Bookings are safe even when many people book at the same time. Payments are checked on the server. Discounts, credits, and plans all add up correctly to the final price.

<p align="center">
  <img src="./assets/Homepage.png"  />
</p>

---

## Watch it before you read it

Two short videos. These are the fastest way to see what we built.

> ### 📺 Demo / solution walkthrough
> **<https://drive.google.com/file/d/1t904ag11pgaV6CiDPxbMl0djOYP5WqXm/view?usp=drive_link>**
>
> A quick walk through the booking flow: pick a service, pick a slot, pay, confirm, and review.

> ### 📺 Schedula platform walkthrough
> **<https://drive.google.com/file/d/16iv33VRchUstvMA7w2nEdvjQM2TFTmdE/view?usp=sharing>**
>
> The full app tour — customer dashboard, organiser side, admin dashboard, feedback page, and the plan system.

---

## Why we built it this way

Most booking apps we tried as students did one of two things badly:

1. **They lied about open slots.** Slots looked free, then someone had to "confirm" them by email later.
2. **They hid the cost.** Fees showed up only after you typed your phone number. Rescheduling needed a phone call.

So we set three simple rules for Schedula:

- **What you see is what you can book.** The grid only shows slots you can actually take. Booked slots are hidden, not greyed out. Colours are honest: 🟢 free, ⚫ picked, 🟡 only for premium plans.
- **The price is honest from the start.** Subtotal, tax, discount, credits, and total are all visible at the Details step. No surprises later.
- **You can change your mind.** Cancel a booking and credits come back. Reschedule and the new slot is checked again. You can edit your profile, photo, and reviews any time.

---

## What's inside

### Three types of users

| User | What they do |
|---|---|
| **Customer** | Find services, book in 7 steps, pay, reschedule, cancel, leave reviews, manage credits and plan, save favourites |
| **Organiser** | Add services, set weekly hours or flexible windows, set capacity and rules, see their booking calendar, manage video meeting links |
| **Admin** | See platform stats (14-day trends, peak hours, top categories, top providers), manage users, read all customer feedback |

### The booking flow

```
Service → Provider → Date → Slot → Details → Payment → Confirmation
```

- Slots come from a weekly schedule (the same hours every week) or flexible windows (specific dates) — never both at once
- Slots respect the buffer time, group capacity, blocked dates, and the user's plan (Silver: book within 14 days, Gold: 30 days, Platinum: any time)
- When you book, the database locks the slot row so two people can't grab the same time at the same moment
- Reschedules use the same lock. Cancellation puts your credits back automatically.

### Pricing (every part is clear)

- **Discount codes** — percent off or flat amount. Can have a minimum order, an expiry date, and a usage limit.
- **GST** — only added when the subtotal goes above a set amount for the service
- **Schedula credits** — 1 credit = ₹1. You earn 5% on every paid booking (2x if you're Gold, 5x if Platinum). You can use credits for up to half the order. They expire after 90 days.
- **Plans** — Silver (free), Gold (₹299/month), Platinum (₹799/month). Plans give priority slots, a longer booking window, free reschedules, and bigger credit rewards.

The math is fixed: `subtotal − discount + tax − credits = total`. Same every time.

### Payments

- Out of the box, the app runs in **demo mode**. The full flow works, but no real money moves. The screen shows a yellow "Demo" pill.
- To go live, just put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env` and restart. The same flow now uses real Razorpay checkout (Card, UPI, Net Banking, Wallets).
- The server checks every payment with a secure signature. A booking is **never** marked paid unless this check passes. Full setup steps are in [`RAZORPAY_SETUP.md`](./RAZORPAY_SETUP.md).
- A UPI QR option is always there too — scan with any UPI app and the booking gets confirmed.

### Feedback you can actually see

When you submit a review:

- It shows up in **your profile** under "My feedback". You can sort by latest or highest rating, and click through to the service or booking.
- It shows up in the **admin feedback page** — every review on the platform, with stars, customer name, comment, and the booking it came from. Admins can sort it too.
- It updates the **service's average star rating** right away.

The review form lives on the booking confirmation page. Once your booking is marked completed, a "Leave review" button appears.

### Profiles you can edit

- Edit your name, phone (with OTP check), and photo
- **Profile photo upload** — click your avatar, pick an image (under 4 MB, common image formats). The image is saved in the database, so no extra file storage is needed.
- Sections for upcoming bookings, past bookings, your feedback, and credits balance — all update live

### Service catalogue

- Six categories: Healthcare, Sports, Counseling, Events, Interviews, Services
- Filter by category, search text, country / state / city, type (in-person or online), and max price
- "Near me" uses your location to pick the closest city
- Personal recommendations — top-rated near your city, or top-rated overall

### Appointment types

- **In-person** — has a venue and city
- **Online** — gets its own meeting link (Jitsi by default; works with the organiser's Meet/Zoom link too). The "Join meeting" button turns on 5 minutes before the start time.

### Sign-in (safe by default)

- Email + password with a 6-digit code sent by email
- Phone OTP for SMS reminders (logged on the server in demo mode)
- "Forgot password" reset via a one-time email link
- Forgot-password and similar pages always say the same thing, so no one can guess if an email exists
- JWT for sessions, bcrypt for passwords

### UI (recently redesigned)

- Clean modern look — Plus Jakarta Sans for headings, Fraunces italic for accents, Inter for the body
- Warm cream background, refined indigo brand colour, warm coral for highlights, sage green for success
- Cards with image on top and white panel below — inspired by Mobbin. Booking flow polish — inspired by SimplyBook.
- Smooth page transitions, scrolling carousel for recommended services, animated FAQ
- Admin dashboard with simple charts (area, bar, pie)
- Three languages — English, Hindi, Marathi
- AI chat bubble on every signed-in page
- Mobile bottom navigation, sidebar, blurred top bar

### Notifications

- Bell icon with unread count, refreshed every 30 seconds, dismissable
- Email when a booking is created, rescheduled, cancelled, or paid

### Locations

- Full Country → State → District → City data for India
- "Nearest city" lookup using your latitude and longitude

---

## Tech used

**Frontend**
React 18, Vite, React Router, Tailwind CSS, Framer Motion, Recharts, Lucide icons

**Backend**
Node.js, Express, MySQL 8, mysql2, bcryptjs, jsonwebtoken, multer, nodemailer, razorpay

**Database**
MySQL 8 with foreign keys, named indexes, and a migrations folder

---

## Setup

You'll need: **Node 18+**, **MySQL 8** running on your machine, and a terminal.

### 1. MySQL

Install MySQL 8 (default user: `root`, no password). The setup script will create the `appointment_app` database and add demo data.

### 2. Backend

```bash
cd backend
cp .env.example .env       # change DB details if needed
npm install
npm run db:init            # runs schema.sql + seed.sql
npm run dev                # http://localhost:4000
```

If your DB already exists and you just want to apply the latest change (the `avatar_url` column we added):

```bash
mysql appointment_app < db/migrations/001_add_avatar_url.sql
```

## Email / OTP Configuration

Schedula supports real OTP email delivery using Gmail SMTP or Brevo SMTP.

By default, the application may use a development mail service (Ethereal) when SMTP credentials are not configured. This is useful for local testing but does not deliver emails to real inboxes.

To enable real OTP verification emails:

### Gmail SMTP Setup

1. Enable **2-Step Verification** on your Gmail account
2. Generate a **Google App Password**
3. Add these values to `backend/.env`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
```

> ⚠️ If SMTP credentials are not configured, Schedula falls back to a development mail service (Ethereal/mock SMTP). Emails may appear as "sent" in backend logs but will not arrive in real inboxes.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The frontend sends `/api/*` calls to the backend at port 4000. No CORS setup needed.

### Demo accounts

Password for all of them: `password123`.

| Email | Role | Notes |
|---|---|---|
| `admin@app.com` | admin | full access |
| `organiser@app.com` | organiser | owns Dental, Yoga, Hair & Beauty |
| `watson@app.com` | organiser | owns Therapy, Mock Interview |
| `maria@app.com` | organiser | owns Personal Training, Photo Studio |
| `customer@app.com` | customer | Gold plan, 700 credits |
| `akash@app.com` | customer | 100 credits, no plan |

---

---

## Contribution & Community Guidelines

Before contributing to the project, please make sure to read:

- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution workflow, issue rules, PR guidelines, coding standards, and contributor instructions.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — Community guidelines and expected behavior for all participants and contributors.

Following these guidelines helps maintain a healthy, organized, and beginner-friendly open-source environment.

---

## Folder structure

```
backend/
  db/
    schema.sql              # full database schema
    seed.sql                # demo data
    migrations/
      001_add_avatar_url.sql
  scripts/
    seedLarge.js            # adds 200+ services for testing
    trimServices.js
    fixMeetingLinks.js
  src/
    config/db.js
    controllers/            # auth, services, bookings, payment, admin,
                            # categories, locations, subscriptions, credits,
                            # discounts, notifications, chat, upload, saved
    services/               # slot logic, booking logic, reminders, mailer
    middlewares/            # auth, error handling, file upload
    routes/                 # one file per resource
    utils/
    server.js

frontend/
  src/
    api/client.js           # small fetch wrapper
    components/             # Layout, Calendar, ServiceCard, ChatbotWidget,
                            # AuthShell, ImageUploader, SearchAutocomplete,
                            # MobileBottomNav, FaqSection, Toast, Field, etc.
    context/AuthContext.jsx
    data/categories.js
    pages/                  # Login, Register, Dashboard, BookingFlow, Payment,
                            # Profile, Plans, Saved, Admin, Organiser, etc.
    styles/category.css
    utils/                  # format, validators, razorpay helper
    styles.css              # Tailwind base + design tokens
    App.jsx, main.jsx
  tailwind.config.js
  postcss.config.js
  index.html
```

---

## Main API routes

### Auth (`/api/auth`)
`POST /register`, `POST /verify-otp`, `POST /resend-otp`, `POST /login`
`POST /forgot`, `POST /reset`, `GET /me`, `PUT /me` (now accepts `avatar_url`)
`POST /phone/send-otp`, `POST /phone/verify-otp`

### Services (`/api/services`)
`GET /` (with filters), `GET /search`, `GET /recommended`
`GET /reviews/mine?sort=latest|highest` *(new — your own reviews)*
`GET /:id`, `GET /:id/slots?date=&resource_id=`, `GET /share/:token`, `POST /:id/review`

**For organisers:** `GET /mine/list`, `POST /`, `PUT /:id`, `DELETE /:id`, `PUT /:id/publish`,
`POST /:id/resources`, `DELETE /:id/resources/:rid`, `PUT /:id/weekly`, `PUT /:id/flexible`,
`PUT /:id/questions`, `PUT /:id/calendar-notes`, `GET /:id/calendar`, `GET /:id/bookings`

### Bookings (`/api/bookings`)
`GET /mine`, `GET /:id`, `POST /` (with discount, credits, purpose),
`POST /:id/reschedule`, `POST /:id/cancel`, `POST /:id/confirm` (organiser)

### Payment (`/api/payment`)
`GET /config`, `POST /create-order`, `POST /verify`, `POST /fail`, `POST /upi-confirm`

### Plans / Credits / Discounts
`GET /api/subscriptions/plans`, `GET /api/subscriptions/mine`,
`POST /api/subscriptions/subscribe`, `POST /api/subscriptions/cancel`
`GET /api/credits/me`, `POST /api/credits/grant` (admin)
`GET /api/discounts`, `POST /api/discounts/validate`

### Categories / Locations / Saved
`GET /api/categories`
`GET /api/locations`, `GET /api/locations/search?q=`, `GET /api/locations/nearest?lat=&lng=`
`GET /api/saved`, `GET /api/saved/ids`, `POST /api/saved/:serviceId`, `DELETE /api/saved/:serviceId`

### Notifications / Chat / Uploads
`GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`,
`DELETE /api/notifications`, `DELETE /api/notifications/:id`
`GET /api/chat/history`, `POST /api/chat/send`
`POST /api/uploads` (image, ≤ 4 MB), `GET /uploads/:filename`

### Admin (`/api/admin`)
`GET /dashboard` (stats, 14-day trend, peak hours, category pie, top providers)
`GET /users`, `PUT /users/:id/active`, `PUT /users/:id/role`
`GET /reviews?sort=latest|highest&service_id=&limit=` *(new — full feedback feed)*
`GET /reports`

---

## Things we're proud of

- **No double-bookings.** Every booking happens inside a database lock. Two people tapping the same slot at the same moment will see one win and one error — never two confirmed bookings for the same time.
- **Honest slot grid.** A slot shows up only if you can book it now, or unlock it with a plan upgrade. Booked, blocked, or out-of-window slots are hidden — not greyed out. The colour legend is right there in the UI.
- **Safe payments.** Even in demo mode, the steps are the same as live (`create-order → checkout → verify`). The signature check is the only way a booking gets marked paid. Cancelled payments call `payment/fail` so we don't leave junk rows behind.
- **Feedback that actually shows up.** A review you leave on the confirmation page appears in your profile, in the admin feedback page, and updates the service's stars — all in real time.
- **Three languages, no extra library.** English, Hindi, and Marathi switch from one place. We wrote a small `useTranslation()` hook instead of pulling in a big i18n package.
- **Design system that pays off.** Custom Tailwind tokens (`ink`, `brand`, `accent`, `sage`), reusable classes (`.card`, `.btn-primary`, `.eyebrow`, `.section-title`), Plus Jakarta + Fraunces fonts. Every page uses the same set of building blocks, so nothing feels random.

---

## What we'd add next

- A real reminder pipeline (right now SMS is logged, not sent)
- Calendar export — push bookings to Google Calendar / Apple Calendar
- One-to-one messaging between customer and organiser
- Heatmap of availability on the organiser dashboard
- A second tax mode (per-line item) for services that mix taxable and non-taxable parts

---

## Built with care for the Odoo x VIT Hackathon 2026

Made by a team that got tired of phone-confirming dentist appointments. If you find a bug, treat it as feedback — open the chat, leave a review, or send a fix.
