const pool = require('../config/db');

exports.list = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',
    [req.user.id]);
  const [[unread]] = await pool.query(
    'SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0',
    [req.user.id]);
  res.json({ notifications: rows, unread_count: unread.c });
};

exports.markRead = async (req, res) => {
  const id = Number(req.params.id);
  await pool.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?',
    [id, req.user.id]);
  res.json({ message: 'updated' });
};

exports.markAllRead = async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ message: 'updated' });
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await pool.query('DELETE FROM notifications WHERE id=? AND user_id=?', [id, req.user.id]);
  res.json({ message: 'deleted' });
};

exports.removeAll = async (req, res) => {
  await pool.query('DELETE FROM notifications WHERE user_id=?', [req.user.id]);
  res.json({ message: 'cleared' });
};

exports.create = async (userId, { type, title, body, link }) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)',
      [userId, type, title, body || null, link || null]);
  } catch (e) {
    console.error('[notification] failed:', e.message);
  }
};
