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
      SELECT id, first_name, last_name, role, org_id
      FROM members;
    `);
    console.log('--- MEMBERS ---');
    console.table(res.rows);

  } finally {
    await client.end();
  }
}

run();
