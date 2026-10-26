// Script to execute PostgreSQL schema migrations
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  const migrationPath = path.join(__dirname, '..', 'migrations', '001_create_tables.sql');
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found at: ${migrationPath}`);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);

    // Apply idempotent column patches for pre-existing schemas
    const columnPatches = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 50;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 50;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'kg';`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT 'Fresh';`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) DEFAULT 4.5;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Local Area';`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '000000';`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total NUMERIC(10, 2);`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(255) DEFAULT 'Cash on Delivery';`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;`,
      `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);`
    ];

    for (const patch of columnPatches) {
      try {
        await client.query(patch);
      } catch (_) {}
    }

    await client.query('COMMIT');
    console.log('✅ Migrations executed successfully! Tables: products, customers, orders, order_items');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
