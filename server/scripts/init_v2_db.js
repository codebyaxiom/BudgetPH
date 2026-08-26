import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'budgetph_v2';

async function initV2Database() {
  console.log(`🔌 Connecting to MySQL at ${DB_HOST}:${DB_PORT} as '${DB_USER}'...`);
  
  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL successfully!');
  } catch (err) {
    console.error(`❌ Could not connect to MySQL: ${err.message}`);
    console.error('👉 Please make sure MySQL / Laragon / XAMPP is running.');
    process.exit(1);
  }

  try {
    console.log(`📦 Creating database '${DB_NAME}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    console.log('🏗️  Creating clean relational tables for BudgetPH v2.0...');

    const schemaSql = `
      SET FOREIGN_KEY_CHECKS = 0;

      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE,
        password_hash VARCHAR(255),
        currency VARCHAR(10) DEFAULT 'PHP',
        theme VARCHAR(20) DEFAULT 'system',
        civil_status ENUM('single','married','separated','widowed') DEFAULT 'single',
        profile_completed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS income_sources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        frequency ENUM('semi-monthly','monthly','weekly','bi-weekly','irregular') DEFAULT 'semi-monthly',
        payday_1 INT DEFAULT 15,
        payday_2 INT DEFAULT 30,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS obligations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        category ENUM('electricity','water','internet','rent','loan','credit_card','insurance','subscriptions','school','other') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        due_day INT,
        cutoff_assignment ENUM('1st_cutoff','2nd_cutoff','both','auto') DEFAULT 'auto',
        is_active TINYINT(1) DEFAULT 1,
        is_variable TINYINT(1) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS obligation_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        obligation_id INT NOT NULL,
        user_id INT NOT NULL,
        amount_paid DECIMAL(12,2) NOT NULL,
        paid_date DATE NOT NULL,
        payday_cycle_id INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (obligation_id) REFERENCES obligations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS family_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'dependent',
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS allowances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        family_member_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        period ENUM('daily','per-payday','monthly') DEFAULT 'per-payday',
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS payday_cycles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        income_source_id INT,
        expected_amount DECIMAL(12,2) NOT NULL,
        actual_amount DECIMAL(12,2),
        payday_date DATE NOT NULL,
        next_payday_date DATE NOT NULL,
        status ENUM('simulated','active','completed') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (income_source_id) REFERENCES income_sources(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS payday_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payday_cycle_id INT NOT NULL,
        category ENUM('obligation','allowance','savings','emergency_fund','sinking_fund','wants') NOT NULL,
        reference_id INT,
        label VARCHAR(150) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payday_cycle_id) REFERENCES payday_cycles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        payday_cycle_id INT,
        family_member_id INT,
        category VARCHAR(100) DEFAULT 'general',
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        expense_date DATE NOT NULL,
        mood ENUM('need','want','regret') DEFAULT 'need',
        receipt_url VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (payday_cycle_id) REFERENCES payday_cycles(id) ON DELETE SET NULL,
        FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS savings_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        type ENUM('emergency_fund','regular','sinking_fund') DEFAULT 'regular',
        target_amount DECIMAL(12,2) NOT NULL,
        current_amount DECIMAL(12,2) DEFAULT 0,
        target_date DATE,
        per_payday_contribution DECIMAL(12,2) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS savings_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        goal_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        type ENUM('deposit','withdrawal') DEFAULT 'deposit',
        transaction_date DATE NOT NULL,
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS utang (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        direction ENUM('i_owe','they_owe') NOT NULL,
        person_name VARCHAR(100) NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        amount_paid DECIMAL(12,2) DEFAULT 0,
        due_date DATE,
        description TEXT,
        is_settled TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS utang_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utang_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_date DATE NOT NULL,
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (utang_id) REFERENCES utang(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role ENUM('user','assistant','system') NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_setting (user_id, setting_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      SET FOREIGN_KEY_CHECKS = 1;
    `;

    await connection.query(schemaSql);
    console.log('✅ All 15 relational tables created successfully in budgetph_v2!');

    // Check if default user exists, if not create starter user
    const [existingUsers] = await connection.query('SELECT * FROM users WHERE id = 1');
    if (existingUsers.length === 0) {
      console.log('👤 Creating initial user (Juan dela Cruz)...');
      await connection.query(`
        INSERT INTO users (id, name, email, civil_status, profile_completed)
        VALUES (1, 'Juan dela Cruz', 'juan@budgetph.local', 'single', 0)
      `);
      console.log('✅ Initial user created with profile_completed = 0 (Ready for fast-track onboarding).');
    }

    console.log('\n🎉 BudgetPH v2 Database Initialization Complete!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    await connection.end();
  }
}

initV2Database();
