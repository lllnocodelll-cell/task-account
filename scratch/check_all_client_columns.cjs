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
  const tables = [
    'clients',
    'client_inscriptions',
    'client_contacts',
    'client_tax_regime_history',
    'client_activities',
    'client_accesses',
    'client_certificates',
    'client_licenses',
    'client_legislations',
    'client_dfe_series'
  ];
  
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log('=== ' + t + ' ===');
    console.log(res.rows.map(r => r.column_name + ' (' + r.data_type + (r.is_nullable === 'NO' ? ', NOT NULL' : '') + ')').join(', '));
  }
  await client.end();
}
main().catch(console.error);
