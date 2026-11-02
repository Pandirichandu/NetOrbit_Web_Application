const { Client } = require('../apps/api/node_modules/pg');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'netorbit_user',
    password: 'netorbit_password',
    database: 'netorbit'
  });

  await client.connect();
  await client.query('DELETE FROM refresh_tokens;');
  await client.query('DELETE FROM password_histories;');
  await client.query('DELETE FROM audit_logs;');
  await client.query(`DELETE FROM users WHERE email IN ('lockout-test@demo-isp.com', 'admin@second-isp.com', 'reset-test@demo-isp.com');`);
  await client.query(`DELETE FROM tenants WHERE slug = 'second-isp';`);
  await client.query(`UPDATE users SET mfa_enabled = false, mfa_secret = null, login_attempt_count = 0, locked_until = null;`);
  console.log('Database state refreshed to clean baseline!');
  await client.end();
}

run().catch(console.error);
