const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');

const PUBLIC = `
  s.id, s.name, s.description, s.image_url, s.duration_minutes, s.venue,
  s.appointment_type, s.virtual_provider, s.virtual_link,
  s.country, s.state, s.district, s.city, s.price, s.tax_percent,
  s.manage_capacity, s.max_per_slot, s.is_published, s.share_token,
  s.rating, s.rating_count, s.organiser_id, s.category_id,
  u.full_name AS organiser_name,
  c.name AS category_name, c.\`key\` AS category_key, c.color AS category_color, c.icon AS category_icon
`;

exports.list = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC}, ss.created_at AS saved_at
       FROM saved_services ss
       JOIN services s ON s.id=ss.service_id
       JOIN users u ON u.id=s.organiser_id
       LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE ss.user_id=? AND s.is_published=1
      ORDER BY ss.id DESC`,
    [req.user.id]);
  res.json({ services: rows });
};

exports.add = async (req, res) => {
  const sid = Number(req.params.id);
  const [rows] = await pool.query('SELECT id, is_published FROM services WHERE id=?', [sid]);
  if (!rows.length) throw new HttpError(404, 'Service not found');
  if (!rows[0].is_published) throw new HttpError(400, 'Cannot save an unpublished service');
  await pool.query(
    'INSERT IGNORE INTO saved_services (user_id, service_id) VALUES (?, ?)',
    [req.user.id, sid]);
  res.status(201).json({ saved: true });
};

exports.remove = async (req, res) => {
  const sid = Number(req.params.id);
  await pool.query(
    'DELETE FROM saved_services WHERE user_id=? AND service_id=?',
    [req.user.id, sid]);
  res.json({ saved: false });
};

exports.ids = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT service_id FROM saved_services WHERE user_id=?',
    [req.user.id]);
  res.json({ ids: rows.map((r) => r.service_id) });
};
