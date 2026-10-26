// FreshMart Secure PostgreSQL Backup Utility
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
const port = process.env.DB_PORT || process.env.PGPORT || '5432';
const database = process.env.DB_NAME || process.env.PGDATABASE || 'freshmart_db';
const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || '';

const outputFile = path.join(__dirname, '..', '..', 'freshmart_backup.sql');

// Search for pg_dump executable in standard locations
const standardPaths = [
  'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'pg_dump'
];

let pgDumpPath = 'pg_dump';
for (const p of standardPaths) {
  if (p === 'pg_dump' || fs.existsSync(p)) {
    pgDumpPath = p;
    break;
  }
}

console.log('📦 Starting FreshMart database backup...');
console.log(`📡 Connecting to PostgreSQL at ${host}:${port} (Database: ${database})...`);

const args = [
  '-h', host,
  '-p', port,
  '-U', user,
  '-d', database,
  '--clean',
  '--if-exists',
  '-f', outputFile
];

const env = { ...process.env, PGPASSWORD: password };
const proc = spawn(pgDumpPath, args, { env, shell: false });

proc.stdout.on('data', (d) => process.stdout.write(d));
proc.stderr.on('data', (d) => process.stderr.write(d));

proc.on('close', (code) => {
  if (code === 0 && fs.existsSync(outputFile)) {
    const stats = fs.statSync(outputFile);
    console.log(`\n✅ Backup successfully generated!`);
    console.log(`📁 File: ${outputFile}`);
    console.log(`📊 Size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log(`🔒 Your database credentials were not logged or exposed.`);
  } else {
    console.error(`\n❌ Backup process exited with code ${code}.`);
  }
});
