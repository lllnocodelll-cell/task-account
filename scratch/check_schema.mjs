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
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'members' ORDER BY ordinal_position");
  console.log('MEMBERS:\n' + res.rows.map(r => `  ${r.column_name}: ${r.data_type}`).join('\n'));
  const resProf = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position");
  console.log('PROFILES:\n' + resProf.rows.map(r => `  ${r.column_name}: ${r.data_type}`).join('\n'));
  await client.end();
}

main().catch(console.error);
