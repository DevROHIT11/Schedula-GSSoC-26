// Procedural seed: ~700 services + 100 providers + ~250 bookings.
// Idempotent — run only once after `npm run db:init`. Inserts skip names
// that already exist, so re-running won't duplicate rows.
//
// Usage: node scripts/seedLarge.js  (or `npm run db:seed-large`)

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const pool = require('../src/config/db');

// Per-category service templates — names chosen to be unique to each
// category (no overlap across domains).
const CATEGORY_TEMPLATES = {
  healthcare: {
    nouns: ['Doctor Consultation','Dental Cleaning','Physiotherapy','Cardiology Checkup','Dermatology Visit','ENT Consultation','Eye Test','Pediatric Visit','Orthopedic Review','Diabetes Screening','Blood Test Panel','Vaccination','Health Check Plus','Allergy Test','Prenatal Visit','Geriatric Care','Mental Health Screening','Nutrition Plan'],
    appt: 'in_person',
    images: [
      'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80&auto=format&fit=crop',
    ],
    price: [400, 2500],
    duration: [15, 30, 45, 60],
  },
  sports: {
    nouns: ['Personal Training','Yoga Flow','HIIT Session','Pilates Class','Boxing Coaching','Swimming Lesson','Cricket Coaching','Football Drill','Badminton Session','Tennis Coaching','CrossFit Floor','Running Coaching','Strength Camp','Mobility Class','Dance Fitness','Marathon Prep','Cycling Group','Calisthenics'],
    appt: 'in_person',
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80&auto=format&fit=crop',
    ],
    price: [300, 2000],
    duration: [30, 45, 60, 90],
  },
  counseling: {
    nouns: ['Therapy Session','Couples Counseling','Family Counseling','Stress Management','Anxiety Support','Grief Counseling','Career Counseling','Addiction Counseling','Sleep Therapy','Mindfulness Session','Trauma Care','Adolescent Therapy','Relationship Coaching'],
    appt: 'in_person',
    images: [
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=900&q=80&auto=format&fit=crop',
    ],
    price: [800, 3000],
    duration: [45, 60, 75],
  },
  events: {
    nouns: ['Photo Studio','Wedding Photography','Product Shoot','Event Videography','Birthday Setup','Corporate Event','Live Music','DJ Booking','Sound Engineer','Stage Setup','Catering Tasting','Venue Booking','Decor Consultation'],
    appt: 'in_person',
    images: [
      'https://images.unsplash.com/photo-1470114716159-e389f8712fda?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80&auto=format&fit=crop',
    ],
    price: [1500, 8000],
    duration: [60, 90, 120, 180],
  },
  interviews: {
    nouns: ['Mock Interview - SDE','Mock Interview - PM','Mock Interview - Data','Mock Interview - Design','Resume Review','LinkedIn Audit','Salary Negotiation','Behavioral Coaching','System Design Drill','Algorithms Coaching','Case Interview','Career Roadmap','HR Round Prep'],
    appt: 'virtual',
    images: [
      'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80&auto=format&fit=crop',
    ],
    price: [1200, 4000],
    duration: [45, 60, 90],
  },
  services: {
    nouns: ['Hair & Beauty','Manicure & Pedicure','Massage Therapy','Spa Package','AC Repair','Refrigerator Repair','Plumbing Visit','Electrician Visit','Carpentry Service','House Cleaning','Pest Control','Car Wash','Bike Service','Gardening','Painting Quote','Locksmith','Laundry Pickup'],
    appt: 'in_person',
    images: [
      'https://images.unsplash.com/photo-1562280963-8a5475740a10?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=900&q=80&auto=format&fit=crop',
    ],
    price: [200, 3000],
    duration: [30, 45, 60, 90],
  },
  virtual: {
    nouns: ['Online Tutoring','Spoken English','Coding Class','Music Lesson','Art Class','Language Class','Yoga Online','Dance Online','Public Speaking','Soft Skills Workshop','Interview Bootcamp','Astrology Call','Tarot Reading','Vastu Consultation'],
    appt: 'virtual',
    images: [
      'https://images.unsplash.com/photo-1610484826917-0f101a7c6c93?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&q=80&auto=format&fit=crop',
    ],
    price: [199, 1500],
    duration: [30, 45, 60],
  },
};

const ADJECTIVES = ['Premium','Express','Elite','Quick','Classic','Pro','Signature','Trusted','Modern','Daily','Smart','Curated','Essential','Plus','Advanced'];
const CITIES = [
  ['Maharashtra','Pune','Pune'],
  ['Maharashtra','Mumbai','Mumbai'],
  ['Karnataka','Bengaluru','Bengaluru'],
  ['Tamil Nadu','Chennai','Chennai'],
  ['Delhi','New Delhi','New Delhi'],
  ['Gujarat','Ahmedabad','Ahmedabad'],
  ['Telangana','Hyderabad','Hyderabad'],
];

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const tok = () => crypto.randomBytes(8).toString('hex');

async function loadCategories() {
  const [rows] = await pool.query('SELECT id, `key` FROM service_categories');
  return Object.fromEntries(rows.map((r) => [r.key, r.id]));
}

async function loadOrganisers() {
  const [rows] = await pool.query("SELECT id FROM users WHERE role='organiser' AND is_active=1");
  if (!rows.length) throw new Error('No organisers found — run npm run db:init first.');
  return rows.map((r) => r.id);
}

async function existingNames() {
  const [rows] = await pool.query('SELECT name FROM services');
  return new Set(rows.map((r) => r.name));
}

async function seedServices(targetPerCategory = 100) {
  const cats = await loadCategories();
  const organisers = await loadOrganisers();
  const taken = await existingNames();
  let created = 0, skipped = 0;

  for (const [key, tpl] of Object.entries(CATEGORY_TEMPLATES)) {
    const catId = cats[key];
    if (!catId) { console.warn(`[seedLarge] missing category "${key}", skipping`); continue; }

    for (let i = 0; i < targetPerCategory; i++) {
      const baseNoun = tpl.nouns[i % tpl.nouns.length];
      const name = `${pick(ADJECTIVES)} ${baseNoun} #${i + 1}`;
      if (taken.has(name)) { skipped++; continue; }
      taken.add(name);

      const [state, district, city] = pick(CITIES);
      const venue = tpl.appt === 'virtual' ? 'Online' : `${baseNoun} Center, ${city}`;
      const provider = tpl.appt === 'virtual' ? pick(['google_meet', 'zoom']) : 'none';
      const price = rand(tpl.price[0], tpl.price[1]);
      const duration = pick(tpl.duration);
      const buffer = pick([0, 5, 10, 15]);
      const manageCap = Math.random() < 0.2 ? 1 : 0;
      const maxSlot = manageCap ? rand(2, 12) : 1;
      const advance = Math.random() < 0.4 ? 1 : 0;
      const manual = Math.random() < 0.15 ? 1 : 0;
      const rating = (4 + Math.random()).toFixed(2);
      const ratingCount = rand(5, 500);

      const [r] = await pool.query(
        `INSERT INTO services
           (organiser_id, category_id, name, description, image_url,
            duration_minutes, buffer_minutes, venue,
            appointment_type, virtual_provider, virtual_link,
            country, state, district, city,
            price, tax_percent, tax_threshold,
            manage_capacity, max_per_slot, group_booking,
            advance_payment, manual_confirmation,
            assignment_mode, schedule_type, resource_kind,
            is_published, share_token, rating, rating_count)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [pick(organisers), catId, name,
         `${name} — curated, professionally delivered. Auto-seeded for testing.`,
         pick(tpl.images),
         duration, buffer, venue,
         tpl.appt, provider, null,
         'India', tpl.appt === 'virtual' ? null : state,
                  tpl.appt === 'virtual' ? null : district,
                  tpl.appt === 'virtual' ? null : city,
         price, 0, 0,                 // tax_percent kept 0 — auto from category
         manageCap, maxSlot, manageCap,
         advance, manual,
         'auto', 'weekly', manageCap ? 'resource' : 'user',
         1, `tok_${tok()}`,
         rating, ratingCount]
      );
      const sid = r.insertId;

      // 1 provider per service.
      await pool.query(
        'INSERT INTO resources (service_id, name, user_id) VALUES (?,?,?)',
        [sid, `${baseNoun} Pro #${i + 1}`, manageCap ? null : pick(organisers)]);

      // Mon–Fri 9-18 weekly window.
      for (const dow of [1, 2, 3, 4, 5]) {
        await pool.query(
          'INSERT INTO weekly_schedules (service_id, day_of_week, start_time, end_time) VALUES (?,?,?,?)',
          [sid, dow, '09:00:00', '18:00:00']);
      }

      // Standard identity questions.
      const baseQs = [
        ['Full name',  'text',  1],
        ['Email',      'email', 1],
        ['Phone number','phone',1],
        ['Notes',      'textarea', 0],
      ];
      for (let j = 0; j < baseQs.length; j++) {
        await pool.query(
          'INSERT INTO booking_questions (service_id, question, field_type, is_required, sort_order, category) VALUES (?,?,?,?,?,?)',
          [sid, baseQs[j][0], baseQs[j][1], baseQs[j][2], j + 1, 'Booker']);
      }

      created++;
    }
  }
  return { created, skipped };
}

async function seedBookings(count = 250) {
  const [services] = await pool.query(
    `SELECT s.id, s.duration_minutes, s.price, s.category_id, s.appointment_type,
            (SELECT id FROM resources WHERE service_id=s.id LIMIT 1) AS rid
       FROM services s WHERE s.is_published=1 ORDER BY RAND() LIMIT ?`, [count * 2]);
  const [customers] = await pool.query("SELECT id FROM users WHERE role='customer' AND is_active=1");
  if (!customers.length) return { bookings: 0 };

  let made = 0;
  const statuses = ['confirmed','confirmed','confirmed','completed','completed','pending','cancelled'];
  for (let i = 0; i < count && i < services.length; i++) {
    const s = services[i];
    if (!s.rid) continue;
    const cust = pick(customers).id;
    const offsetDays = rand(-14, 14);
    const hour = rand(9, 17);
    const start = new Date();
    start.setDate(start.getDate() + offsetDays);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + s.duration_minutes * 60000);

    const status = pick(statuses);
    const paid = status === 'cancelled' ? 'not_required' : (Math.random() < 0.6 ? 'paid' : 'not_required');
    const subtotal = Number(s.price);
    const tax = +(subtotal * 0.18).toFixed(2);          // approximate

    const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
    try {
      const [r] = await pool.query(
        `INSERT INTO bookings (service_id, resource_id, customer_id,
                               start_datetime, end_datetime, capacity_taken,
                               status, payment_status,
                               subtotal_amount, tax_amount, total_amount,
                               appointment_type, created_at)
         VALUES (?,?,?,?,?,1,?,?,?,?,?,?,DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [s.id, s.rid, cust, fmt(start), fmt(end),
         status, paid,
         subtotal, tax, subtotal + tax,
         s.appointment_type === 'virtual' ? 'virtual' : 'in_person',
         Math.max(0, -offsetDays)]);
      if (paid === 'paid') {
        await pool.query(
          `INSERT INTO payments (booking_id, amount, method, status, transaction_id, paid_at)
           VALUES (?, ?, 'razorpay', 'success', ?, NOW())`,
          [r.insertId, subtotal + tax, `pay_seed_${r.insertId}`]);
      }
      made++;
    } catch { /* skip duplicates / unique conflicts */ }
  }
  return { bookings: made };
}

(async () => {
  console.log('[seedLarge] starting…');
  const t0 = Date.now();
  const perCat = Number(process.env.SEED_PER_CATEGORY || 20);
  const sv = await seedServices(perCat);
  console.log(`[seedLarge] services: created=${sv.created} skipped=${sv.skipped} (${perCat} per category)`);
  const bk = await seedBookings(80);
  console.log(`[seedLarge] bookings: ${bk.bookings}`);
  console.log(`[seedLarge] done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await pool.end();
})().catch((e) => {
  console.error('[seedLarge] failed:', e);
  process.exit(1);
});
