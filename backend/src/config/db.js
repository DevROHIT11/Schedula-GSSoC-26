const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appointment_app',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true,
  multipleStatements: false,
});

pool.initializeDatabase = async function() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_key VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        razorpay_order_id VARCHAR(120) NOT NULL UNIQUE,
        payment_id VARCHAR(120) NULL UNIQUE,
        payment_signature VARCHAR(255) NULL,
        status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(40) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_subord_user (user_id)
      ) ENGINE=InnoDB;
    `);
    try {
      await pool.query('ALTER TABLE subscription_orders ADD UNIQUE INDEX uq_payment_id (payment_id)');
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') console.warn('[DB] Note: could not add uq_payment_id:', err.message);
    }
    console.log('[DB] subscription_orders table ready');
  } catch (e) {
    console.error('[DB] Error creating subscription_orders table:', e.message);
    throw e;
  }
};

module.exports = pool;
