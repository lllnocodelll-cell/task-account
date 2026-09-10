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
  await client.connect();
  const res = await client.query(`
    SELECT schemaname, tablename, policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'client_document_logs';
  `);
  console.log('client_document_logs policies:', res.rows);
  await client.end();
}

run();
