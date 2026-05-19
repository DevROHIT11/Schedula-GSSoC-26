const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');

exports.list = async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM discount_codes WHERE is_active=1 ORDER BY id DESC');
  res.json({ codes: rows });
};

exports.validate = async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal || 0);
  if (!code) throw new HttpError(400, 'code required');
  const [rows] = await pool.query('SELECT * FROM discount_codes WHERE code=?', [code]);
  if (!rows.length) throw new HttpError(404, 'Invalid code');
  const d = rows[0];
  if (!d.is_active) throw new HttpError(400, 'Code inactive');
  if (d.max_uses > 0 && d.used_count >= d.max_uses) throw new HttpError(400, 'Code limit reached');
  if (d.active_from && new Date(d.active_from) > new Date()) throw new HttpError(400, 'Code not active yet');
  if (d.active_to && new Date(d.active_to) < new Date()) throw new HttpError(400, 'Code expired');
  if (subtotal && Number(d.min_amount) > subtotal)
    throw new HttpError(400, `Minimum order ₹${d.min_amount} required`);

  const discount = d.type === 'percent'
    ? +(subtotal * Number(d.value) / 100).toFixed(2)
    : Math.min(subtotal, Number(d.value));

  res.json({
    code: d.code,
    type: d.type,
    value: Number(d.value),
    discount_amount: discount,
    description: d.description,
  });
};

exports.create = async (req, res) => {
  const { code, type, value, min_amount, max_uses, active_from, active_to, description } = req.body;
  if (!code || !value) throw new HttpError(400, 'code and value required');
  await pool.query(
    `INSERT INTO discount_codes (code, type, value, min_amount, max_uses, active_from, active_to, description)
     VALUES (?,?,?,?,?,?,?,?)`,
    [String(code).toUpperCase(), type === 'flat' ? 'flat' : 'percent', Number(value),
     Number(min_amount) || 0, Number(max_uses) || 0,
     active_from || null, active_to || null, description || null]);
  res.status(201).json({ message: 'created' });
};
