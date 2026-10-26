const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('Loaded DB_PASSWORD length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('Loaded DB_PASSWORD:', process.env.DB_PASSWORD);

const c = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'freshmart_db',
});

c.connect()
  .then(async () => {
    console.log('🎉 CONNECTION SUCCESSFUL!');
    const res = await c.query('SELECT count(*) FROM products');
    console.log('Products count in DB:', res.rows[0].count);
    await c.end();
  })
  .catch((err) => {
    console.error('❌ CONNECTION FAILED:', err.message);
  });
