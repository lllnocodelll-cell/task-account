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
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'client_document_logs';
  `);
  console.log('Columns in client_document_logs:', res.rows);

  const sample = await client.query(`
    SELECT * FROM client_document_logs LIMIT 5;
  `);
  console.log('Sample rows:', sample.rows);

  await client.end();
}

run().catch(console.error);
