// FreshMart Automated Database Password Reset & Full Initialization
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { runMigrations } = require('./migrate');
const { seedProducts } = require('./seed');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const targetPassword = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'pranith@#$123';
const dbName = process.env.PGDATABASE || process.env.DB_NAME || 'freshmart_db';
const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10);
const user = process.env.PGUSER || process.env.DB_USER || 'postgres';

async function getAdminClient() {
  const passwordsToTry = [targetPassword, 'pranith@', '', undefined];
  for (const pw of passwordsToTry) {
    const client = new Client({
      host,
      port,
      database: 'postgres',
      user,
      password: pw,
      connectionTimeoutMillis: 2000,
    });
    try {
      await client.connect();
      console.log(`✅ Connected to PostgreSQL administrative database (using ${pw ? 'provided password' : 'no password/trust'}).`);
      return client;
    } catch (e) {
      // continue
    }
  }
  return null;
}

async function resetAndSetup() {
  console.log(`🔄 Target password from .env: "${targetPassword}"`);

  let client = await getAdminClient();
  if (!client) {
    console.error('❌ Could not connect to PostgreSQL with candidate credentials.');
    process.exit(1);
  }

  try {
    // Update postgres user password to targetPassword
    console.log(`🔑 Setting user "${user}" password to "${targetPassword}"...`);
    await client.query(`ALTER USER "${user}" WITH PASSWORD '${targetPassword.replace(/'/g, "''")}';`);
    console.log(`✅ Successfully updated password for user "${user}" to "${targetPassword}"!`);

    // Ensure database exists
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      console.log(`📁 Database "${dbName}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Created database "${dbName}" successfully.`);
    } else {
      console.log(`📁 Database "${dbName}" already exists.`);
    }

    await client.end();

    // Now run schema migrations and seed catalog using new credentials
    console.log('📦 Applying table migrations on freshmart_db...');
    await runMigrations();

    console.log('🌱 Checking / Seeding grocery catalog...');
    await seedProducts();

    // Restore pg_hba.conf from backup if exists
    const hbaPath = 'C:\\Program Files\\PostgreSQL\\18\\data\\pg_hba.conf';
    const hbaBakPath = 'C:\\Program Files\\PostgreSQL\\18\\data\\pg_hba.conf.bak';
    if (fs.existsSync(hbaBakPath)) {
      try {
        fs.copyFileSync(hbaBakPath, hbaPath);
        console.log('🔒 Restored secure scram-sha-256 settings in pg_hba.conf.');
      } catch (copyErr) {
        console.warn('⚠️ Note: Could not restore pg_hba.conf backup automatically:', copyErr.message);
      }
    }

    console.log('\n🎉 FreshMart Database is now 100% configured, seeded, and ready with password "' + targetPassword + '"!\n');
  } catch (err) {
    console.error('❌ Error during setup:', err.message);
    process.exit(1);
  }
}

resetAndSetup();
