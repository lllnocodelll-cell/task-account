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
  try {
    await client.connect();
    
    // Check all functions in pg_proc that reference notifications
    const procs = await client.query(`
      SELECT proname, pg_get_functiondef(oid) as def
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND pg_get_functiondef(oid) ILIKE '%notifications%';
    `);
    console.log(`Found ${procs.rows.length} functions referencing notifications:`);
    for (const r of procs.rows) {
      console.log(`- ${r.proname}`);
    }

    // Check pg_cron if available
    try {
      const cronRes = await client.query(`
        SELECT * FROM cron.job;
      `);
      console.log('--- CRON JOBS ---');
      console.table(cronRes.rows);
    } catch (e) {
      console.log('cron.job not accessible or no pg_cron');
    }

  } finally {
    await client.end();
  }
}

run();
