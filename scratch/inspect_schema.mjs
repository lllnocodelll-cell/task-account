import pg from 'pg';

const config = {
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
};

async function run() {
  const client = new pg.Client(config);
  await client.connect();
  const res = await client.query(`
    SELECT id, task_name, client_id, created_at 
    FROM tasks 
    WHERE client_id = '969159b6-a1fa-47b3-97f7-148fc6a61116';
  `);
  console.log('TASKS FOR 969159b6-a1fa-47b3-97f7-148fc6a61116:', res.rows);

  const res2 = await client.query(`
    SELECT prosrc FROM pg_proc WHERE proname = 'notify_client_legislation_added';
  `);
  console.log('TRIGGER FUNCTION notify_client_legislation_added:', res2.rows[0]?.prosrc);

  await client.end();
}

run().catch(console.error);
