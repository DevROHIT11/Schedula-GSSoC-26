// One-shot migration: rewrite all existing virtual booking meeting links
// to working Jitsi rooms so old bookings stop showing "Meeting unavailable".

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../src/config/db');

(async () => {
  const [rows] = await pool.query(
    `SELECT id, service_id FROM bookings
      WHERE appointment_type='virtual' AND (meeting_link IS NULL
            OR meeting_link LIKE 'https://meet.google.com/lookup/sched-%'
            OR meeting_link LIKE 'https://zoom.us/j/1%')`);
  let n = 0;
  for (const b of rows) {
    const room = `SchedulaBkg-${b.service_id}-${b.id}`;
    const link = `https://meet.jit.si/${encodeURIComponent(room)}`;
    await pool.query('UPDATE bookings SET meeting_link=? WHERE id=?', [link, b.id]);
    n++;
  }
  console.log(`[fixMeetingLinks] updated ${n} bookings`);
  await pool.end();
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
