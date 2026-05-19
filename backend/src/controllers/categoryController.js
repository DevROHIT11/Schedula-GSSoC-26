const pool = require('../config/db');

exports.list = async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.\`key\`, c.name, c.icon, c.color, c.description, c.sort_order,
            c.tax_percentage,
            (SELECT COUNT(*) FROM services s WHERE s.category_id=c.id AND s.is_published=1) AS service_count
       FROM service_categories c
       ORDER BY c.sort_order, c.id`);
  res.json({ categories: rows });
};
