const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');

exports.dashboard = async (_req, res) => {
  const [[users]] = await pool.query("SELECT COUNT(*) AS c FROM users");
  const [[providers]] = await pool.query(
    "SELECT COUNT(*) AS c FROM users WHERE role='organiser' AND is_active=1");
  const [[customers]] = await pool.query(
    "SELECT COUNT(*) AS c FROM users WHERE role='customer' AND is_active=1");
  const [[apps]] = await pool.query(
    "SELECT COUNT(*) AS c FROM bookings");
  const [[active]] = await pool.query(
    "SELECT COUNT(*) AS c FROM bookings WHERE status IN ('confirmed','reserved','pending')");
  const [[services]] = await pool.query("SELECT COUNT(*) AS c FROM services");
  const [[revenue]] = await pool.query(
    "SELECT COALESCE(SUM(amount),0) AS r FROM payments WHERE status='success'");
  const [[avgRating]] = await pool.query(
    "SELECT COALESCE(AVG(rating),5) AS r, COALESCE(SUM(rating_count),0) AS n FROM services");

  // Trends — last 14 days, by status bucket (created/completed/rescheduled/cancelled)
  const [trendsRaw] = await pool.query(
    `SELECT DATE(created_at) AS d, status, COUNT(*) AS c
       FROM bookings
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY DATE(created_at), status
      ORDER BY d`);
  const trendsByDate = {};
  for (const row of trendsRaw) {
    const k = String(row.d);
    trendsByDate[k] = trendsByDate[k] || { date: k, created: 0, completed: 0, rescheduled: 0, cancelled: 0 };
    trendsByDate[k].created += Number(row.c);
    if (row.status === 'completed') trendsByDate[k].completed += Number(row.c);
    if (row.status === 'rescheduled') trendsByDate[k].rescheduled += Number(row.c);
    if (row.status === 'cancelled') trendsByDate[k].cancelled += Number(row.c);
  }
  // Fill empty days
  const trends = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    trends.push(trendsByDate[k] || { date: k, created: 0, completed: 0, rescheduled: 0, cancelled: 0 });
  }

  // Peak hours (24h)
  const [peakRaw] = await pool.query(
    `SELECT HOUR(start_datetime) AS hour, COUNT(*) AS c
       FROM bookings
      WHERE status IN ('confirmed','reserved','pending','completed')
      GROUP BY HOUR(start_datetime)`);
  const peak = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  for (const r of peakRaw) peak[r.hour].count = Number(r.c);

  // Provider utilization
  const [util] = await pool.query(
    `SELECT u.id, u.full_name, COUNT(b.id) AS bookings,
            COALESCE(SUM(p.amount),0) AS revenue
       FROM users u
       LEFT JOIN services s ON s.organiser_id=u.id
       LEFT JOIN bookings b ON b.service_id=s.id AND b.status IN ('confirmed','completed','reserved','pending')
       LEFT JOIN payments p ON p.booking_id=b.id AND p.status='success'
      WHERE u.role='organiser'
      GROUP BY u.id, u.full_name
      ORDER BY bookings DESC, revenue DESC LIMIT 8`);

  // By category breakdown
  const [byCategory] = await pool.query(
    `SELECT c.name AS category, c.color, COUNT(b.id) AS bookings
       FROM service_categories c
       LEFT JOIN services s ON s.category_id=c.id
       LEFT JOIN bookings b ON b.service_id=s.id
      GROUP BY c.id, c.name, c.color
      ORDER BY bookings DESC`);

  res.json({
    total_users: users.c,
    total_providers: providers.c,
    total_customers: customers.c,
    total_appointments: apps.c,
    active_appointments: active.c,
    total_services: services.c,
    total_revenue: Number(revenue.r),
    customer_satisfaction: Number(avgRating.r),
    rating_count: Number(avgRating.n),
    trends,
    peak_hours: peak,
    provider_utilization: util,
    by_category: byCategory,
  });
};

exports.allUsers = async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, full_name, email, role, is_active, is_verified, phone, city, avatar_url, created_at FROM users ORDER BY id DESC');
  res.json({ users: rows });
};

// Admin feedback feed — supports ?sort=latest|highest, ?service_id=, ?limit=
exports.allReviews = async (req, res) => {
  const sort = String(req.query.sort || 'latest');
  const orderBy = sort === 'highest' ? 'r.rating DESC, r.id DESC' : 'r.id DESC';
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const sid = Number(req.query.service_id) || null;
  const params = [];
  let where = '';
  if (sid) { where = 'WHERE r.service_id = ?'; params.push(sid); }
  const [rows] = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at,
            r.service_id, s.name AS service_name,
            r.customer_id, u.full_name AS customer_name, u.email AS customer_email,
            r.booking_id
       FROM reviews r
       JOIN services s ON s.id = r.service_id
       JOIN users    u ON u.id = r.customer_id
       ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit}`,
    params);
  const [[agg]] = await pool.query(
    'SELECT COALESCE(AVG(rating),0) AS avg, COUNT(*) AS c FROM reviews');
  res.json({
    reviews: rows,
    avg_rating: Number(agg.avg) || 0,
    total: Number(agg.c) || 0,
  });
};

exports.setActive = async (req, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body;
  await pool.query('UPDATE users SET is_active=? WHERE id=?',
    [is_active ? 1 : 0, id]);
  res.json({ message: 'updated' });
};

exports.setRole = async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body;
  if (!['customer','organiser','admin'].includes(role)) throw new HttpError(400, 'invalid role');
  await pool.query('UPDATE users SET role=? WHERE id=?', [role, id]);
  res.json({ message: 'updated' });
};

// Reports & insights (organiser/admin)
exports.reports = async (req, res) => {
  const isOrg = req.user.role === 'organiser';
  const orgFilter = isOrg ? 'AND s.organiser_id=' + Number(req.user.id) : '';

  const [[total]] = await pool.query(
    `SELECT COUNT(*) AS c FROM bookings b JOIN services s ON s.id=b.service_id
      WHERE 1=1 ${orgFilter}`);

  const [peak] = await pool.query(
    `SELECT HOUR(b.start_datetime) AS hour, COUNT(*) AS bookings
       FROM bookings b JOIN services s ON s.id=b.service_id
      WHERE b.status IN ('confirmed','reserved','pending','completed') ${orgFilter}
      GROUP BY HOUR(b.start_datetime)
      ORDER BY bookings DESC, hour ASC`);

  const [util] = await pool.query(
    `SELECT r.id AS resource_id, r.name AS resource_name, s.name AS service_name,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(b.capacity_taken),0) AS capacity_used
       FROM resources r
       JOIN services s ON s.id=r.service_id
       LEFT JOIN bookings b ON b.resource_id=r.id
            AND b.status IN ('confirmed','reserved','pending','completed')
      WHERE 1=1 ${orgFilter}
      GROUP BY r.id, r.name, s.name
      ORDER BY bookings DESC`);

  res.json({ total_appointments: total.c, peak_hours: peak, provider_utilization: util });
};
