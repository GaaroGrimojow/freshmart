// Script to seed sample Indian grocery products into PostgreSQL
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function seedProducts() {
  console.log('🌱 Checking existing products before seeding...');
  const seedPath = path.join(__dirname, '..', 'seeds', '001_sample_products.sql');

  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found at: ${seedPath}`);
  }

  const client = await pool.connect();
  try {
    const countRes = await client.query('SELECT COUNT(*) AS total FROM products');
    const totalCount = parseInt(countRes.rows[0].total, 10);

    if (totalCount > 0) {
      console.log(`ℹ️ Products table already has ${totalCount} items. Skipping initial seed.`);
      return;
    }

    const jsonPath = path.join(__dirname, '..', 'seeds', 'catalog_products.json');
    if (fs.existsSync(jsonPath)) {
      console.log('📦 Found full catalog file. Seeding all grocery items with parameterized queries...');
      const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      await client.query('BEGIN');

      const chunkSize = 50;
      for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        const valueClauses = [];
        const params = [];
        let pIndex = 1;

        for (const p of chunk) {
          valueClauses.push(
            `($${pIndex}, $${pIndex + 1}, $${pIndex + 2}, $${pIndex + 3}, $${pIndex + 4}, $${pIndex + 5}, $${pIndex + 6}, $${pIndex + 7}, $${pIndex + 8}, $${pIndex + 9})`
          );
          params.push(
            p.name,
            p.description || null,
            p.category,
            parseFloat(p.price) || 0.00,
            parseInt(p.stock || p.stock_quantity || 50, 10),
            parseInt(p.stock_quantity || p.stock || 50, 10),
            p.unit || 'kg',
            p.image_url || null,
            p.badge || 'Fresh',
            parseFloat(p.rating || 4.5)
          );
          pIndex += 10;
        }

        const insertQuery = `
          INSERT INTO products (name, description, category, price, stock, stock_quantity, unit, image_url, badge, rating)
          VALUES ${valueClauses.join(', ')}
        `;
        await client.query(insertQuery, params);
      }

      await client.query('COMMIT');
      const newCount = await client.query('SELECT COUNT(*) AS total FROM products');
      console.log(`✅ Full catalog seeding complete! Successfully added ${newCount.rows[0].total} grocery items.`);
      return;
    }

    const sql = fs.readFileSync(seedPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    const newCount = await client.query('SELECT COUNT(*) AS total FROM products');
    console.log(`✅ Seeding complete! Successfully added ${newCount.rows[0].total} grocery items.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedProducts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedProducts };
