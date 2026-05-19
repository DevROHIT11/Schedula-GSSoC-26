// Race-safe booking engine. All multi-step writes happen inside a TX.
// Uses SELECT ... FOR UPDATE on competing bookings to prevent
// double-booking when capacity is exhausted.

const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');
const { getAvailableSlots, toMysqlLocal } = require('./slotService');

const isAlignedToBaseSlots = (slots, startStr) =>
  slots.some((s) => s.start === startStr);

function virtualLinkFor(service, bookingId) {
  if (service.appointment_type === 'in_person') return null;
  // Custom organiser-supplied link (e.g. their own Zoom/Meet room) wins.
  if (service.virtual_link) return service.virtual_link;
  // Default to Jitsi Meet — free, no auth, no API key required, opens
  // instantly in any modern browser. Same deterministic room name means
  // customer + provider land in the SAME video call.
  // Format: https://meet.jit.si/SchedulaBkg-{serviceId}-{bookingId}
  const room = `SchedulaBkg-${service.id}-${bookingId}`;
  return `https://meet.jit.si/${encodeURIComponent(room)}`;
}

// Returns the user's current priority_level (0=basic, 1=Gold, 2=Platinum).
async function getUserPriority(conn, userId) {
  const [rows] = await conn.query(
    `SELECT p.priority_level
       FROM user_subscriptions us
       JOIN subscription_plans p ON p.id=us.plan_id
      WHERE us.user_id=? AND us.status='active' AND us.expires_at > NOW()
      ORDER BY p.priority_level DESC LIMIT 1`,
    [userId]);
  return rows.length ? Number(rows[0].priority_level) : 0;
}

// Check that a slot isn't reserved for a higher tier than the user has.
async function assertSlotAccessible(conn, serviceId, resourceId, startStr, userPriority) {
  const [rows] = await conn.query(
    `SELECT min_priority_level, reason FROM blocked_slots
      WHERE service_id=? AND start_datetime=?
        AND (resource_id IS NULL OR resource_id=?)
      ORDER BY min_priority_level DESC LIMIT 1`,
    [serviceId, startStr, resourceId]);
  if (!rows.length) return;
  const need = Number(rows[0].min_priority_level);
  if (need >= 99) throw new HttpError(409, rows[0].reason || 'Slot is blocked');
  if (userPriority < need) {
    const tier = need >= 2 ? 'Platinum' : 'Gold';
    throw new HttpError(403, `This slot is reserved for ${tier} members. Upgrade your plan to book it.`);
  }
}

async function applyDiscountAndCredits(conn, userId, subtotal, discountCode, creditsRequested) {
  let discount_amount = 0;
  let resolvedCode = null;
  if (discountCode) {
    const [rows] = await conn.query('SELECT * FROM discount_codes WHERE code=? AND is_active=1', [discountCode]);
    if (rows.length) {
      const d = rows[0];
      const now = new Date();
      const valid = (!d.active_from || new Date(d.active_from) <= now) &&
                    (!d.active_to || new Date(d.active_to) >= now) &&
                    (d.max_uses === 0 || d.used_count < d.max_uses) &&
                    (Number(d.min_amount) <= subtotal);
      if (valid) {
        discount_amount = d.type === 'percent'
          ? +(subtotal * Number(d.value) / 100).toFixed(2)
          : Math.min(subtotal, Number(d.value));
        resolvedCode = d.code;
        await conn.query('UPDATE discount_codes SET used_count=used_count+1 WHERE id=?', [d.id]);
      }
    }
  }

  // Credits — 1 credit = ₹1.
  // Hard caps: never more than 50% of the post-discount price, and at least
  // ₹1 must remain payable so a real charge is always made.
  let credits_used = 0;
  if (creditsRequested && creditsRequested > 0) {
    const [bal] = await conn.query(
      `SELECT COALESCE(SUM(amount),0) AS bal FROM credit_transactions
        WHERE user_id=? AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]);
    const available = Math.max(0, Number(bal[0].bal) || 0);
    const postDiscount = Math.max(0, subtotal - discount_amount);
    const halfCap = Math.floor(postDiscount * 0.5);                 // 50% rule
    credits_used = Math.min(available, Math.floor(creditsRequested), halfCap);
    if (credits_used > 0) {
      await conn.query(
        `INSERT INTO credit_transactions (user_id, amount, reason)
         VALUES (?, ?, 'Booking redemption')`,
        [userId, -credits_used]);
    }
  }

  return { discount_amount, credits_used, resolvedCode };
}

async function createBooking({
  serviceId, customerId, startDatetime, resourceId,
  capacityTaken = 1, answers = [],
  discountCode = null, creditsToUse = 0,
  bookedForName = null, bookedForPhone = null, purpose = null,
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [serviceRows] = await conn.query('SELECT * FROM services WHERE id=? FOR UPDATE', [serviceId]);
    if (!serviceRows.length) throw new HttpError(404, 'Service not found');
    const service = serviceRows[0];
    if (service.is_deleted) throw new HttpError(404, 'This service has been removed by the organiser');
    if (!service.is_published) throw new HttpError(403, 'This service is currently unpublished and not accepting bookings');

    // Auto-tax: GST rate sourced from the service's category. Falls back to
    // service.tax_percent for legacy rows where category_id is null.
    let categoryTax = null;
    if (service.category_id) {
      const [catRows] = await conn.query(
        'SELECT tax_percentage FROM service_categories WHERE id=?', [service.category_id]);
      if (catRows.length) categoryTax = Number(catRows[0].tax_percentage);
    }
    const effectiveTaxPercent = categoryTax !== null ? categoryTax : Number(service.tax_percent);

    const startDate = new Date(startDatetime.replace(' ', 'T'));
    if (Number.isNaN(startDate.getTime())) throw new HttpError(400, 'Invalid start_datetime');
    if (startDate.getTime() < Date.now() - 60 * 1000)
      throw new HttpError(400, 'Cannot book a slot in the past');
    const endDate   = new Date(startDate.getTime() + service.duration_minutes * 60000);

    const userPriority = await getUserPriority(conn, customerId);
    const dateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const slots = await getAvailableSlots({ serviceId, date: dateOnly, conn, userPriority });
    const startStr = toMysqlLocal(startDate);
    if (!isAlignedToBaseSlots(slots, startStr))
      throw new HttpError(400, 'Slot not in service availability');

    const [resources] = await conn.query(
      'SELECT * FROM resources WHERE service_id=? AND is_active=1', [serviceId]);
    if (!resources.length) throw new HttpError(409, 'No resources configured');

    let chosenResource = null;
    if (service.assignment_mode === 'manual') {
      if (!resourceId) throw new HttpError(400, 'resource_id required');
      chosenResource = resources.find((r) => r.id === Number(resourceId));
      if (!chosenResource) throw new HttpError(400, 'Invalid resource for service');
    }

    const resourceIds = resources.map((r) => r.id);
    const [activeBookings] = await conn.query(
      `SELECT id, resource_id, capacity_taken, status FROM bookings
         WHERE resource_id IN (?)
           AND start_datetime = ?
           AND status IN ('reserved','pending','confirmed')
         FOR UPDATE`,
      [resourceIds, startStr]
    );
    const usedByResource = {};
    for (const r of resources) usedByResource[r.id] = 0;
    for (const b of activeBookings) usedByResource[b.resource_id] += Number(b.capacity_taken);

    const cap = service.manage_capacity ? Number(service.max_per_slot) : 1;
    const requested = service.manage_capacity ? Math.max(1, Number(capacityTaken) || 1) : 1;
    if (requested > cap) throw new HttpError(400, 'Capacity exceeds slot maximum');

    if (chosenResource) {
      const remain = cap - usedByResource[chosenResource.id];
      if (remain < requested) throw new HttpError(409, 'Slot full for selected resource');
    } else {
      chosenResource = resources.find((r) => (cap - usedByResource[r.id]) >= requested);
      if (!chosenResource) throw new HttpError(409, 'Slot full');
    }

    // Premium-tier slot gate (per-resource or service-wide).
    await assertSlotAccessible(conn, serviceId, chosenResource.id, startStr, userPriority);

    const [questions] = await conn.query(
      'SELECT id, is_required FROM booking_questions WHERE service_id=?', [serviceId]);
    const answerMap = {};
    for (const a of (answers || [])) answerMap[Number(a.question_id)] = (a.answer_text || '').trim();
    for (const q of questions) {
      if (q.is_required && !answerMap[q.id]) {
        throw new HttpError(400, `Answer required for question_id ${q.id}`);
      }
    }

    const requiresPayment = !!service.advance_payment && Number(service.price) > 0;
    const requiresManual  = !!service.manual_confirmation;
    let status, paymentStatus;
    if (requiresPayment) { status = 'pending';   paymentStatus = 'pending'; }
    else if (requiresManual) { status = 'reserved'; paymentStatus = 'not_required'; }
    else { status = 'confirmed'; paymentStatus = 'not_required'; }

    const subtotal = +(Number(service.price) * requested).toFixed(2);
    // Apply discount + credits
    const { discount_amount, credits_used, resolvedCode } =
      await applyDiscountAndCredits(conn, customerId, subtotal, discountCode, creditsToUse);

    // Tax: apply only when subtotal-after-discount exceeds threshold
    const taxableBase = Math.max(0, subtotal - discount_amount);
    let tax_amount = 0;
    if (taxableBase >= Number(service.tax_threshold || 0) && effectiveTaxPercent > 0) {
      tax_amount = +(taxableBase * effectiveTaxPercent / 100).toFixed(2);
    }
    const total = +Math.max(0, subtotal - discount_amount + tax_amount - credits_used).toFixed(2);

    const apptType = service.appointment_type === 'virtual' ? 'virtual' : 'in_person';

    const [ins] = await conn.query(
      `INSERT INTO bookings
         (service_id, resource_id, customer_id, booked_for_name, booked_for_phone, purpose,
          start_datetime, end_datetime, capacity_taken, status, payment_status,
          subtotal_amount, tax_amount, discount_amount, credits_used, discount_code,
          total_amount, appointment_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [serviceId, chosenResource.id, customerId, bookedForName, bookedForPhone, purpose,
       startStr, toMysqlLocal(endDate), requested, status, paymentStatus,
       subtotal, tax_amount, discount_amount, credits_used, resolvedCode,
       total, apptType]
    );
    const bookingId = ins.insertId;

    // Generate meeting link for virtual bookings
    const link = virtualLinkFor(service, bookingId);
    if (link) {
      await conn.query('UPDATE bookings SET meeting_link=? WHERE id=?', [link, bookingId]);
    }

    for (const q of questions) {
      const text = answerMap[q.id];
      if (text !== undefined && text !== '') {
        await conn.query(
          'INSERT INTO booking_answers (booking_id, question_id, answer_text) VALUES (?,?,?)',
          [bookingId, q.id, text]
        );
      }
    }

    // Reward credits when not requiring payment (immediate confirm)
    if (status === 'confirmed' && total > 0) {
      const reward = Math.max(1, Math.floor(total * 0.05));
      await conn.query(
        `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
         VALUES (?, ?, 'Booking reward', DATE_ADD(NOW(), INTERVAL 90 DAY))`,
        [customerId, reward]);
    }

    // Notification
    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'booking_created', ?, ?, ?)`,
      [customerId, 'Booking created',
       `Your booking for ${service.name} on ${startStr} is ${status}.`,
       `/booking/${bookingId}`]);

    await conn.commit();
    return {
      id: bookingId, status, payment_status: paymentStatus,
      total_amount: total, subtotal, tax_amount, discount_amount, credits_used,
      meeting_link: link, appointment_type: apptType,
      requires_payment: requiresPayment,
      service_id: serviceId, resource_id: chosenResource.id,
      start_datetime: startStr, end_datetime: toMysqlLocal(endDate),
      capacity_taken: requested,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function rescheduleBooking({ bookingId, newStart, customerId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM bookings WHERE id=? FOR UPDATE', [bookingId]);
    const booking = rows[0];
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (booking.customer_id !== customerId)
      throw new HttpError(403, 'Not your booking');
    if (booking.status === 'cancelled')
      throw new HttpError(400, 'Cancelled bookings cannot be rescheduled');

    const [serviceRows] = await conn.query('SELECT * FROM services WHERE id=?', [booking.service_id]);
    const service = serviceRows[0];
    const newStartDate = new Date(newStart.replace(' ', 'T'));
    if (Number.isNaN(newStartDate.getTime())) throw new HttpError(400, 'Invalid datetime');
    const newEndDate = new Date(newStartDate.getTime() + service.duration_minutes * 60000);
    const newStartStr = toMysqlLocal(newStartDate);

    const dateOnly = new Date(newStartDate.getFullYear(), newStartDate.getMonth(), newStartDate.getDate());
    const slots = await getAvailableSlots({ serviceId: booking.service_id, date: dateOnly, conn });
    if (!isAlignedToBaseSlots(slots, newStartStr))
      throw new HttpError(400, 'Slot not in service availability');

    const [active] = await conn.query(
      `SELECT id, capacity_taken FROM bookings
         WHERE resource_id=? AND start_datetime=? AND id<>?
           AND status IN ('reserved','pending','confirmed')
         FOR UPDATE`,
      [booking.resource_id, newStartStr, booking.id]
    );
    const used = active.reduce((s, b) => s + Number(b.capacity_taken), 0);
    const cap  = service.manage_capacity ? Number(service.max_per_slot) : 1;
    if (used + Number(booking.capacity_taken) > cap)
      throw new HttpError(409, 'New slot full for this resource');

    await conn.query(
      'UPDATE bookings SET start_datetime=?, end_datetime=?, status=IF(status=\'cancelled\',\'cancelled\',status) WHERE id=?',
      [newStartStr, toMysqlLocal(newEndDate), booking.id]
    );

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'booking_rescheduled', ?, ?, ?)`,
      [customerId, 'Booking rescheduled',
       `Your booking has been moved to ${newStartStr}.`,
       `/booking/${booking.id}`]);

    await conn.commit();
    return { id: booking.id, start_datetime: newStartStr, end_datetime: toMysqlLocal(newEndDate) };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

async function cancelBooking({ bookingId, userId, role }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM bookings WHERE id=? FOR UPDATE', [bookingId]);
    const b = rows[0];
    if (!b) throw new HttpError(404, 'Booking not found');
    if (role !== 'admin') {
      if (role === 'customer' && b.customer_id !== userId) throw new HttpError(403, 'Forbidden');
      if (role === 'organiser') {
        const [s] = await conn.query('SELECT organiser_id FROM services WHERE id=?', [b.service_id]);
        if (!s.length || s[0].organiser_id !== userId) throw new HttpError(403, 'Forbidden');
      }
    }
    if (b.status === 'cancelled') {
      await conn.commit();
      return { id: b.id, status: 'cancelled' };
    }

    // If paid, mark refunded; the most recent payment row is also flipped.
    const wasPaid = b.payment_status === 'paid';
    await conn.query(
      `UPDATE bookings SET status='cancelled',
         payment_status=IF(payment_status='paid','refunded',payment_status)
       WHERE id=?`,
      [b.id]);
    if (wasPaid) {
      await conn.query(
        "UPDATE payments SET status='refunded' WHERE booking_id=? AND status='success'",
        [b.id]);
    }

    // Refund credits if any were used
    if (b.credits_used && Number(b.credits_used) > 0) {
      await conn.query(
        `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
         VALUES (?, ?, 'Cancellation refund', DATE_ADD(NOW(), INTERVAL 90 DAY))`,
        [b.customer_id, Number(b.credits_used)]);
    }

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'booking_cancelled', ?, ?, ?)`,
      [b.customer_id, 'Booking cancelled',
       `Your booking #${b.id} has been cancelled.`,
       `/profile`]);

    await conn.commit();
    return { id: b.id, status: 'cancelled' };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

async function confirmPayment({ bookingId, customerId, method }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM bookings WHERE id=? FOR UPDATE', [bookingId]);
    const b = rows[0];
    if (!b) throw new HttpError(404, 'Booking not found');
    if (b.customer_id !== customerId) throw new HttpError(403, 'Forbidden');
    if (b.payment_status === 'paid') throw new HttpError(400, 'Already paid');

    const txnId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
    await conn.query(
      `INSERT INTO payments (booking_id, amount, method, status, transaction_id, paid_at)
       VALUES (?,?,?,?,?,NOW())`,
      [b.id, b.total_amount, method, 'success', txnId]
    );

    const [serviceRows] = await conn.query('SELECT manual_confirmation FROM services WHERE id=?', [b.service_id]);
    const newStatus = serviceRows[0].manual_confirmation ? 'reserved' : 'confirmed';
    await conn.query(
      "UPDATE bookings SET payment_status='paid', status=? WHERE id=?",
      [newStatus, b.id]
    );

    // Reward credits on payment success
    if (Number(b.total_amount) > 0) {
      const reward = Math.max(1, Math.floor(Number(b.total_amount) * 0.05));
      await conn.query(
        `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
         VALUES (?, ?, 'Payment reward', DATE_ADD(NOW(), INTERVAL 90 DAY))`,
        [customerId, reward]);
    }

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'payment', ?, ?, ?)`,
      [customerId, 'Payment successful',
       `Your booking #${b.id} is now ${newStatus}. Transaction ${txnId}.`,
       `/booking/${b.id}`]);

    await conn.commit();
    return { booking_id: b.id, status: newStatus, payment_status: 'paid', transaction_id: txnId };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

async function organiserConfirm({ bookingId, organiserId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT b.*, s.organiser_id, s.manual_confirmation
         FROM bookings b JOIN services s ON s.id=b.service_id
         WHERE b.id=? FOR UPDATE`, [bookingId]);
    const b = rows[0];
    if (!b) throw new HttpError(404, 'Booking not found');
    if (b.organiser_id !== organiserId) throw new HttpError(403, 'Forbidden');
    if (b.status === 'confirmed') { await conn.commit(); return { id: b.id, status: 'confirmed' }; }
    if (b.status === 'cancelled') throw new HttpError(400, 'Already cancelled');
    await conn.query("UPDATE bookings SET status='confirmed' WHERE id=?", [b.id]);
    await conn.commit();
    return { id: b.id, status: 'confirmed' };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

module.exports = {
  createBooking, rescheduleBooking, cancelBooking,
  confirmPayment, organiserConfirm,
};
