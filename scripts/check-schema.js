const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://cricapp:cricapp_dev_password@localhost:5432/cricapp' });

(async () => {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'comments'");
  console.log('comments columns:', r.rows.map(c => c.column_name + ':' + c.data_type).join(', '));
  const r2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'comment_reports'");
  console.log('comment_reports columns:', r2.rows.map(c => c.column_name + ':' + c.data_type).join(', '));
  await pool.end();
})();
