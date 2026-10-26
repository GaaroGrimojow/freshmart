// Script to setup PostgreSQL database, run migrations, and seed initial grocery data
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const { runMigrations } = require('./migrate');
const { seedProducts } = require('./seed');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setup() {
  console.log('🚀 Starting FreshMart automated database setup...');

  const connectionString = process.env.DATABASE_URL;

  // If using a managed cloud database (like Render PostgreSQL, Neon, etc.),
  // the database is already created, so we directly run migrations and seeds.
  if (connectionString) {
    console.log('🌐 Connected via DATABASE_URL (Cloud PostgreSQL detected).');
    try {
      await runMigrations();
      await seedProducts();
      console.log('\n✨ FreshMart PostgreSQL cloud database setup completed successfully! 🎉\n');
      return;
    } catch (err) {
      console.error('\n❌ Database setup encountered an error:', err.message);
      process.exit(1);
    }
  }

  // Local development fallback
  const dbName = process.env.PGDATABASE || process.env.DB_NAME || 'freshmart_db';
  const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10);
  const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres';

  console.log(`📡 Connecting to PostgreSQL at ${host}:${port} as user '${user}'...`);

  const adminClient = new Client({
    host,
    port,
    database: 'postgres',
    user,
    password,
  });

  try {
    await adminClient.connect();
    console.log('Connected to administrative database "postgres".');

    const checkDb = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it now...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created database "${dbName}" successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }

    await adminClient.end();

    // Now run migrations and seeding on freshmart_db
    await runMigrations();
    await seedProducts();

    console.log('\n FreshMart PostgreSQL database setup completed successfully! 🎉\n');
  } catch (err) {
    if (adminClient) {
      try { await adminClient.end(); } catch (_) {}
    }

    console.error('\n❌ Database setup encountered an error:');
    console.error(`Message: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.error('\n👉 Cause: PostgreSQL server is not running on port ' + port + '.');
      console.error('👉 Solution: Open Services (services.msc) on Windows, find "postgresql-x64-..." and start it, or launch pgAdmin 4.');
    } else if (err.code === '28P01') {
      console.error('\n👉 Cause: PostgreSQL password authentication failed for user "' + user + '".');
      console.error('👉 Solution: Update PGPASSWORD in node-backend/.env to match your PostgreSQL password set during pgAdmin installation.');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  setup();
}

module.exports = { setup };
