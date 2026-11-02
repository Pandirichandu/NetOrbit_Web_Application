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
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nas_devices'");
  console.log('nas_devices columns:', res.rows);
  await client.end();
}

run().catch(console.error);
