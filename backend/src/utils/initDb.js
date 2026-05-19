// Bootstraps the database from schema.sql + seed.sql
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const dbName = process.env.DB_NAME || 'appointment_app';

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    multipleStatements: true,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const rawSchema = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8');
  const rawSeed   = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'seed.sql'),   'utf8');

  // Managed databases (Aiven, PlanetScale, Render MySQL) block DROP/CREATE DATABASE
  // and force a single fixed DB. Strip those statements and rewrite hardcoded
  // `appointment_app` references to whatever DB_NAME the user configured.
  const adapt = (sql) =>
    sql
      .replace(/^\s*DROP\s+DATABASE[^;]*;/gim, '')
      .replace(/^\s*CREATE\s+DATABASE[^;]*;/gim, '')
      .replace(/^\s*USE\s+[^;]*;/gim, '')
      .replace(/`?appointment_app`?/g, `\`${dbName}\``);

  const schema = adapt(rawSchema);
  const seed   = adapt(rawSeed);

  // Managed DBs strip the schema's DROP DATABASE, so we have to clear tables
  // ourselves to keep db:init idempotent. Disable FK checks while dropping.
  console.log(`Clearing existing tables in \`${dbName}\`...`);
  const [tables] = await conn.query(
    'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?',
    [dbName]
  );
  if (tables.length) {
    const dropList = tables.map((r) => `\`${r.t || r.T || r.table_name}\``).join(', ');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query(`DROP TABLE IF EXISTS ${dropList}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log(`Applying schema to database \`${dbName}\`...`);
  await conn.query(schema);
  console.log('Seeding sample data...');
  await conn.query(seed);

  // Re-hash the demo password to guarantee it matches "password123"
  const hash = await bcrypt.hash('password123', 10);
  await conn.query(`UPDATE \`${dbName}\`.users SET password_hash=?`, [hash]);

  console.log('Database ready. Demo password for all seed users: "password123"');
  await conn.end();
})().catch((e) => {
  console.error('initDb failed:', e.message);
  process.exit(1);
});
