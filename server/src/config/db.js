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

  const formatPgQuery = (sql) => {
    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Auto-replace MySQL date functions with Postgres standard
    pgSql = pgSql.replace(/CURRENT_DATE\(\)/gi, 'CURRENT_DATE');
    pgSql = pgSql.replace(/CURDATE\(\)/gi, 'CURRENT_DATE');
    pgSql = pgSql.replace(/MONTH\(([^)]+)\)/gi, 'EXTRACT(MONTH FROM $1)');
    pgSql = pgSql.replace(/YEAR\(([^)]+)\)/gi, 'EXTRACT(YEAR FROM $1)');
    
    // Auto-replace MySQL ORDER BY FIELD
    pgSql = pgSql.replace(
      /ORDER\s+BY\s+FIELD\s*\(\s*(\w+)\s*,\s*([^)]+)\s*\)/gi,
      (match, column, valuesStr) => {
        const values = valuesStr.split(',').map(v => v.trim());
        const caseParts = values.map((val, idx) => `WHEN ${val} THEN ${idx + 1}`).join(' ');
        return `ORDER BY CASE ${column} ${caseParts} ELSE 99 END`;
      }
    );

    // Auto-append RETURNING id for INSERT statements if not present
    const trimmed = pgSql.trim();
    if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
      pgSql += ' RETURNING id';
    }
    return pgSql;
  };

  const processPgResult = (res) => {
    const insertId = (res && res.rows && res.rows.length > 0 && res.rows[0].id !== undefined)
      ? res.rows[0].id
      : (res && res.rows && res.rows.length > 0 && res.rows[0].ID !== undefined ? res.rows[0].ID : null);
    
    if (res && res.rows) {
      res.rows.insertId = insertId;
      res.rows.affectedRows = res.rowCount || 0;
    }
    if (res) {
      res.insertId = insertId;
      res.affectedRows = res.rowCount || 0;
    }
    return [res.rows, res];
  };

  pool = {
    async query(sql, params = []) {
      const pgSql = formatPgQuery(sql);
      const res = await pgPool.query(pgSql, params);
      return processPgResult(res);
    },
    async getConnection() {
      const client = await pgPool.connect();
      return {
        query: async (sql, params = []) => {
          const pgSql = formatPgQuery(sql);
          const res = await client.query(pgSql, params);
          return processPgResult(res);
        },
        beginTransaction: async () => {
          await client.query('BEGIN');
        },
        commit: async () => {
          await client.query('COMMIT');
        },
        rollback: async () => {
          try {
            await client.query('ROLLBACK');
          } catch (e) {
            // ignore rollback error if already closed
          }
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
