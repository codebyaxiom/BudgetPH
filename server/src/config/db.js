import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'budgetph_v2';

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Connected to database: ${DB_NAME}`);
    connection.release();
    return true;
  } catch (err) {
    console.warn(`⚠️ Warning: Could not connect to '${DB_NAME}': ${err.message}`);
    return false;
  }
}

export default pool;
