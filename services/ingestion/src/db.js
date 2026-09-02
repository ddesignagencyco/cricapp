import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('unexpected postgres idle client error', err);
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export async function shutdown() {
  await pool.end();
}

export default pool;
