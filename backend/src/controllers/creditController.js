const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');

// Returns balance: sum of unexpired earn rows + spend rows (which are negative)
async function getBalance(userId, conn = null) {
  const c = conn || pool;
  const [rows] = await c.query(
    `SELECT COALESCE(SUM(amount),0) AS bal FROM credit_transactions
      WHERE user_id=? AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]);
  return Number(rows[0].bal) || 0;
}

exports.balance = async (req, res) => {
  const balance = await getBalance(req.user.id);
  const [tx] = await pool.query(
    `SELECT id, amount, reason, expires_at, created_at
       FROM credit_transactions WHERE user_id=?
       ORDER BY id DESC LIMIT 50`,
    [req.user.id]);
  // expiring soon: positive balances expiring in next 30 days
  const [expiring] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS amt FROM credit_transactions
      WHERE user_id=? AND amount > 0
        AND expires_at IS NOT NULL
        AND expires_at > NOW() AND expires_at < DATE_ADD(NOW(), INTERVAL 30 DAY)`,
    [req.user.id]);
  res.json({ balance, expiring_soon: Number(expiring[0].amt) || 0, transactions: tx });
};

exports.grant = async (req, res) => {
  const { user_id, amount, reason, days_valid } = req.body;
  if (!user_id || !Number(amount)) throw new HttpError(400, 'user_id and amount required');
  const exp = days_valid ? `DATE_ADD(NOW(), INTERVAL ${Number(days_valid)} DAY)` : 'NULL';
  await pool.query(
    `INSERT INTO credit_transactions (user_id, amount, reason, expires_at)
     VALUES (?, ?, ?, ${exp})`,
    [Number(user_id), Number(amount), String(reason || 'Manual grant')]);
  res.json({ message: 'granted' });
};

module.exports.getBalance = getBalance;
