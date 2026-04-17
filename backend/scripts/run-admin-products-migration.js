const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  let conn;
  try {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../database/migration_admin_products_review.sql'),
      'utf8'
    );

    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ihc',
      multipleStatements: true,
    });

    await conn.query(sql);

    const [rows] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME IN ('violationStatus','reviewStatus','reviewReason','offlineReason','reviewedBy','reviewedAt','rejectCount') ORDER BY COLUMN_NAME"
    );

    console.log('MIGRATION_OK', rows.map((r) => r.COLUMN_NAME));
  } catch (error) {
    console.error('MIGRATION_FAIL', error.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

run();
