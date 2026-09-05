import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  const targetFuncs = ['check_daily_expirations', 'notify_task_concluded', 'notify_new_tutorial'];
  for (const name of targetFuncs) {
    const res = await client.query(`
      SELECT proname, pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND proname = $1;
    `, [name]);
    if (res.rows.length > 0) {
      console.log(`\n================== ${name} ==================`);
      console.log(res.rows[0].def);
    }
  }

  await client.end();
}

main().catch(console.error);
