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
    
    const res = await client.query(`
      SELECT pg_get_functiondef(oid) as def
      FROM pg_proc
      WHERE proname = 'notify_new_task' AND pronamespace = 'public'::regnamespace;
    `);
    
    if (res.rows.length > 0) {
      console.log(res.rows[0].def);
    }

  } finally {
    await client.end();
  }
}

run();
