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
  const procs = ['on_task_concluded', 'on_task_alerts', 'check_daily_expirations', 'notify_task_conclusion', 'notify_task_alert'];
  const res = await client.query(`
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE proname = ANY($1) OR proname LIKE '%task_concluded%' OR proname LIKE '%task_alert%';
  `, [procs]);

  for (const r of res.rows) {
    console.log(`=== FUNCTION: ${r.proname} ===`);
    console.log(r.prosrc);
    console.log('=====================================\n');
  }

  await client.end();
}

run();
