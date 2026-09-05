import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const client = new Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Aplicando migração 20260904204000_deduplicate_task_reassignment.sql...');
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20260904204000_deduplicate_task_reassignment.sql'),
    'utf-8'
  );
  await client.query(sql);
  console.log('Migração de deduplicação de reatribuição aplicada com sucesso!');
  await client.end();
}

run().catch(err => {
  console.error('Erro ao aplicar migração:', err);
  process.exit(1);
});
