import pool from '../src/config/db.js';

async function migrate() {
  try {
    console.log('Migrating ai_conversations table...');
    
    // Check if channel column exists
    const [cols] = await pool.query("SHOW COLUMNS FROM ai_conversations LIKE 'channel'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE ai_conversations ADD COLUMN channel VARCHAR(32) NOT NULL DEFAULT 'general' AFTER user_id");
      console.log('Added channel column to ai_conversations.');
    } else {
      console.log('channel column already exists in ai_conversations.');
    }

    console.log('Creating ai_feedback table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel VARCHAR(32) NOT NULL DEFAULT 'general',
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        rating ENUM('positive', 'negative') NOT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('ai_feedback table ready.');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
