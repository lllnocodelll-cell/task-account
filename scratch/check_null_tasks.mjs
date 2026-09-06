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
      SELECT count(*) as total_tasks,
             count(*) filter (where org_id is null) as null_org_tasks
      FROM tasks;
    `);
    console.table(res.rows);

    const nullTasks = await client.query(`
      SELECT id, task_name, client_name, responsible, org_id
      FROM tasks
      WHERE org_id is null
      LIMIT 10;
    `);
    console.log('Sample null org tasks:', nullTasks.rows);

  } finally {
    await client.end();
  }
}

run();
