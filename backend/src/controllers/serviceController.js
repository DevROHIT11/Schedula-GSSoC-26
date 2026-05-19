const crypto = require('crypto');
const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');
const { getAvailableSlots } = require('../services/slotService');

const PUBLIC_FIELDS = `
  s.id, s.organiser_id, s.category_id, s.name, s.description, s.image_url,
  s.duration_minutes, s.buffer_minutes, s.venue,
  s.appointment_type, s.virtual_provider, s.virtual_link,
  s.country, s.state, s.district, s.city, s.latitude, s.longitude,
  s.price, s.tax_percent, s.tax_threshold,
  s.manage_capacity, s.max_per_slot, s.group_booking,
  s.advance_payment, s.manual_confirmation, s.assignment_mode,
  s.schedule_type, s.resource_kind, s.is_published, s.share_token,
  s.rating, s.rating_count, s.created_at,
  u.full_name AS organiser_name,
  c.name AS category_name, c.\`key\` AS category_key, c.color AS category_color, c.icon AS category_icon,
  COALESCE(c.tax_percentage, s.tax_percent) AS effective_tax_percent
`;

exports.listPublic = async (req, res) => {
  const { category, q, city, state, country, appointment_type, max_price } = req.query;
  const where = ['s.is_published=1', 's.is_deleted=0'];
  const args = [];
  if (category) { where.push('c.`key`=?'); args.push(String(category)); }
  if (q) { where.push('(s.name LIKE ? OR s.description LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  if (city) { where.push('s.city=?'); args.push(String(city)); }
  if (state) { where.push('s.state=?'); args.push(String(state)); }
  if (country) { where.push('s.country=?'); args.push(String(country)); }
  if (appointment_type && ['in_person','virtual','hybrid'].includes(appointment_type)) {
    where.push('s.appointment_type=?'); args.push(String(appointment_type));
  }
  if (max_price) { where.push('s.price <= ?'); args.push(Number(max_price)); }

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS}
       FROM services s
       JOIN users u ON u.id=s.organiser_id
       LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.rating DESC, s.id DESC`,
    args);
  res.json({ services: rows });
};

exports.recommended = async (req, res) => {
  // Personalised: services in user's city + top-rated overall, dedup
  let userRows = [];
  if (req.user) {
    [userRows] = await pool.query('SELECT city, country FROM users WHERE id=?', [req.user.id]);
  }
  const city = userRows[0]?.city || null;

  const [byCity] = city
    ? await pool.query(
        `SELECT ${PUBLIC_FIELDS}
           FROM services s
           JOIN users u ON u.id=s.organiser_id
           LEFT JOIN service_categories c ON c.id=s.category_id
          WHERE s.is_published=1 AND s.is_deleted=0 AND s.city=?
          ORDER BY s.rating DESC LIMIT 6`, [city])
    : [[]];

  const [topRated] = await pool.query(
    `SELECT ${PUBLIC_FIELDS}
       FROM services s
       JOIN users u ON u.id=s.organiser_id
       LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE s.is_published=1 AND s.is_deleted=0
      ORDER BY s.rating DESC, s.rating_count DESC LIMIT 6`);

  const seen = new Set();
  const merged = [];
  for (const r of [...byCity, ...topRated]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
    if (merged.length >= 6) break;
  }
  res.json({ services: merged });
};

// Cross-field search across name / description / category / city.
exports.search = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ services: [] });
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS}
       FROM services s
       JOIN users u ON u.id=s.organiser_id
       LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE s.is_published=1 AND s.is_deleted=0
        AND (s.name LIKE ? OR s.description LIKE ?
             OR c.name LIKE ? OR c.\`key\` LIKE ?
             OR s.city LIKE ? OR s.state LIKE ? OR s.venue LIKE ?
             OR u.full_name LIKE ?)
      ORDER BY s.rating DESC, s.id DESC LIMIT 30`,
    [like, like, like, like, like, like, like, like]);
  res.json({ query: q, services: rows });
};

// Soft-delete by organiser (their own services) or admin (any).
exports.softDelete = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  await pool.query('UPDATE services SET is_deleted=1, is_published=0 WHERE id=?', [id]);
  res.json({ message: 'deleted' });
};

exports.byShareToken = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, u.full_name AS organiser_name,
            c.name AS category_name, c.\`key\` AS category_key, c.color AS category_color
       FROM services s JOIN users u ON u.id=s.organiser_id
       LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE s.share_token=?`, [req.params.token]);
  if (!rows.length) throw new HttpError(404, 'Not found');
  res.json({ service: rows[0] });
};

exports.getOne = async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT s.*, u.full_name AS organiser_name,
            c.name AS category_name, c.\`key\` AS category_key, c.color AS category_color,
            COALESCE(c.tax_percentage, s.tax_percent) AS effective_tax_percent
       FROM services s JOIN users u ON u.id=s.organiser_id
       LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE s.id=?`, [id]);
  if (!rows.length) throw new HttpError(404, 'Service not found');
  const service = rows[0];

  if (!service.is_published) {
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== service.organiser_id))
      throw new HttpError(403, 'Service not published');
  }

  const [resources] = await pool.query(
    'SELECT id, name, user_id, is_active FROM resources WHERE service_id=? AND is_active=1', [id]);
  const [questions] = await pool.query(
    `SELECT id, question, field_type, options, category, is_required, sort_order
       FROM booking_questions WHERE service_id=? ORDER BY sort_order`, [id]);
  const [weekly] = await pool.query(
    'SELECT day_of_week, start_time, end_time FROM weekly_schedules WHERE service_id=? ORDER BY day_of_week, start_time', [id]);
  const [flex] = await pool.query(
    'SELECT id, start_datetime, end_datetime FROM availability_slots WHERE service_id=? ORDER BY start_datetime', [id]);
  const [reviews] = await pool.query(
    `SELECT r.rating, r.comment, r.created_at, u.full_name
       FROM reviews r JOIN users u ON u.id=r.customer_id
      WHERE r.service_id=? ORDER BY r.id DESC LIMIT 10`, [id]);
  const [notes] = await pool.query(
    `SELECT id, note_date, note, is_blocked FROM calendar_notes
      WHERE (service_id IS NULL OR service_id=?) AND note_date >= CURDATE()
      ORDER BY note_date`, [id]);

  res.json({ service, resources, questions, weekly, flex, reviews, calendar_notes: notes });
};

exports.getSlots = async (req, res) => {
  const id = Number(req.params.id);
  const dateStr = req.query.date;
  const resourceId = req.query.resource_id ? Number(req.query.resource_id) : null;
  if (!dateStr) throw new HttpError(400, 'date is required (YYYY-MM-DD)');
  const date = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Invalid date');

  const [s] = await pool.query('SELECT is_published, organiser_id FROM services WHERE id=?', [id]);
  if (!s.length) throw new HttpError(404, 'Service not found');
  if (!s[0].is_published) {
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== s[0].organiser_id))
      throw new HttpError(403, 'Service is unpublished and not accepting bookings');
  }

  // Resolve user's priority tier (0/1/2) so locked slots can be labeled.
  let userPriority = 0;
  if (req.user) {
    const [up] = await pool.query(
      `SELECT p.priority_level
         FROM user_subscriptions us
         JOIN subscription_plans p ON p.id=us.plan_id
        WHERE us.user_id=? AND us.status='active' AND us.expires_at > NOW()
        ORDER BY p.priority_level DESC LIMIT 1`,
      [req.user.id]);
    if (up.length) userPriority = Number(up[0].priority_level);
  }

  const slots = await getAvailableSlots({ serviceId: id, date, resourceId, userPriority });

  let reason = null;
  if (!slots.length) {
    // Beyond the user's tier-allowed horizon? Tell them so they can upgrade.
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const horizonDays = userPriority >= 2 ? 365 : userPriority >= 1 ? 30 : 14;
    const horizon = new Date(today0.getTime() + horizonDays * 24 * 3600 * 1000);
    if (date.getTime() > horizon.getTime()) {
      reason = userPriority >= 1 ? 'beyond_horizon_platinum' : 'beyond_horizon_upgrade';
    }
    if (!reason) {
    const [blocks] = await pool.query(
      `SELECT id FROM calendar_notes
        WHERE note_date=? AND is_blocked=1 AND (service_id IS NULL OR service_id=?)`,
      [dateStr, id]);
    if (blocks.length) {
      reason = 'date_blocked';
    } else {
      const [resCount] = await pool.query(
        'SELECT COUNT(*) AS c FROM resources WHERE service_id=? AND is_active=1', [id]);
      if (resCount[0].c === 0) reason = 'no_resources';
      else {
        const [svcRow] = await pool.query('SELECT schedule_type FROM services WHERE id=?', [id]);
        if (svcRow[0].schedule_type === 'weekly') {
          const [wsCount] = await pool.query(
            'SELECT COUNT(*) AS c FROM weekly_schedules WHERE service_id=? AND day_of_week=?',
            [id, date.getDay()]);
          reason = wsCount[0].c === 0 ? 'no_schedule_today' : 'all_full';
        } else {
          reason = 'no_flex_window_today';
        }
      }
    }
    } // end if (!reason)
  }
  res.json({ date: dateStr, slots, reason });
};

// ---------- ORGANISER endpoints ----------
exports.listMine = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, u.full_name AS organiser_name,
            c.name AS category_name, c.\`key\` AS category_key, c.color AS category_color
       FROM services s JOIN users u ON u.id=s.organiser_id
       LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE s.organiser_id=? AND s.is_deleted=0 ORDER BY s.id DESC`, [req.user.id]);
  res.json({ services: rows });
};

// Reject inconsistent appointment-type / location / virtual_link combinations.
// Location requirement is satisfied by either an explicit venue OR a city+state pair.
function validateAppointmentShape(b) {
  const appt = ['in_person', 'virtual', 'hybrid'].includes(b.appointment_type)
    ? b.appointment_type : 'in_person';
  const provider = ['google_meet','zoom','custom','none'].includes(b.virtual_provider)
    ? b.virtual_provider : 'none';

  if (appt === 'in_person' || appt === 'hybrid') {
    const hasVenue = b.venue && String(b.venue).trim();
    const hasLoc = b.city && b.state;
    if (!hasVenue && !hasLoc)
      throw new HttpError(400, 'Pick at least state + city (or a venue) for in-person / hybrid appointments');
  }
  if (appt === 'virtual' || appt === 'hybrid') {
    if (provider === 'none')
      throw new HttpError(400, 'Pick a virtual provider for virtual / hybrid appointments');
    if (provider === 'custom') {
      const link = String(b.virtual_link || '').trim();
      if (!/^https?:\/\/[^\s]+$/i.test(link))
        throw new HttpError(400, 'A valid http(s) meeting URL is required for the custom virtual provider');
    }
  }
}

exports.create = async (req, res) => {
  const u = req.user;
  const b = req.body;
  if (!b.name) throw new HttpError(400, 'name is required');
  validateAppointmentShape(b);
  const token = crypto.randomBytes(16).toString('hex');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO services
         (organiser_id,category_id,name,description,image_url,
          duration_minutes,buffer_minutes,venue,
          appointment_type,virtual_provider,virtual_link,
          country,state,district,city,
          price,tax_percent,tax_threshold,
          manage_capacity,max_per_slot,group_booking,
          advance_payment,manual_confirmation,
          assignment_mode,schedule_type,resource_kind,is_published,share_token)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [u.id, b.category_id || null, b.name, b.description || '', b.image_url || null,
       Number(b.duration_minutes) || 30, Number(b.buffer_minutes) || 0, b.venue || '',
       ['in_person','virtual','hybrid'].includes(b.appointment_type) ? b.appointment_type : 'in_person',
       ['google_meet','zoom','custom','none'].includes(b.virtual_provider) ? b.virtual_provider : 'none',
       b.virtual_link || null,
       b.country || null, b.state || null, b.district || null, b.city || null,
       Number(b.price) || 0, Number(b.tax_percent) || 0, Number(b.tax_threshold) || 0,
       b.manage_capacity ? 1 : 0, Number(b.max_per_slot) || 1, b.group_booking ? 1 : 0,
       b.advance_payment ? 1 : 0, b.manual_confirmation ? 1 : 0,
       b.assignment_mode === 'manual' ? 'manual' : 'auto',
       b.schedule_type === 'flexible' ? 'flexible' : 'weekly',
       b.resource_kind === 'resource' ? 'resource' : 'user',
       b.is_published ? 1 : 0, token]
    );
    const serviceId = r.insertId;

    await conn.query(
      'INSERT INTO resources (service_id, name, user_id) VALUES (?,?,?)',
      [serviceId, u.full_name || 'Default Provider', u.id]
    );

    const scheduleType = b.schedule_type === 'flexible' ? 'flexible' : 'weekly';
    if (scheduleType === 'weekly') {
      for (const dow of [1, 2, 3, 4, 5]) {
        await conn.query(
          'INSERT INTO weekly_schedules (service_id, day_of_week, start_time, end_time) VALUES (?,?,?,?)',
          [serviceId, dow, '09:00:00', '17:00:00']
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: serviceId, share_token: token });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

const ensureOwn = async (serviceId, organiserId, role) => {
  const [rows] = await pool.query('SELECT organiser_id FROM services WHERE id=?', [serviceId]);
  if (!rows.length) throw new HttpError(404, 'Service not found');
  if (role !== 'admin' && rows[0].organiser_id !== organiserId)
    throw new HttpError(403, 'Forbidden');
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const b = req.body;

  // Merge with current row so partial updates can still be validated.
  const [cur] = await pool.query('SELECT * FROM services WHERE id=?', [id]);
  if (!cur.length) throw new HttpError(404, 'Service not found');
  const merged = { ...cur[0] };
  for (const k of Object.keys(b)) if (b[k] !== undefined && b[k] !== null) merged[k] = b[k];
  validateAppointmentShape(merged);

  await pool.query(
    `UPDATE services SET
       category_id=COALESCE(?,category_id),
       name=COALESCE(?,name), description=COALESCE(?,description),
       image_url=COALESCE(?,image_url),
       duration_minutes=COALESCE(?,duration_minutes),
       buffer_minutes=COALESCE(?,buffer_minutes),
       venue=COALESCE(?,venue),
       appointment_type=COALESCE(?,appointment_type),
       virtual_provider=COALESCE(?,virtual_provider),
       virtual_link=COALESCE(?,virtual_link),
       country=COALESCE(?,country),
       state=COALESCE(?,state),
       district=COALESCE(?,district),
       city=COALESCE(?,city),
       price=COALESCE(?,price), tax_percent=COALESCE(?,tax_percent),
       tax_threshold=COALESCE(?,tax_threshold),
       manage_capacity=COALESCE(?,manage_capacity),
       max_per_slot=COALESCE(?,max_per_slot),
       group_booking=COALESCE(?,group_booking),
       advance_payment=COALESCE(?,advance_payment),
       manual_confirmation=COALESCE(?,manual_confirmation),
       assignment_mode=COALESCE(?,assignment_mode),
       schedule_type=COALESCE(?,schedule_type),
       resource_kind=COALESCE(?,resource_kind),
       is_published=COALESCE(?,is_published)
     WHERE id=?`,
    [b.category_id ?? null,
     b.name ?? null, b.description ?? null, b.image_url ?? null,
     b.duration_minutes ?? null, b.buffer_minutes ?? null, b.venue ?? null,
     b.appointment_type ?? null, b.virtual_provider ?? null, b.virtual_link ?? null,
     b.country ?? null, b.state ?? null, b.district ?? null, b.city ?? null,
     b.price ?? null, b.tax_percent ?? null, b.tax_threshold ?? null,
     b.manage_capacity == null ? null : (b.manage_capacity ? 1 : 0),
     b.max_per_slot ?? null,
     b.group_booking == null ? null : (b.group_booking ? 1 : 0),
     b.advance_payment == null ? null : (b.advance_payment ? 1 : 0),
     b.manual_confirmation == null ? null : (b.manual_confirmation ? 1 : 0),
     b.assignment_mode ?? null,
     b.schedule_type ?? null,
     b.resource_kind ?? null,
     b.is_published == null ? null : (b.is_published ? 1 : 0),
     id]
  );
  res.json({ message: 'updated' });
};

exports.publish = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  await pool.query('UPDATE services SET is_published=? WHERE id=?',
    [req.body.publish ? 1 : 0, id]);
  res.json({ message: 'updated' });
};

exports.addResource = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const { name, user_id } = req.body;
  if (!name) throw new HttpError(400, 'name required');
  const [r] = await pool.query(
    'INSERT INTO resources (service_id, name, user_id) VALUES (?,?,?)',
    [id, name, user_id || null]);
  res.status(201).json({ id: r.insertId });
};

exports.deleteResource = async (req, res) => {
  const sid = Number(req.params.id);
  const rid = Number(req.params.rid);
  await ensureOwn(sid, req.user.id, req.user.role);
  await pool.query('DELETE FROM resources WHERE id=? AND service_id=?', [rid, sid]);
  res.json({ message: 'deleted' });
};

exports.setWeekly = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM weekly_schedules WHERE service_id=?', [id]);
    for (const it of items) {
      await conn.query(
        'INSERT INTO weekly_schedules (service_id, day_of_week, start_time, end_time) VALUES (?,?,?,?)',
        [id, Number(it.day_of_week), it.start_time, it.end_time]
      );
    }
    await conn.commit();
    res.json({ message: 'saved' });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
};

exports.setFlexible = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM availability_slots WHERE service_id=?', [id]);
    for (const it of items) {
      await conn.query(
        'INSERT INTO availability_slots (service_id, start_datetime, end_datetime) VALUES (?,?,?)',
        [id, it.start_datetime, it.end_datetime]);
    }
    await conn.commit();
    res.json({ message: 'saved' });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
};

exports.setQuestions = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM booking_questions WHERE service_id=?', [id]);
    let order = 0;
    for (const q of items) {
      order += 1;
      await conn.query(
        `INSERT INTO booking_questions (service_id, question, field_type, options, category, is_required, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [id, q.question, q.field_type || 'text', q.options || null, q.category || null,
         q.is_required ? 1 : 0, q.sort_order || order]
      );
    }
    await conn.commit();
    res.json({ message: 'saved' });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
};

exports.setCalendarNotes = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM calendar_notes WHERE service_id=?', [id]);
    for (const it of items) {
      await conn.query(
        'INSERT INTO calendar_notes (service_id, note_date, note, is_blocked) VALUES (?,?,?,?)',
        [id, it.note_date, it.note || '', it.is_blocked ? 1 : 0]);
    }
    await conn.commit();
    res.json({ message: 'saved' });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
};

exports.calendar = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const from = req.query.from || new Date().toISOString().slice(0, 10);
  const to   = req.query.to   || from;
  const [rows] = await pool.query(
    `SELECT b.*, u.full_name AS customer_name, r.name AS resource_name
       FROM bookings b
       JOIN users u ON u.id=b.customer_id
       JOIN resources r ON r.id=b.resource_id
      WHERE b.service_id=? AND b.start_datetime >= ? AND b.start_datetime < DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY b.start_datetime`,
    [id, from + ' 00:00:00', to]
  );
  res.json({ bookings: rows });
};

exports.serviceBookings = async (req, res) => {
  const id = Number(req.params.id);
  await ensureOwn(id, req.user.id, req.user.role);
  const [rows] = await pool.query(
    `SELECT b.*, u.full_name AS customer_name, u.email AS customer_email,
            r.name AS resource_name
       FROM bookings b
       JOIN users u ON u.id=b.customer_id
       JOIN resources r ON r.id=b.resource_id
      WHERE b.service_id=?
      ORDER BY b.start_datetime DESC`, [id]);
  res.json({ bookings: rows });
};

// Reviews
exports.review = async (req, res) => {
  const sid = Number(req.params.id);
  const { rating, comment, booking_id } = req.body;
  const r = Math.max(1, Math.min(5, Number(rating)));
  if (!r) throw new HttpError(400, 'rating required (1..5)');
  const [ins] = await pool.query(
    `INSERT INTO reviews (service_id, customer_id, booking_id, rating, comment) VALUES (?,?,?,?,?)`,
    [sid, req.user.id, booking_id || null, r, String(comment || '').slice(0, 500)]);

  const [agg] = await pool.query(
    'SELECT AVG(rating) AS avg, COUNT(*) AS c FROM reviews WHERE service_id=?', [sid]);
  await pool.query(
    'UPDATE services SET rating=?, rating_count=? WHERE id=?',
    [Number(agg[0].avg).toFixed(2), Number(agg[0].c), sid]);
  res.status(201).json({ message: 'reviewed', id: ins.insertId });
};

// Reviews submitted by the current user — used in Profile "My feedback".
// Supports ?sort=latest|highest (default: latest).
exports.myReviews = async (req, res) => {
  const sort = String(req.query.sort || 'latest');
  const orderBy = sort === 'highest'
    ? 'r.rating DESC, r.id DESC'
    : 'r.id DESC';
  const [rows] = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at,
            r.service_id, s.name AS service_name, s.image_url AS service_image,
            r.booking_id
       FROM reviews r
       JOIN services s ON s.id = r.service_id
      WHERE r.customer_id = ?
      ORDER BY ${orderBy}`,
    [req.user.id]);
  res.json({ reviews: rows });
};
