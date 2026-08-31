import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncSchema() {
  console.log('🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected to Supabase!');

  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL DEFAULT 'Ka-Budget',
      email VARCHAR(150) UNIQUE,
      password_hash VARCHAR(255),
      currency VARCHAR(10) DEFAULT 'PHP',
      theme VARCHAR(20) DEFAULT 'system',
      civil_status VARCHAR(20) DEFAULT 'single',
      profile_completed SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income_sources (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      frequency VARCHAR(30) DEFAULT 'semi-monthly',
      payday_1 INT DEFAULT 15,
      payday_2 INT DEFAULT 30,
      is_active SMALLINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS obligations (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      due_day INT,
      cutoff_assignment VARCHAR(30) DEFAULT 'auto',
      is_active SMALLINT DEFAULT 1,
      is_variable SMALLINT DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS obligation_payments (
      id SERIAL PRIMARY KEY,
      obligation_id INT NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_paid DECIMAL(12,2) NOT NULL,
      paid_date DATE NOT NULL,
      payday_cycle_id INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(50) DEFAULT 'dependent',
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS allowances (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      family_member_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
      amount DECIMAL(12,2) NOT NULL,
      period VARCHAR(30) DEFAULT 'per-payday',
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payday_cycles (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      income_source_id INT REFERENCES income_sources(id) ON DELETE SET NULL,
      expected_amount DECIMAL(12,2) NOT NULL,
      actual_amount DECIMAL(12,2),
      payday_date DATE NOT NULL,
      next_payday_date DATE NOT NULL,
      status VARCHAR(30) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payday_allocations (
      id SERIAL PRIMARY KEY,
      payday_cycle_id INT NOT NULL REFERENCES payday_cycles(id) ON DELETE CASCADE,
      category VARCHAR(50) NOT NULL,
      reference_id INT,
      label VARCHAR(150) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payday_cycle_id INT REFERENCES payday_cycles(id) ON DELETE SET NULL,
      family_member_id INT REFERENCES family_members(id) ON DELETE SET NULL,
      category VARCHAR(100) DEFAULT 'general',
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      expense_date DATE NOT NULL,
      mood VARCHAR(30) DEFAULT 'need',
      receipt_url VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      type VARCHAR(50) DEFAULT 'regular',
      target_amount DECIMAL(12,2) NOT NULL,
      current_amount DECIMAL(12,2) DEFAULT 0,
      target_date DATE,
      per_payday_contribution DECIMAL(12,2) DEFAULT 0,
      is_active SMALLINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS savings_transactions (
      id SERIAL PRIMARY KEY,
      savings_goal_id INT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(12,2) NOT NULL,
      transaction_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL DEFAULT 'Wishlist Item',
      estimated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      category VARCHAR(50) DEFAULT 'general',
      notes TEXT,
      purchased_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Wishlist Item';
    ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL(12,2) DEFAULT 0;
    ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
    ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP;

    CREATE TABLE IF NOT EXISTS utang (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      person_name VARCHAR(150) NOT NULL,
      direction VARCHAR(20) NOT NULL DEFAULT 'owed_to_me',
      total_amount DECIMAL(12,2) NOT NULL,
      remaining_amount DECIMAL(12,2) NOT NULL,
      due_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel VARCHAR(50) NOT NULL DEFAULT 'general',
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      mode VARCHAR(20) DEFAULT 'auto',
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_training_feedbacks (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel VARCHAR(50) NOT NULL DEFAULT 'general',
      user_query TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      rating VARCHAR(10) NOT NULL,
      feedback_tag VARCHAR(50),
      correction_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      setting_key VARCHAR(100) NOT NULL,
      setting_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, setting_key)
    );

    INSERT INTO users (id, name, email, profile_completed) 
    VALUES (1, 'Jerald', 'user@budgetph.local', 0)
    ON CONFLICT (id) DO NOTHING;
  `;

  await client.query(ddl);
  console.log('✨ Supabase PostgreSQL schema synchronized successfully with all tables!');
  await client.end();
}

syncSchema().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
