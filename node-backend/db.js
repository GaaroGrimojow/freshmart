// FreshMart PostgreSQL Database Connection Manager
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Support standard DB_* variables, PG* variables, or DATABASE_URL
const connectionString = process.env.DATABASE_URL;
const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
const port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
const database = process.env.DB_NAME || process.env.PGDATABASE || 'freshmart_db';
const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres';

const poolConfig = connectionString 
  ? { 
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false }
    }
  : {
      host,
      port,
      database,
      user,
      password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    };

const pool = new Pool(poolConfig);

// Event listener for idle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Test connectivity to PostgreSQL and return detailed diagnostic status
 */
async function testConnection() {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT NOW() AS current_time, current_database() AS db_name');
    
    // Check if tables exist
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map(r => r.table_name);
    const hasRequiredTables = ['customers', 'order_items', 'orders', 'products'].every(t => tableNames.includes(t));

    return {
      connected: true,
      latencyMs: Date.now() - start,
      time: res.rows[0].current_time,
      tables: tableNames,
      schemaReady: hasRequiredTables,
      message: hasRequiredTables 
        ? 'Connected to PostgreSQL. All required tables are present.'
        : 'Connected to PostgreSQL database, but required tables are missing. Please run migrations.'
    };
  } catch (err) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      code: err.code || 'UNKNOWN',
      message: err.code === 'ECONNREFUSED'
        ? 'PostgreSQL service is not responding. Is the database server running?'
        : err.code === '28P01'
        ? 'Database authentication failed. Verify credentials in environment variables.'
        : err.code === '3D000'
        ? 'Configured database does not exist. Run setup migrations.'
        : 'Database connection failed.'
    };
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testConnection,
  config: {
    host,
    port,
    database,
    user,
  }
};
