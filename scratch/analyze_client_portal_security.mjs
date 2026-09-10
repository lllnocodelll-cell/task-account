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

    // 1. Todas as políticas RLS para tabelas do sistema
    const policiesRes = await client.query(`
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual, 
        with_check 
      FROM pg_policies 
      WHERE schemaname IN ('public', 'storage')
      ORDER BY tablename, policyname;
    `);

    console.log('=== POLÍTICAS RLS NO POSTGRESQL ===');
    for (const p of policiesRes.rows) {
      console.log(`\nTable: [${p.schemaname}.${p.tablename}] | Policy: "${p.policyname}" | CMD: ${p.cmd} | Permissive: ${p.permissive}`);
      console.log(`  USING: ${p.qual}`);
      if (p.with_check) console.log(`  WITH CHECK: ${p.with_check}`);
    }

    // 2. Status de RLS habilitado por tabela
    const rlsStatusRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    console.log('\n=== STATUS DO RLS NAS TABELAS PÚBLICAS ===');
    console.table(rlsStatusRes.rows);

    // 3. Storage Buckets e RLS
    const bucketsRes = await client.query(`
      SELECT id, name, public, avif_autodetection, file_size_limit, allowed_mime_types
      FROM storage.buckets;
    `);
    console.log('\n=== STORAGE BUCKETS ===');
    console.table(bucketsRes.rows);

    // 4. Definição da função check_client_access
    const funcRes = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'check_client_access';
    `);
    console.log('\n=== DEFINIÇÃO DE check_client_access ===');
    if (funcRes.rows[0]) {
      console.log(funcRes.rows[0].pg_get_functiondef);
    }

    // 5. Definição da função get_auth_org_id
    const orgFuncRes = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'get_auth_org_id';
    `);
    console.log('\n=== DEFINIÇÃO DE get_auth_org_id ===');
    if (orgFuncRes.rows[0]) {
      console.log(orgFuncRes.rows[0].pg_get_functiondef);
    }

  } catch (err) {
    console.error('Erro na inspeção:', err);
  } finally {
    await client.end();
  }
}

inspect();
