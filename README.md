# Schedula

**Booking a service shouldn't take five emails and a phone call.**

Schedula is a simple appointment booking app built for the **Odoo x VIT Hackathon 2026**. You can use it to find a service, see open time slots, and book in under a minute. It works for doctors, gyms, therapy, events, mock interviews, and online sessions — all in one app.

It's not just a calendar with a pay button. Customers, organisers, and admins each get their own pages. Bookings are safe even when many people book at the same time. Payments are checked on the server. Discounts, credits, and plans all add up correctly to the final price.


---

## 📺 Watch it before you read it

Two short videos. These are the fastest way to see what we built.

> ### Demo / Solution Walkthrough
> **[Watch Video](https://drive.google.com/file/d/1t904ag11pgaV6CiDPxbMl0djOYP5WqXm/view?usp=drive_link)**
> 
> A quick walk through the booking flow: pick a service, pick a slot, pay, confirm, and review.

> ### Schedula Platform Walkthrough
> **[Watch Video](https://drive.google.com/file/d/16iv33VRchUstvMA7w2nEdvjQM2TFTmdE/view?usp=sharing)**
> 
> The full app tour — customer dashboard, organiser side, admin dashboard, feedback page, and the plan system.

---

## 🎯 Why we built it this way

Most booking apps we tried as students did one of two things badly:
1. **They lied about open slots:** Slots looked free, then someone had to "confirm" them by email later.
2. **They hid the cost:** Fees showed up only after you typed your phone number. Rescheduling needed a phone call.

So we set three simple rules for Schedula:
*   **What you see is what you can book:** The grid only shows slots you can actually take. Booked slots are hidden, not greyed out. Colours are honest: 🟢 free, ⚫ picked, 🟡 only for premium plans.
*   **The price is honest from the start:** Subtotal, tax, discount, credits, and total are all visible at the Details step. No surprises later.
*   **You can change your mind:** Cancel a booking and credits come back. Reschedule and the new slot is checked again. You can edit your profile, photo, and reviews any time.

---

## 📦 What's inside

### Three types of users

| User | What they do |
| :--- | :--- |
| **Customer** | Find services, book in 7 steps, pay, reschedule, cancel, leave reviews, manage credits and plan, save favourites |
| **Organiser** | Add services, set weekly hours or flexible windows, set capacity and rules, see their booking calendar, manage video meeting links |
| **Admin** | See platform stats (14-day trends, peak hours, top categories, top providers), manage users, read all customer feedback |

### The booking flow
text
Service  ➔  Provider  ➔  Date  ➔  Slot  ➔  Details  ➔  Payment  ➔  Confirmation
---
---
Slot Resolution: Slots come from a weekly schedule (the same hours every week) or flexible windows (specific dates) — never both at once.

Constraints: Slots respect buffer times, group capacity, blocked dates, and the user's tier constraints (Silver: book within 14 days, Gold: 30 days, Platinum: any time).

Concurrency Controls: When you book, the database locks the slot row natively so two people cannot grab the same time at the same moment.

State Management: Reschedules use the same lock. Cancellations revert credits automatically.
---

## Feature Deep Dive

⚡ 1. Real-Time Interactions (Socket.io)
Live Booking Ticker for Organisers: Organisers receive instant pop-up alerts and sound notifications the millisecond a slot is booked, eliminating the need for page reloads.

In-App Chat Engine: Secure, real-time 1-on-1 chat routing between customers and organisers to discuss booking specifics pre- or post-appointment.
---

🛠️ 2. Automated Communication Pipeline
Multi-Channel Messaging Alerts: Integrates with Twilio and Indian communication gateways (Kaleyra/Exotel) to pipe production-grade booking slips, updates, and links directly via WhatsApp & SMS.

Calendar Synchronization: One-click native ecosystem alignment using ical-generator and Google Calendar API integrations directly from the booking confirmation shell.
---

📊 3. Advanced Analytics & Dynamic Pricing
Availability Heatmap: A visual matrix layout that processes platform data to expose peak usage frequencies, allowing organisers to pinpoint their busiest windows at a glance.

Demand-Based Dynamic Pricing: Integrated surge pricing algorithms that automatically recalibrate active base rates during high-traffic intervals (e.g., weekend evenings).

🧠 4. Smart AI Capabilities
AI-Powered Slot Finder: Deep natural language parser processing statements like "Book me an interview with Dr. Watson tomorrow evening" to autonomously query available backend slots and deliver actionable reservation elements.

Predictive Recommendations: ML-driven matching nodes that trace user booking histories and regional demands to present customized service recommendation carousels.
---

🌍 5. Localization & Accessibility (UI/UX)
Voice-Based Conversational Search: In-app voice recognition framework mapping user speech inputs (e.g., "Dentist near me") directly to active multi-tier metadata filters.

Zero-Dependency Multi-lingual Context: Localized state hooks driving dynamic Marathi, Hindi, and English variants on-the-fly without pulling heavy package payloads.

Dynamic Dark Mode: Fluid interface skin adaptation using Tailwind CSS media tokens to enhance visual comfort and platform accessibility.
---

🔒 6. Enterprise Multi-Tenant Staff Management
Sub-Resource Assignment: Organisers can create sub-merchant structures to map internal staff assets (e.g., specific gym trainers, medical practitioners, or consultants) to distinct independent operational calendars.

---


🛠️ Tech Used
Frontend

React 18, Vite, React Router

Tailwind CSS, Framer Motion

Recharts, Lucide Icons

Socket.io-client

Backend

Node.js, Express

MySQL 8, mysql2 driver

Socket.io (WebSocket framework)

bcryptjs, jsonwebtoken

Multer, Nodemailer, Razorpay SDK

Database

Relational schema built using MySQL 8 with hard foreign key constraints, explicit execution indexing, and an execution-ready migration runner.
---


🚀 Setup
You will need Node 18+, MySQL 8 running locally, and a terminal environment.

1. Database Provisioning
Configure your local MySQL instance (Default user: root, no password). The automated initializer will provision the appointment_app cluster and inject seeding mocks.

2. Backend Initialization

       cd backend
       cp .env.example .env       # Tweak custom DB ports/credentials here
       npm install
       npm run db:init            # Executes full schema.sql + seed.sql configuration
       npm run dev                # Running on http://localhost:4000

Note: To apply a manual atomic delta update to an existing cluster without full re-seeding:

     mysql appointment_app < db/migrations/001_add_avatar_url.sql



3. Frontend Execution

        cd frontend
        npm install
        npm run dev                # Running on http://localhost:5173


Proxy details: Vite is pre-configured to forward all /api/* context traffic directly to upstream port 4000. No manual CORS setup required.


## 🔑 Test Accounts & Demo Profiles

     Platform ke roles, capabilities aur workflows ko check karne ke liye is master credential table ka use karein. Sabhi seed environments aur test containers mein default security layer        embedded hai.

### Master Authentication Key
> ⚠️ **Development Warning**: Sabhi predefined seed accounts aur test profiles ka access password neeche diya gaya hai:
> * **Master Password**: `password123`

### Profile Matrix & Roles


| Email Address | System Role | Contextual Profile Setup & Scope |
| :--- | :--- | :--- |
| `admin@app.com` | **Admin** | Full platform observation rights, global logs access, metrics view. |
| `organiser@app.com` | **Organiser** | Contextual ownership of **Dental Clinics**, **Yoga Studios**, **Hair & Beauty**. |
| `watson@app.com` | **Organiser** | Contextual ownership of **Therapy Practices**, **Mock Interviews**. |
| `maria@app.com` | **Organiser** | Contextual ownership of **Personal Training**, **Photo Studios**. |
| `customer@app.com` | **Customer** | Premium user; **Gold-tier** subscription profile with **700 accumulated credits**. |
| `akash@app.com` | **Customer** | Standard user; **Base-tier** profile with **100 credits** and no active plan. |

---

## ⚡ Quick Testing Guide

1. **Multi-Tenant Staff Access Isolation**: 
   * `organiser@app.com` se login karke ek dynamic yoga slot create karein.
   * `customer@app.com` profile se use book karein aur check karein ki socket ticker trigger hota hai ya nahi.
2. **Surge Pricing Verification**:
   * Peak hour durations (jaise kal shaam ka slot) par booking check karein.
   * System backend `customer@app.com` aur `akash@app.com` ke active credit values ke mutabik dynamic balances modify karega.


🧭 Main API Routes  Authentication (/api/auth) POST /register | POST /verify-otp | POST /resend-otp | POST /login

    POST /forgot | POST /reset | GET /me | PUT /me (profile adjustments)

    POST /phone/send-otp | POST /phone/verify-otp

   Services Engine (/api/services)
   GET / (filtered pagination searches) | GET /search | GET /recommended

      GET /reviews/mine?sort=latest|highest (historical review trace updates)

      GET /:id | GET /:id/slots?date=&resource_id= | GET /share/:token | POST /:id/review

      Organiser Endpoints: GET /mine/list | POST / | PUT /:id | DELETE /:id | PUT /:id/publish | POST /:id/resources | PUT /:id/weekly | PUT /:id/flexible | GET /:id/calendar

  Booking Lifecycle (/api/bookings)
       GET /mine | GET /:id | POST / (handles real-time credit matching, promo verification)

        POST /:id/reschedule | POST /:id/cancel | POST /:id/confirm

 Financials & System Management (/api/payment & /api/admin)
      POST /create-order | POST /verify | POST /upi-confirm

      GET /api/subscriptions/plans | POST /api/discounts/validate

      GET /api/admin/dashboard (Aggregated 14-day trends, peak heatmaps, provider distribution matrices)


---

🔥 Key Engineering Highlights
    Race-Condition Immunity: Slot reservations utilize explicit transactional row locking (FOR UPDATE mechanics under the hood). If two distinct consumers make concurrent hits on the exact     same micro-slot timeline, the engine forces serial evaluation—eliminating accidental double-booking states.

  Cryptographic Settlement Audits: Financial integrity doesn't break down in demo or live variants. Payments rely on strict state checks verified using server-evaluated hash matching via      HMAC SHA256 signatures before confirming downstream booking logs.

  Bi-Directional WebSocket Pipeline: Leverages an active Socket.io architecture to maintain low-latency connections, powering the real-time chat grid and immediate admin/organiser ticker   distribution without REST polling overhead.
  
---

🤝 Contribution & Community Guidelines
Before contributing to the project, please ensure you review:

CONTRIBUTING.md — Contribution workflow, pull request guidelines, and programming code conventions.

CODE_OF_CONDUCT.md — Expected community engagement and behavioral parameters.

Built with dedication for the Odoo x VIT Hackathon 2026 ✨