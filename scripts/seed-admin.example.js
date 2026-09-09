import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// ⚠️  THIS IS A TEMPLATE — DO NOT COMMIT THE REAL VERSION WITH CREDENTIALS
// Copy this file to seed-admin.js (which is gitignored) and fill in your values.

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/cricapp',
});

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';

  // 1. Create admin user if not exists
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  let userId;

  if (existing.rows.length === 0) {
    userId = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (id, email, username, password_hash, display_name, is_admin, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW())`,
      [userId, email, username, hash, 'Admin User'],
    );
    console.log(`Created admin user: ${email}`);
  } else {
    userId = existing.rows[0].id;
    await pool.query(
      `UPDATE users SET is_admin = true, email_verified = true WHERE id = $1`,
      [userId],
    );
    console.log(`Updated existing user to admin: ${email}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
