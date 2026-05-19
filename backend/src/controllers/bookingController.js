const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');
const {
  createBooking, rescheduleBooking, cancelBooking,
  confirmPayment, organiserConfirm,
} = require('../services/bookingService');
const { sendMail } = require('../services/mailer');
const { bookingEmail } = require('../services/emailTemplates');
const { joinState } = require('../utils/meeting');

// Pulls the data we need to render a booking email and dispatches it.
// Fire-and-forget — failures are logged but never block the API response.
async function notify(bookingId, action) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, s.name AS service_name, s.venue,
              r.name AS resource_name,
              u.full_name AS customer_name, u.email AS customer_email
         FROM bookings b
         JOIN services s ON s.id=b.service_id
         JOIN resources r ON r.id=b.resource_id
         JOIN users u ON u.id=b.customer_id
        WHERE b.id=?`, [bookingId]);
    const b = rows[0];
    if (!b || !b.customer_email) return;
    const tpl = bookingEmail({
      name: b.customer_name,
      action,
      service_name: b.service_name,
      when: b.start_datetime,
      end:  b.end_datetime,
      provider: b.resource_name,
      status: b.status,
      venue: b.venue,
      total: b.total_amount,
    });
    sendMail({ to: b.customer_email, ...tpl });
  } catch (e) {
    console.error('[booking notify] failed:', e.message);
  }
}

exports.create = async (req, res) => {
  const {
    service_id, start_datetime, resource_id, capacity_taken, answers,
    discount_code, credits_to_use, booked_for_name, booked_for_phone, purpose,
  } = req.body;
  if (!service_id || !start_datetime)
    throw new HttpError(400, 'service_id and start_datetime are required');
  const out = await createBooking({
    serviceId: Number(service_id),
    customerId: req.user.id,
    startDatetime: start_datetime,
    resourceId: resource_id ? Number(resource_id) : null,
    capacityTaken: Number(capacity_taken) || 1,
    answers: answers || [],
    discountCode: discount_code ? String(discount_code).toUpperCase().trim() : null,
    creditsToUse: Number(credits_to_use) || 0,
    bookedForName: booked_for_name || null,
    bookedForPhone: booked_for_phone || null,
    purpose: purpose || null,
  });
  notify(out.id, 'created');
  res.status(201).json({ booking: out });
};

exports.reschedule = async (req, res) => {
  const id = Number(req.params.id);
  const { start_datetime } = req.body;
  if (!start_datetime) throw new HttpError(400, 'start_datetime required');
  const out = await rescheduleBooking({
    bookingId: id, newStart: start_datetime, customerId: req.user.id,
  });
  notify(id, 'rescheduled');
  res.json({ booking: out });
};

exports.cancel = async (req, res) => {
  const id = Number(req.params.id);
  const out = await cancelBooking({
    bookingId: id, userId: req.user.id, role: req.user.role,
  });
  notify(id, 'cancelled');
  res.json({ booking: out });
};

exports.pay = async (req, res) => {
  const id = Number(req.params.id);
  const { method } = req.body;
  const allowed = ['card','credit_card','debit_card','upi','google_pay','paypal','wallet'];
  if (!allowed.includes(method))
    throw new HttpError(400, 'invalid method');
  const out = await confirmPayment({ bookingId: id, customerId: req.user.id, method });
  // After payment the booking either becomes 'confirmed' or 'reserved'
  notify(id, out.status === 'confirmed' ? 'confirmed' : 'created');
  res.json({ payment: out });
};

exports.organiserConfirm = async (req, res) => {
  const id = Number(req.params.id);
  const out = await organiserConfirm({ bookingId: id, organiserId: req.user.id });
  notify(id, 'confirmed');
  res.json({ booking: out });
};

const baseSelect = `
  SELECT b.*, s.name AS service_name, s.duration_minutes, s.venue,
         r.name AS resource_name, u.full_name AS customer_name
    FROM bookings b
    JOIN services s ON s.id=b.service_id
    JOIN resources r ON r.id=b.resource_id
    JOIN users u ON u.id=b.customer_id
`;

exports.mine = async (req, res) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE b.customer_id=? ORDER BY b.start_datetime DESC`,
    [req.user.id]);
  // Hide the raw link until joinable; expose meeting_state for countdown UI.
  for (const b of rows) {
    if (b.appointment_type === 'virtual') {
      b.meeting_state = joinState(b.start_datetime, b.end_datetime);
      if (b.meeting_state.state !== 'live') b.meeting_link = null;
    }
  }
  res.json({ bookings: rows });
};

// Calendly-style organiser meetings list — every virtual booking on services
// the organiser owns, with the customer + meeting-link details.
exports.organiserMeetings = async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const args = [];
  let where = `b.appointment_type='virtual' AND b.status IN ('confirmed','reserved','pending')`;
  if (!isAdmin) { where += ' AND s.organiser_id=?'; args.push(req.user.id); }
  const [rows] = await pool.query(
    `SELECT b.id, b.start_datetime, b.end_datetime, b.status, b.payment_status,
            b.meeting_link, b.appointment_type, b.capacity_taken,
            s.id AS service_id, s.name AS service_name, s.duration_minutes,
            s.virtual_provider, s.organiser_id,
            r.name AS resource_name,
            u.id AS customer_id, u.full_name AS customer_name,
            u.email AS customer_email, u.phone AS customer_phone
       FROM bookings b
       JOIN services s  ON s.id=b.service_id
       JOIN resources r ON r.id=b.resource_id
       JOIN users u     ON u.id=b.customer_id
      WHERE ${where}
        AND b.start_datetime > DATE_SUB(NOW(), INTERVAL 1 DAY)
      ORDER BY b.start_datetime ASC`, args);
  // Decorate each meeting with its join-window state. Note the organiser
  // KEEPS the raw link in this response — they need it to set up / verify the
  // room, and they're the host. Customers only see it during the live window.
  for (const m of rows) m.meeting_state = joinState(m.start_datetime, m.end_datetime);
  res.json({ meetings: rows });
};

// Re-send the meeting invite to the customer: email + in-app notification.
exports.sendInvite = async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT b.*, s.organiser_id, s.name AS service_name, s.venue,
            r.name AS resource_name, u.full_name AS customer_name, u.email AS customer_email
       FROM bookings b
       JOIN services s ON s.id=b.service_id
       JOIN resources r ON r.id=b.resource_id
       JOIN users u ON u.id=b.customer_id
      WHERE b.id=?`, [id]);
  if (!rows.length) throw new HttpError(404, 'Booking not found');
  const b = rows[0];
  if (req.user.role !== 'admin' && b.organiser_id !== req.user.id)
    throw new HttpError(403, 'Forbidden');
  if (b.appointment_type !== 'virtual')
    throw new HttpError(400, 'Not a virtual booking');
  if (!b.meeting_link)
    throw new HttpError(400, 'No meeting link configured for this booking');

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES (?, 'meeting_invite', ?, ?, ?)`,
    [b.customer_id, 'Meeting link ready',
     `${b.service_name} on ${b.start_datetime} — your provider has shared the join link.`,
     `/booking/${b.id}`]);

  try {
    const tpl = bookingEmail({
      name: b.customer_name, action: 'invite',
      service_name: b.service_name, when: b.start_datetime, end: b.end_datetime,
      provider: b.resource_name, status: 'invited',
      venue: b.meeting_link, total: b.total_amount,
    });
    sendMail({ to: b.customer_email, ...tpl });
  } catch (e) { console.warn('[invite mail] failed:', e.message); }

  res.json({ ok: true, sent_to: b.customer_email });
};

// Hard-gated join: returns the actual meeting link only inside the
// joinable window (-5 min from start to +15 min after end). Outside the
// window the response carries the open/close timestamps so the frontend
// can show a precise countdown.
exports.joinLink = async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT b.id, b.customer_id, b.appointment_type, b.status,
            b.start_datetime, b.end_datetime, b.meeting_link,
            s.organiser_id
       FROM bookings b
       JOIN services s ON s.id=b.service_id WHERE b.id=?`, [id]);
  if (!rows.length) throw new HttpError(404, 'Booking not found');
  const b = rows[0];

  // Customer of the booking, organiser of the service, or admin only.
  const isAuthorised = req.user.role === 'admin'
                    || b.customer_id === req.user.id
                    || b.organiser_id === req.user.id;
  if (!isAuthorised) throw new HttpError(403, 'Forbidden');
  if (b.appointment_type !== 'virtual') throw new HttpError(400, 'Not a virtual booking');
  if (b.status === 'cancelled')         throw new HttpError(400, 'Booking is cancelled');
  if (!b.meeting_link)                  throw new HttpError(400, 'Meeting link not yet configured by organiser');

  const state = joinState(b.start_datetime, b.end_datetime);
  if (state.state !== 'live') {
    // Don't leak the link before/after the window.
    return res.status(403).json({
      message: state.state === 'pending'
        ? `Meeting opens 5 minutes before the scheduled time.`
        : `This meeting has ended.`,
      ...state,
      start_datetime: b.start_datetime,
      end_datetime:   b.end_datetime,
    });
  }
  res.json({ meeting_link: b.meeting_link, ...state });
};

// Organiser overrides the auto-generated link with their own (real Zoom/Meet).
exports.updateMeetingLink = async (req, res) => {
  const id = Number(req.params.id);
  const url = String(req.body.meeting_link || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(url)) throw new HttpError(400, 'Valid http(s) URL required');

  const [rows] = await pool.query(
    `SELECT b.id, b.appointment_type, s.organiser_id
       FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.id=?`, [id]);
  if (!rows.length) throw new HttpError(404, 'Booking not found');
  if (req.user.role !== 'admin' && rows[0].organiser_id !== req.user.id)
    throw new HttpError(403, 'Forbidden');
  if (rows[0].appointment_type !== 'virtual')
    throw new HttpError(400, 'Not a virtual booking');

  await pool.query('UPDATE bookings SET meeting_link=? WHERE id=?', [url, id]);
  res.json({ meeting_link: url });
};

exports.detail = async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(`${baseSelect} WHERE b.id=?`, [id]);
  if (!rows.length) throw new HttpError(404, 'Booking not found');
  const b = rows[0];
  if (req.user.role !== 'admin') {
    if (req.user.role === 'customer' && b.customer_id !== req.user.id)
      throw new HttpError(403, 'Forbidden');
    if (req.user.role === 'organiser') {
      const [s] = await pool.query('SELECT organiser_id FROM services WHERE id=?', [b.service_id]);
      if (!s.length || s[0].organiser_id !== req.user.id) throw new HttpError(403, 'Forbidden');
    }
  }
  const [answers] = await pool.query(
    `SELECT ba.answer_text, q.question, q.field_type
       FROM booking_answers ba JOIN booking_questions q ON q.id=ba.question_id
      WHERE ba.booking_id=?`, [id]);
  const [pays] = await pool.query('SELECT * FROM payments WHERE booking_id=? ORDER BY id DESC', [id]);
  // For virtual bookings, attach the join window state and HIDE the raw link
  // until the window opens. The /join-link endpoint re-issues it once gated.
  if (b.appointment_type === 'virtual') {
    b.meeting_state = joinState(b.start_datetime, b.end_datetime);
    if (b.meeting_state.state !== 'live') b.meeting_link = null;
  }
  res.json({ booking: b, answers, payments: pays });
};
