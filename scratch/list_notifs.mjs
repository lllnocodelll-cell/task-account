import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT id, type, title, message, link, related_entity_id, read, created_at, user_id
    FROM notifications 
    ORDER BY created_at DESC 
    LIMIT 20;
  `);
  console.log('NOTIFICATIONS IN DB:', JSON.stringify(res.rows, null, 2));
  await client.end();
}

run();
