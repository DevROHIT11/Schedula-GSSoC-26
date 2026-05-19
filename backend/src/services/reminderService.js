// Two background loops, both run every 60 s:
//   1. REMINDER     — once per booking, sent 15-60 min before start
//   2. IMMINENT     — once per booking, sent 0-5 min before start (to BOTH
//                     customer AND organiser, with the join link)
// Idempotent via the bookings.reminder_sent / imminent_notify_sent flags.

const pool = require('../config/db');
const { sendMail } = require('./mailer');
const { bookingEmail } = require('./emailTemplates');

async function reminderTick() {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.start_datetime, b.end_datetime, b.appointment_type, b.meeting_link,
              b.total_amount, b.customer_id,
              s.name AS service_name, s.venue,
              r.name AS resource_name,
              u.full_name AS customer_name, u.email AS customer_email
         FROM bookings b
         JOIN services s ON s.id=b.service_id
         JOIN resources r ON r.id=b.resource_id
         JOIN users u ON u.id=b.customer_id
        WHERE b.status IN ('confirmed','reserved','pending')
          AND b.reminder_sent=0
          AND b.start_datetime > NOW()
          AND b.start_datetime <= DATE_ADD(NOW(), INTERVAL 60 MINUTE)
          AND b.start_datetime > DATE_ADD(NOW(), INTERVAL 5 MINUTE)`);
    for (const b of rows) {
      await pool.query('UPDATE bookings SET reminder_sent=1 WHERE id=?', [b.id]);
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES (?, 'reminder', ?, ?, ?)`,
        [b.customer_id, 'Appointment starting soon',
         `${b.service_name} starts at ${b.start_datetime}.`,
         `/booking/${b.id}`]);
      if (b.customer_email) {
        try {
          const tpl = bookingEmail({
            name: b.customer_name, action: 'reminder',
            service_name: b.service_name, when: b.start_datetime, end: b.end_datetime,
            provider: b.resource_name, status: 'reminder',
            venue: b.appointment_type === 'virtual' ? 'Online' : b.venue,
            total: b.total_amount,
          });
          sendMail({ to: b.customer_email, ...tpl });
        } catch { /* ignore */ }
      }
    }
    if (rows.length) console.log(`[reminder] sent ${rows.length} reminder(s)`);
  } catch (e) {
    console.error('[reminder] tick failed:', e.message);
  }
}

async function imminentTick() {
  try {
    // Bookings whose start_datetime is between (now - 2 min) and (now + 5 min)
    // and we haven't fired the imminent notification yet.
    const [rows] = await pool.query(
      `SELECT b.id, b.start_datetime, b.end_datetime, b.appointment_type, b.meeting_link,
              b.total_amount, b.customer_id, b.service_id,
              s.organiser_id, s.name AS service_name, s.venue,
              r.name AS resource_name,
              uc.full_name AS customer_name, uc.email AS customer_email,
              uo.full_name AS organiser_name, uo.email AS organiser_email
         FROM bookings b
         JOIN services s ON s.id=b.service_id
         JOIN resources r ON r.id=b.resource_id
         JOIN users uc ON uc.id=b.customer_id
         JOIN users uo ON uo.id=s.organiser_id
        WHERE b.status IN ('confirmed','reserved','pending')
          AND b.imminent_notify_sent=0
          AND b.start_datetime <= DATE_ADD(NOW(), INTERVAL 5 MINUTE)
          AND b.start_datetime >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)`);

    for (const b of rows) {
      await pool.query('UPDATE bookings SET imminent_notify_sent=1 WHERE id=?', [b.id]);

      const isVirtual = b.appointment_type === 'virtual';
      const venue = isVirtual ? (b.meeting_link || 'Online') : b.venue;

      // Customer notification + email
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES (?, 'meeting_now', ?, ?, ?)`,
        [b.customer_id, isVirtual ? 'Your meeting is starting now' : 'Your appointment is starting now',
         isVirtual ? `${b.service_name} — tap to join the meeting room.` : `${b.service_name} at ${b.venue || ''}.`,
         `/booking/${b.id}`]);
      if (b.customer_email) {
        try {
          const tpl = bookingEmail({
            name: b.customer_name, action: 'starting',
            service_name: b.service_name, when: b.start_datetime, end: b.end_datetime,
            provider: b.resource_name, status: 'starting now', venue, total: b.total_amount,
          });
          sendMail({ to: b.customer_email, ...tpl });
        } catch { /* ignore */ }
      }

      // Organiser notification + email — only for virtual bookings (in-person
      // organiser is already onsite). Skip if organiser somehow IS the customer.
      if (isVirtual && b.organiser_id !== b.customer_id) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, body, link)
           VALUES (?, 'meeting_now', ?, ?, ?)`,
          [b.organiser_id, 'Meeting starting — host required',
           `${b.customer_name} is waiting for ${b.service_name}. Tap to join.`,
           `/organiser/meetings`]);
        if (b.organiser_email) {
          try {
            const tpl = bookingEmail({
              name: b.organiser_name, action: 'host_join',
              service_name: b.service_name, when: b.start_datetime, end: b.end_datetime,
              provider: b.customer_name, status: 'host required', venue,
              total: b.total_amount,
            });
            sendMail({ to: b.organiser_email, ...tpl });
          } catch { /* ignore */ }
        }
      }
    }
    if (rows.length) console.log(`[imminent] notified ${rows.length} party-pair(s)`);
  } catch (e) {
    console.error('[imminent] tick failed:', e.message);
  }
}

function start() {
  reminderTick(); imminentTick();
  return setInterval(() => { reminderTick(); imminentTick(); }, 60 * 1000);
}

module.exports = { start, reminderTick, imminentTick };
