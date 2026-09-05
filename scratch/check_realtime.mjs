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

  console.log('=== TABELAS NA PUBLICAÇÃO SUPABASE_REALTIME ===');
  const pub = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  `);
  console.log(pub.rows);

  console.log('\n=== REPLICA IDENTITY DA TABELA NOTIFICATIONS ===');
  const rep = await client.query(`
    SELECT relreplident 
    FROM pg_class 
    WHERE relname = 'notifications';
  `);
  console.log(rep.rows);

  await client.end();
}

main().catch(console.error);
