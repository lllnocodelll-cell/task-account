import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function testRecurringDeduplication() {
  await client.connect();
  console.log("=== TESTE DE RECORRÊNCIA EM LOTE: SIMULAÇÃO DE 6 OCORRÊNCIAS BIMESTRAIS ===\n");

  const userRes = await client.query(`
    SELECT id, full_name, org_id 
    FROM profiles 
    WHERE org_id IS NOT NULL AND full_name IS NOT NULL 
    LIMIT 1;
  `);

  if (userRes.rows.length === 0) {
    console.log("Nenhum usuário encontrado.");
    await client.end();
    return;
  }

  const user = userRes.rows[0];
  const testTaskName = 'Apuração Bimestral PGDAS Teste ' + Date.now();
  const testClientName = 'Cliente Teste Recorrência Ltda';
  const competencies = ['01/2026', '03/2026', '05/2026', '07/2026', '09/2026', '11/2026'];
  const insertedTaskIds = [];

  console.log(`Inserindo 6 tarefas bimestrais para [${user.full_name}]...`);
  for (const comp of competencies) {
    const res = await client.query(`
      INSERT INTO tasks (
        org_id,
        task_name,
        client_name,
        responsible,
        responsibles,
        recurrence,
        competence,
        status,
        priority
      ) VALUES (
        $1, $2, $3, $4, $5, 'bimestral', $6, 'Pendente', 'Alta'
      ) RETURNING id;
    `, [user.org_id, testTaskName, testClientName, user.full_name, [user.full_name], comp]);

    insertedTaskIds.push(res.rows[0].id);
  }

  console.log(`6 tarefas criadas com sucesso (IDs: ${insertedTaskIds.length})!`);

  // Verificar quantas notificações foram geradas para esse lote
  const notifsRes = await client.query(`
    SELECT id, user_id, title, message, type, related_entity_id, created_at
    FROM notifications
    WHERE related_entity_id = ANY($1)
       OR message LIKE $2;
  `, [insertedTaskIds, `%${testTaskName}%`]);

  console.log(`\n📊 Quantidade de notificações geradas: ${notifsRes.rows.length}`);
  console.log("Notificação consolidada criada:\n", notifsRes.rows[0]);

  if (notifsRes.rows.length === 1) {
    console.log("\n✅ SUCESSO ABSOLUTO: Exatamente 1 notificação consolidada foi gerada para o lote de 6 tarefas!");
  } else {
    console.error(`\n❌ FALHA: Foram geradas ${notifsRes.rows.length} notificações em vez de 1.`);
  }

  // Limpeza
  console.log("\nLimpando dados de teste...");
  await client.query(`DELETE FROM notifications WHERE related_entity_id = ANY($1) OR message LIKE $2`, [insertedTaskIds, `%${testTaskName}%`]);
  await client.query(`DELETE FROM tasks WHERE id = ANY($1)`, [insertedTaskIds]);
  console.log("Limpeza concluída com sucesso!");

  await client.end();
}

testRecurringDeduplication().catch(console.error);
