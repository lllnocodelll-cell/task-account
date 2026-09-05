import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Conectado ao PostgreSQL.');

  try {
    const profilesRes = await client.query(
      'SELECT id, full_name, email, role, org_id FROM profiles WHERE org_id IS NOT NULL ORDER BY created_at ASC LIMIT 5;'
    );
    const orgId = profilesRes.rows[0].org_id;
    const user1 = profilesRes.rows[0];
    const user2 = profilesRes.rows[1];

    console.log(`Organização: ${orgId}`);
    console.log(`De: ${user1.full_name} (${user1.id})`);
    console.log(`Para: ${user2.full_name} (${user2.id})`);

    // Criar cliente de teste temporário
    const cRes = await client.query(`
      INSERT INTO clients (org_id, company_name, trade_name, document)
      VALUES ($1, 'Empresa Teste Reatrib Lote Ltda', 'Teste Reatrib Lote', '99887766000155')
      RETURNING id;
    `, [orgId]);
    const clientId = cRes.rows[0].id;

    // Limpar notificações antigas deste cliente se houver
    await client.query(`DELETE FROM notifications WHERE link LIKE $1;`, [`%/clients?id=${clientId}%`]);

    // Criar lote de 6 tarefas bimestrais para este cliente atribuídas a user1
    const taskIds = [];
    const months = ['01/2026', '03/2026', '05/2026', '07/2026', '09/2026', '11/2026'];
    for (const comp of months) {
      const tRes = await client.query(`
        INSERT INTO tasks (org_id, client_id, client_name, task_name, competence, priority, status, recurrence, responsible, total_time_spent_seconds)
        VALUES ($1, $2, 'Empresa Teste Reatrib Lote Ltda', 'Apuração Fiscal Bimestral', $3, 'Média', 'Pendente', 'bimestral', $4, 0)
        RETURNING id;
      `, [orgId, clientId, comp, user1.full_name]);
      taskIds.push(tRes.rows[0].id);
    }
    console.log(`Criadas ${taskIds.length} tarefas bimestrais em lote.`);

    // Limpar notificações de inserção para focar apenas nas de reatribuição
    await client.query(`DELETE FROM notifications WHERE related_entity_id = ANY($1);`, [taskIds]);

    console.log('\n--- Simulando a Reatribuição em Cascata (Edição com tarefas futuras) ---');
    // Simula a aplicação em cascata do TaskForm atualizando todas as 6 tarefas para user2
    for (const tid of taskIds) {
      await client.query(`
        UPDATE tasks
        SET responsible = $1
        WHERE id = $2;
      `, [user2.full_name, tid]);
    }
    console.log(`Executado UPDATE das ${taskIds.length} tarefas para o novo responsável ${user2.full_name}.`);

    // Consultar as notificações geradas
    const notifs = await client.query(`
      SELECT id, user_id, title, message, type, related_entity_id, created_at
      FROM notifications
      WHERE related_entity_id = ANY($1)
      ORDER BY created_at ASC;
    `, [taskIds]);

    console.log(`\nTotal de notificações geradas: ${notifs.rows.length}`);

    const newRespNotifs = notifs.rows.filter(n => n.user_id === user2.id && n.type === 'task_reassigned');
    const oldRespNotifs = notifs.rows.filter(n => n.user_id === user1.id && n.type === 'task_reassigned');
    const assignedNotifs = notifs.rows.filter(n => n.type === 'task_assigned');

    console.log(`Notificações para o Novo Responsável (${user2.full_name}): ${newRespNotifs.length}`);
    console.log(`Notificações para o Responsável Anterior (${user1.full_name}): ${oldRespNotifs.length}`);
    console.log(`Notificações errôneas de task_assigned durante o update: ${assignedNotifs.length}`);

    if (newRespNotifs.length > 0) {
      console.log('\nExemplo da notificação recebida pelo Novo Responsável:');
      console.log(`Título: ${newRespNotifs[0].title}`);
      console.log(`Mensagem:\n${newRespNotifs[0].message}`);
    }

    if (oldRespNotifs.length > 0) {
      console.log('\nExemplo da notificação recebida pelo Responsável Anterior:');
      console.log(`Título: ${oldRespNotifs[0].title}`);
      console.log(`Mensagem:\n${oldRespNotifs[0].message}`);
    }

    // Asserções
    if (newRespNotifs.length === 1 && oldRespNotifs.length === 1 && assignedNotifs.length === 0) {
      console.log('\n✅ TESTE PASSOU COM SUCESSO ABSOLUTO!');
      console.log('   Exatamente 1 notificação consolidada foi gerada para cada envolvido,');
      console.log('   sem repetição pelas 6 recorrências e sem duplicidade com task_assigned.');
    } else {
      console.log('\n❌ TESTE FALHOU na deduplicação.');
    }

    // Limpeza
    console.log('\nLimpando dados de teste...');
    await client.query(`DELETE FROM notifications WHERE related_entity_id = ANY($1);`, [taskIds]);
    await client.query(`DELETE FROM tasks WHERE id = ANY($1);`, [taskIds]);
    await client.query(`DELETE FROM clients WHERE id = $1;`, [clientId]);
    console.log('Limpeza concluída!');

  } catch (e) {
    console.error('Erro no teste:', e);
  } finally {
    await client.end();
  }
}

run();
