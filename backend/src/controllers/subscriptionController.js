const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');

exports.plans = async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, \`key\`, name, price_monthly, priority_level, features, color, is_active
       FROM subscription_plans WHERE is_active=1 ORDER BY price_monthly`);
  const plans = rows.map((p) => ({
    ...p,
    features: safeJson(p.features),
    price_monthly: Number(p.price_monthly),
  }));
  res.json({ plans });
};

exports.mine = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT us.id, us.started_at, us.expires_at, us.status,
            p.id AS plan_id, p.\`key\`, p.name, p.price_monthly, p.priority_level, p.features, p.color
       FROM user_subscriptions us
       JOIN subscription_plans p ON p.id=us.plan_id
      WHERE us.user_id=? AND us.status='active' AND us.expires_at > NOW()
      ORDER BY us.id DESC LIMIT 1`,
    [req.user.id]);
  if (!rows.length) return res.json({ subscription: null });
  const r = rows[0];
  res.json({ subscription: { ...r, features: safeJson(r.features), price_monthly: Number(r.price_monthly) } });
};

exports.subscribe = async (req, res) => {
  const planKey = String(req.body.plan_key || '').trim();
  if (!planKey) throw new HttpError(400, 'plan_key required');
  const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE `key`=? AND is_active=1', [planKey]);
  if (!plans.length) throw new HttpError(404, 'Plan not found');
  const plan = plans[0];

  await pool.query(
    `UPDATE user_subscriptions SET status='cancelled' WHERE user_id=? AND status='active'`,
    [req.user.id]);

  const [r] = await pool.query(
    `INSERT INTO user_subscriptions (user_id, plan_id, started_at, expires_at, status)
     VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active')`,
    [req.user.id, plan.id]);

  // Reward credits based on plan
  const bonus = plan.priority_level === 2 ? 1000 : plan.priority_level === 1 ? 300 : 50;
  if (bonus > 0) {
    await pool.query(
      `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 DAY))`,
      [req.user.id, bonus, `${plan.name} subscription bonus`]);
  }

  res.json({ subscription_id: r.insertId, plan: plan.name, bonus_credits: bonus });
};

exports.cancel = async (req, res) => {
  await pool.query(
    `UPDATE user_subscriptions SET status='cancelled' WHERE user_id=? AND status='active'`,
    [req.user.id]);
  res.json({ message: 'Subscription cancelled' });
};

function safeJson(s) {
  try { return JSON.parse(s); } catch { return []; }
}
