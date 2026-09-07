const pg = require('pg');
const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to Postgres.');

  // 1. Adiciona coluna annexes se não existir
  await client.query(`
    ALTER TABLE public.client_tax_regime_history 
    ADD COLUMN IF NOT EXISTS annexes text[] DEFAULT '{}'::text[];
  `);
  console.log('Column annexes added successfully.');

  // 2. Verifica as colunas da tabela
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_tax_regime_history'
    ORDER BY ordinal_position;
  `);

  console.log('Columns in client_tax_regime_history:');
  console.table(res.rows);

  await client.end();
}

main().catch(console.error);
