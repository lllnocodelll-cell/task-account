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
      SELECT n.id, n.user_id, p.email, n.type, n.title, n.message, n.created_at
      FROM notifications n
      LEFT JOIN profiles p ON p.id = n.user_id
      WHERE n.user_id = '108375a6-cc17-4c7b-80f8-72618b24ac78'
      ORDER BY n.created_at DESC;
    `);
    console.table(res.rows);

  } finally {
    await client.end();
  }
}

run();
