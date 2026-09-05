import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspectSync() {
  await client.connect();
  const res = await client.query(`
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE proname LIKE '%sync_task_primary_responsible%';
  `);
  console.log(res.rows[0]);
  await client.end();
}

inspectSync();
