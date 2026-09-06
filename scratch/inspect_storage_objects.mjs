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

  console.log('--- Colunas de storage.objects ---');
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'storage' AND table_name = 'objects'
    ORDER BY ordinal_position;
  `);
  console.log(cols.rows.map(c => `${c.column_name}: ${c.data_type}`).join('\n'));

  console.log('\n--- Amostra de registros de storage.objects ---');
  const sample = await client.query(`
    SELECT id, bucket_id, name, owner, (metadata->>'size')::bigint as size_bytes
    FROM storage.objects
    LIMIT 15;
  `);
  console.log(sample.rows);

  console.log('\n--- Buckets existentes ---');
  const buckets = await client.query(`
    SELECT id, name, public FROM storage.buckets;
  `);
  console.log(buckets.rows);

  console.log('\n--- Documentos de Clientes (client_documents) ---');
  const docs = await client.query(`
    SELECT count(*), org_id FROM public.client_documents GROUP BY org_id;
  `);
  console.log(docs.rows);

  await client.end();
}

main().catch(console.error);
