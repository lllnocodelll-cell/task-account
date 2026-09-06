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
      SELECT 
        n.user_id,
        p.email,
        p.full_name,
        p.org_id,
        count(*) as count
      FROM notifications n
      LEFT JOIN profiles p ON p.id = n.user_id
      GROUP BY n.user_id, p.email, p.full_name, p.org_id
      ORDER BY count DESC;
    `);
    console.table(res.rows);

  } finally {
    await client.end();
  }
}

run();
