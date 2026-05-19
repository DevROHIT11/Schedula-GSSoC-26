// Razorpay payment integration with a graceful mock-mode fallback so the
// demo works without real keys. When RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET
// are set in .env, the live SDK is used and signatures are HMAC-verified.

const crypto = require('crypto');
const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');

let Razorpay = null;
try { Razorpay = require('razorpay'); } catch { /* SDK absent — mock only */ }

const KEY_ID     = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const isLive = Boolean(KEY_ID && KEY_SECRET && Razorpay);
const rzp = isLive ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null;

if (isLive) {
  console.log(`[razorpay] LIVE mode — using key ${KEY_ID.slice(0, 12)}…`);
} else {
  console.log('[razorpay] MOCK mode — set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in .env to enable real payments');
}

const safeTimingEq = (a, b) => {
  try {
    const ba = Buffer.from(String(a || ''));
    const bb = Buffer.from(String(b || ''));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch { return false; }
};

// ----- 1. Create order -------------------------------------------------------
exports.createOrder = async (req, res) => {
  const bookingId = Number(req.body.booking_id);
  if (!bookingId) throw new HttpError(400, 'booking_id required');

  const [rows] = await pool.query(
    `SELECT id, customer_id, total_amount, status, payment_status
       FROM bookings WHERE id=?`, [bookingId]);
  if (!rows.length) throw new HttpError(404, 'Booking not found');
  const booking = rows[0];
  if (booking.customer_id !== req.user.id) throw new HttpError(403, 'Not your booking');
  if (booking.payment_status === 'paid')   throw new HttpError(400, 'Booking already paid');
  if (booking.status === 'cancelled')      throw new HttpError(400, 'Cannot pay for a cancelled booking');

  const amountPaise = Math.round(Number(booking.total_amount) * 100);
  if (amountPaise <= 0) throw new HttpError(400, 'Booking total is zero — nothing to pay');

  // Re-use a pending payment row if one already exists (e.g. user closed
  // the modal and retried) — avoids piling up orphaned rows.
  const [existing] = await pool.query(
    `SELECT razorpay_order_id, amount FROM payments
      WHERE booking_id=? AND status='pending' AND razorpay_order_id IS NOT NULL
      ORDER BY id DESC LIMIT 1`, [booking.id]);

  let order;
  if (isLive) {
    try {
      order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `bk_${booking.id}_${Date.now()}`,
        payment_capture: 1,
        notes: { booking_id: String(booking.id), user_id: String(req.user.id) },
      });
    } catch (e) {
      console.error('[razorpay] order create failed:', e.message);
      throw new HttpError(502, 'Could not create Razorpay order. Check your keys and try again.');
    }
  } else {
    // Mock order — same shape as Razorpay's response, prefixed so verify() can spot it.
    order = {
      id: `order_mock_${booking.id}_${Date.now()}`,
      amount: amountPaise,
      currency: 'INR',
      receipt: `bk_${booking.id}`,
      status: 'created',
    };
  }

  if (existing.length) {
    await pool.query(
      `UPDATE payments SET razorpay_order_id=?, amount=? WHERE booking_id=? AND status='pending'`,
      [order.id, Number(booking.total_amount), booking.id]);
  } else {
    await pool.query(
      `INSERT INTO payments (booking_id, amount, method, status, razorpay_order_id)
       VALUES (?, ?, 'razorpay', 'pending', ?)`,
      [booking.id, Number(booking.total_amount), order.id]);
  }

  res.status(201).json({
    razorpay_order_id: order.id,
    amount: order.amount,         // paise
    currency: order.currency,
    key_id: KEY_ID,
    is_mock: !isLive,
    booking_id: booking.id,
    name: 'Schedula',
    description: `Booking #${booking.id}`,
  });
};

// ----- 2. Verify payment -----------------------------------------------------
exports.verify = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id) throw new HttpError(400, 'razorpay_order_id required');

  // Find the pending payment row created during create-order.
  const [rows] = await pool.query(
    `SELECT p.*, b.customer_id, b.service_id
       FROM payments p
       JOIN bookings b ON b.id=p.booking_id
      WHERE p.razorpay_order_id=? ORDER BY p.id DESC LIMIT 1`,
    [razorpay_order_id]);
  if (!rows.length) throw new HttpError(404, 'Order not found — please retry the booking');
  const payment = rows[0];
  if (payment.customer_id !== req.user.id) throw new HttpError(403, 'Forbidden');
  if (payment.status === 'success')        return res.json({ verified: true, already: true, booking_id: payment.booking_id });

  const isMockOrder = String(razorpay_order_id).startsWith('order_mock_');
  let verified = false;

  if (isLive && !isMockOrder) {
    if (!razorpay_payment_id || !razorpay_signature)
      throw new HttpError(400, 'razorpay_payment_id & razorpay_signature required');
    const expected = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    verified = safeTimingEq(expected, razorpay_signature);
  } else {
    // Mock mode — accept the call. Frontend simulates success after a short
    // delay so the booking state machine is exercised end-to-end.
    verified = true;
  }

  if (!verified) {
    await pool.query("UPDATE payments SET status='failed' WHERE id=?", [payment.id]);
    throw new HttpError(400, 'Signature verification failed — payment rejected');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE payments SET status='success',
              razorpay_payment_id=?, razorpay_signature=?,
              transaction_id=?, paid_at=NOW()
        WHERE id=?`,
      [razorpay_payment_id || `pay_mock_${Date.now()}`,
       razorpay_signature  || 'mock_signature',
       razorpay_payment_id || `pay_mock_${Date.now()}`,
       payment.id]);

    const [svcRow] = await conn.query(
      'SELECT manual_confirmation FROM services WHERE id=?', [payment.service_id]);
    const newStatus = svcRow[0] && svcRow[0].manual_confirmation ? 'reserved' : 'confirmed';
    await conn.query(
      "UPDATE bookings SET payment_status='paid', status=? WHERE id=?",
      [newStatus, payment.booking_id]);

    const reward = Math.max(1, Math.floor(Number(payment.amount) * 0.05));
    await conn.query(
      `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
       VALUES (?, ?, 'Payment reward', DATE_ADD(NOW(), INTERVAL 90 DAY))`,
      [payment.customer_id, reward]);

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'payment', 'Payment successful',
               CONCAT('Booking #', ?, ' is now ', ?, '. Earned ', ?, ' credits.'),
               CONCAT('/booking/', ?))`,
      [payment.customer_id, payment.booking_id, newStatus, reward, payment.booking_id]);

    await conn.commit();
    res.json({
      verified: true,
      booking_id: payment.booking_id,
      booking_status: newStatus,
      payment_status: 'paid',
      transaction_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
      reward_credits: reward,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

// UPI QR demo confirmation. NOT Razorpay — used for the in-app QR option
// where the user scans a `upi://pay?…` deep-link with their phone. There's
// no signature to verify, so this confirms the booking after the user taps
// "I've completed the payment". Method recorded as `upi`.
exports.confirmUpi = async (req, res) => {
  const bookingId = Number(req.body.booking_id);
  const upiRef = String(req.body.upi_reference || `upi_demo_${Date.now()}`);
  if (!bookingId) throw new HttpError(400, 'booking_id required');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, customer_id, total_amount, status, payment_status, service_id
         FROM bookings WHERE id=? FOR UPDATE`, [bookingId]);
    if (!rows.length) throw new HttpError(404, 'Booking not found');
    const b = rows[0];
    if (b.customer_id !== req.user.id) throw new HttpError(403, 'Not your booking');
    if (b.payment_status === 'paid') {
      await conn.commit();
      return res.json({ verified: true, already: true, booking_id: b.id });
    }
    if (b.status === 'cancelled') throw new HttpError(400, 'Cannot pay for a cancelled booking');

    await conn.query(
      `INSERT INTO payments (booking_id, amount, method, status, transaction_id, paid_at)
       VALUES (?, ?, 'upi', 'success', ?, NOW())`,
      [b.id, Number(b.total_amount), upiRef]);

    const [svcRow] = await conn.query(
      'SELECT manual_confirmation FROM services WHERE id=?', [b.service_id]);
    const newStatus = svcRow[0] && svcRow[0].manual_confirmation ? 'reserved' : 'confirmed';
    await conn.query(
      "UPDATE bookings SET payment_status='paid', status=? WHERE id=?",
      [newStatus, b.id]);

    const reward = Math.max(1, Math.floor(Number(b.total_amount) * 0.05));
    await conn.query(
      `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
       VALUES (?, ?, 'Payment reward (UPI)', DATE_ADD(NOW(), INTERVAL 90 DAY))`,
      [b.customer_id, reward]);

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'payment', 'Payment received',
               CONCAT('Booking #', ?, ' is now ', ?, '. Earned ', ?, ' credits.'),
               CONCAT('/booking/', ?))`,
      [b.customer_id, b.id, newStatus, reward, b.id]);

    await conn.commit();
    res.json({
      verified: true,
      booking_id: b.id,
      booking_status: newStatus,
      payment_status: 'paid',
      transaction_id: upiRef,
      reward_credits: reward,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

// Mark a payment as failed (called when user dismisses the modal or
// Razorpay reports failure). Idempotent.
exports.fail = async (req, res) => {
  const orderId = String(req.body.razorpay_order_id || '');
  if (!orderId) throw new HttpError(400, 'razorpay_order_id required');
  await pool.query(
    `UPDATE payments p JOIN bookings b ON b.id=p.booking_id
        SET p.status='failed'
      WHERE p.razorpay_order_id=? AND b.customer_id=? AND p.status='pending'`,
    [orderId, req.user.id]);
  res.json({ ok: true });
};

// ----- 3. Public config (lets frontend know mock vs live + UPI demo VPA) ----
exports.config = (_req, res) => {
  res.json({
    key_id: KEY_ID,
    is_mock: !isLive,
    upi_vpa:  process.env.DEMO_UPI_VPA  || 'success@razorpay',
    upi_name: process.env.DEMO_UPI_NAME || 'Schedula',
  });
};

//Subscription orders 
exports.createSubscriptionOrder = async (req, res) => {
  const planKey = String(req.body.plan_key || '').trim();
  if (!planKey) throw new HttpError(400, 'plan_key required');

  const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE `key`=? AND is_active=1', [planKey]);
  if (!plans.length) throw new HttpError(404, 'Plan not found');
  const plan = plans[0];

  if (Number(plan.price_monthly) <= 0) {
    throw new HttpError(400, 'Plan is free — nothing to pay');
  }

  const amountPaise = Math.round(Number(plan.price_monthly) * 100);

  let order;
  if (isLive) {
    try {
      order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `plan_${plan.id}_${Date.now()}`,
        payment_capture: 1,
        notes: { plan_key: planKey, user_id: String(req.user.id) },
      });
    } catch (e) {
      console.error('[razorpay] order create failed:', e.message);
      throw new HttpError(502, 'Could not create Razorpay order. Check your keys and try again.');
    }
  } else {
    order = {
      id: `order_mock_plan_${plan.id}_${Date.now()}`,
      amount: amountPaise,
      currency: 'INR',
      receipt: `plan_${plan.id}`,
      status: 'created',
    };
  }

  res.status(201).json({
    razorpay_order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: KEY_ID,
    is_mock: !isLive,
    plan_key: planKey,
    name: 'Schedula',
    description: `${plan.name} Plan`,
  });
};

exports.verifySubscription = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_key } = req.body;
  if (!razorpay_order_id) throw new HttpError(400, 'razorpay_order_id required');
  if (!plan_key) throw new HttpError(400, 'plan_key required');

  const isMockOrder = String(razorpay_order_id).startsWith('order_mock_');
  let verified = false;

  if (isLive && !isMockOrder) {
    if (!razorpay_payment_id || !razorpay_signature)
      throw new HttpError(400, 'razorpay_payment_id & razorpay_signature required');
    const expected = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    verified = safeTimingEq(expected, razorpay_signature);
  } else {
    verified = true;
  }

  if (!verified) {
    throw new HttpError(400, 'Signature verification failed — payment rejected');
  }

  // Once verified, activate the subscription via the subscription controller logic
  const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE `key`=? AND is_active=1', [plan_key]);
  if (!plans.length) throw new HttpError(404, 'Plan not found');
  const plan = plans[0];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE user_subscriptions SET status='cancelled' WHERE user_id=? AND status='active'`, [req.user.id]);
    
    const [r] = await conn.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, started_at, expires_at, status)
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active')`,
      [req.user.id, plan.id]
    );

    const bonus = plan.priority_level === 2 ? 1000 : plan.priority_level === 1 ? 300 : 50;
    if (bonus > 0) {
      await conn.query(
        `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 DAY))`,
        [req.user.id, bonus, `${plan.name} subscription bonus`]
      );
    }
    await conn.commit();
    res.json({ verified: true, plan: plan.name, bonus_credits: bonus });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

exports.confirmUpiSubscription = async (req, res) => {
  const planKey = String(req.body.plan_key || '').trim();
  if (!planKey) throw new HttpError(400, 'plan_key required');

  const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE `key`=? AND is_active=1', [planKey]);
  if (!plans.length) throw new HttpError(404, 'Plan not found');
  const plan = plans[0];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE user_subscriptions SET status='cancelled' WHERE user_id=? AND status='active'`, [req.user.id]);
    
    const [r] = await conn.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, started_at, expires_at, status)
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active')`,
      [req.user.id, plan.id]
    );

    const bonus = plan.priority_level === 2 ? 1000 : plan.priority_level === 1 ? 300 : 50;
    if (bonus > 0) {
      await conn.query(
        `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 DAY))`,
        [req.user.id, bonus, `${plan.name} subscription bonus`]
      );
    }
    await conn.commit();
    res.json({ verified: true, plan: plan.name, bonus_credits: bonus });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};
