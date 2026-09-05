import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' AND is_nullable = 'NO';
  `);
  console.log('Required columns in tasks:', res.rows);
  await client.end();
}

run();
