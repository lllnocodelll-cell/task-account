import pg from 'pg';

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
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('client_tax_regime_history', 'client_legislations', 'client_contacts', 'clients')
      AND table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  const grouped = {};
  res.rows.forEach(r => {
    grouped[r.table_name] = grouped[r.table_name] || [];
    grouped[r.table_name].push(r.column_name);
  });
  console.log(JSON.stringify(grouped, null, 2));
  await client.end();
}

main().catch(console.error);
