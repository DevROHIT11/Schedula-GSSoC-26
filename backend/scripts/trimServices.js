// Soft-delete excess seeded services so each category keeps at most N rows.
// Preserves the oldest curated services (lowest IDs are the hand-written ones).
//
// Usage: node scripts/trimServices.js [N=20]

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../src/config/db');

(async () => {
  const keep = Number(process.argv[2] || 20);
  console.log(`[trim] keeping at most ${keep} services per category`);

  const [cats] = await pool.query('SELECT id, `key`, name FROM service_categories');
  let trimmed = 0;
  for (const cat of cats) {
    const [over] = await pool.query(
      `SELECT id FROM services
        WHERE category_id=? AND is_deleted=0
        ORDER BY id ASC
        LIMIT 18446744073709551615 OFFSET ?`,                // keep oldest N
      [cat.id, keep]);
    if (!over.length) continue;
    const ids = over.map((r) => r.id);
    const [r] = await pool.query(
      `UPDATE services SET is_deleted=1, is_published=0 WHERE id IN (?)`, [ids]);
    trimmed += r.affectedRows;
    console.log(`[trim] ${cat.key}: soft-deleted ${r.affectedRows}`);
  }
  console.log(`[trim] total soft-deleted: ${trimmed}`);
  await pool.end();
})().catch((e) => { console.error('[trim] failed:', e.message); process.exit(1); });
