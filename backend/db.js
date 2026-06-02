const mysql = require('mysql2');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const required = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
});

pool.on('error', (err) => {
  console.error('DB pool error:', err.message);
});

module.exports = pool.promise();
