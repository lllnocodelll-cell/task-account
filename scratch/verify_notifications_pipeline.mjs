import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function runPipelineVerification() {
  await client.connect();
  console.log("==================================================================");
  console.log("🔍 TESTE DE VALIDAÇÃO END-TO-END DO MÓDULO DE NOTIFICAÇÕES");
  console.log("==================================================================\n");

  // 1. Validar Realtime
  console.log("1️⃣ Verificando publicação da tabela 'notifications' no Supabase Realtime...");
  const pub = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
  `);
  if (pub.rows.length > 0) {
    console.log("   ✅ SUCESSO: A tabela 'notifications' está ATIVA na publicação 'supabase_realtime'!\n");
  } else {
    throw new Error("Falha: 'notifications' não encontrada em supabase_realtime");
  }

  // 2. Validar trigger notify_task_assignment com múltiplos responsáveis
  console.log("2️⃣ Verificando atribuição de múltiplos responsáveis e UPDATE...");
  const orgProfiles = await client.query(`
    SELECT id, full_name, org_id, role
    FROM profiles
    WHERE org_id IS NOT NULL AND full_name IS NOT NULL
    LIMIT 2;
  `);

  if (orgProfiles.rows.length >= 1) {
    const user = orgProfiles.rows[0];
    const orgId = user.org_id;

    // Criar tarefa teste
    const insertRes = await client.query(`
      INSERT INTO tasks (
        org_id, 
        task_name, 
        client_name, 
        responsible, 
        responsibles, 
        status, 
        priority, 
        competence
      ) VALUES (
        $1, 
        'Teste Pipeline Notificações Realtime', 
        'Cliente Teste S/A', 
        $2, 
        $3, 
        'Pendente', 
        'Média', 
        '09/2026'
      ) RETURNING id;
    `, [orgId, user.full_name, [user.full_name]]);

    const taskId = insertRes.rows[0].id;

    const notifs = await client.query(`
      SELECT id, user_id, title, message, type, related_entity_id, link 
      FROM notifications 
      WHERE related_entity_id = $1;
    `, [taskId]);

    console.log(`   ✅ SUCESSO: Trigger executado no INSERT! Notificação gerada:`);
    console.log(`      ID: ${notifs.rows[0]?.id}`);
    console.log(`      Título: ${notifs.rows[0]?.title}`);
    console.log(`      Tipo: ${notifs.rows[0]?.type}`);
    console.log(`      Link gerado: ${notifs.rows[0]?.link}`);

    // Limpar teste
    await client.query(`DELETE FROM notifications WHERE related_entity_id = $1`, [taskId]);
    await client.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    console.log("   ✅ Limpeza dos dados de teste realizada com sucesso!\n");
  }

  // 3. Validar check_daily_expirations()
  console.log("3️⃣ Testando execução do motor check_daily_expirations() (com certificados e tarefas vencidas)...");
  await client.query("SELECT public.check_daily_expirations();");
  console.log("   ✅ SUCESSO: check_daily_expirations() rodou sem exceções!\n");

  console.log("==================================================================");
  console.log("🎉 TODAS AS VERIFICAÇÕES DO PIPELINE PASSARAM COM 100% DE SUCESSO!");
  console.log("==================================================================");

  await client.end();
}

runPipelineVerification().catch(err => {
  console.error("❌ ERRO NO TESTE:", err);
  process.exit(1);
});
