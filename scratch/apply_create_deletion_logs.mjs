import pg from 'pg';
import fs from 'fs';

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
  console.log('Conectado ao PostgreSQL.');

  const sql = fs.readFileSync('supabase/migrations/20260919180000_create_client_document_deletion_logs.sql', 'utf8');
  console.log('Executando migration...');
  await client.query(sql);
  console.log('Migration aplicada com sucesso!');

  const check = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'client_document_deletion_logs';
  `);
  console.log('Colunas criadas:', check.rows);

  await client.end();
}

run().catch((err) => {
  console.error('Erro na migration:', err);
  process.exit(1);
});
