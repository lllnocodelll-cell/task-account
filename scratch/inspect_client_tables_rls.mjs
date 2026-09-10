import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    await client.connect();

    const tables = [
      'client_documents', 
      'client_document_logs', 
      'clients', 
      'client_accesses', 
      'client_certificates', 
      'client_contacts', 
      'client_licenses', 
      'client_activities',
      'tasks',
      'task_workflows',
      'chat_channels',
      'chat_messages',
      'notifications',
      'profiles',
      'members'
    ];

    const res = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        cmd,
        roles,
        qual,
        with_check
      FROM pg_policies
      WHERE (schemaname = 'public' AND tablename = ANY($1))
         OR (schemaname = 'storage' AND tablename = 'objects')
      ORDER BY tablename, cmd, policyname;
    `, [tables]);

    console.log('=== DETALHAMENTO DE POLÍTICAS RLS DAS TABELAS DO CLIENTE & STORAGE ===\n');
    for (const row of res.rows) {
      console.log(`[${row.schemaname}.${row.tablename}] Policy: "${row.policyname}" | CMD: ${row.cmd}`);
      console.log(`  USING: ${row.qual}`);
      if (row.with_check) {
        console.log(`  WITH CHECK: ${row.with_check}`);
      }
      console.log('---');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspect();
