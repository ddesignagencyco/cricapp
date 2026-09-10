const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://cricapp:cricapp_dev_password@localhost:5432/cricapp' });

(async () => {
  try {
    await pool.query("ALTER TABLE comments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved'");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status)');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        reporter_id TEXT NOT NULL,
        reason VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status)');
    console.log('Schema updated successfully');
  } catch (e) {
    console.error('Error:', e.message);
  }
  await pool.end();
})();
