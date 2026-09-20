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
  const exts = await client.query("SELECT extname FROM pg_extension;");
  console.log('Extensions:', exts.rows.map(r => r.extname));

  const subs = await client.query("SELECT count(*) FROM user_push_subscriptions;");
  console.log('Push subscriptions count:', subs.rows[0].count);

  await client.end();
}

main().catch(console.error);
