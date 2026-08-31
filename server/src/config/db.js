import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = DATABASE_URL && (DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://'));

let pool;
let dbType = isPostgres ? 'postgres' : 'mysql';

if (isPostgres) {
  const pgPool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool = {
    async query(sql, params = []) {
      // Replace ? placeholders with $1, $2, $3 for PostgreSQL
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await pgPool.query(pgSql, params);
      return [res.rows, res];
    },
    async getConnection() {
      const client = await pgPool.connect();
      return {
        query: async (sql, params = []) => {
          let paramIndex = 1;
          const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
          const res = await client.query(pgSql, params);
          return [res.rows, res];
        },
        release: () => client.release()
      };
    }
  };
} else {
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASS = process.env.DB_PASS || '';
  const DB_NAME = process.env.DB_NAME || 'budgetph_v2';

  pool = mysql.createPool({
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
}

export async function testConnection() {
  try {
    if (isPostgres) {
      const [rows] = await pool.query('SELECT 1 as test');
      console.log('✅ Connected to Supabase / PostgreSQL cloud database!');
    } else {
      const connection = await pool.getConnection();
      console.log(`✅ Connected to local MySQL database`);
      connection.release();
    }
    return true;
  } catch (err) {
    console.warn(`⚠️ Warning: Could not connect to database: ${err.message}`);
    return false;
  }
}

export default pool;
