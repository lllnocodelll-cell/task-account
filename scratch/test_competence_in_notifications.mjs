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
    console.log(`Usuário 1: ${user1.full_name}`);
    console.log(`Usuário 2: ${user2.full_name}`);

    // Criar cliente de teste temporário
    const cRes = await client.query(`
      INSERT INTO clients (org_id, company_name, trade_name, document)
      VALUES ($1, 'Empresa Teste Competência Ltda', 'Teste Competência', '11223344000188')
      RETURNING id;
    `, [orgId]);
    const clientId = cRes.rows[0].id;

    // 1. TESTE: Atribuição de Nova Tarefa (task_assigned)
    console.log('\n--- 1. Testando Nova Tarefa (task_assigned) com Competência ---');
    const t1 = await client.query(`
      INSERT INTO tasks (org_id, client_id, client_name, task_name, competence, priority, status, recurrence, responsible, due_date, total_time_spent_seconds)
      VALUES ($1, $2, 'Empresa Teste Competência Ltda', 'DCTFWeb Mensal', '10/2026', 'Alta', 'Pendente', 'mensal', $3, CURRENT_DATE + 2, 0)
      RETURNING id;
    `, [orgId, clientId, user1.full_name]);
    const taskId1 = t1.rows[0].id;

    const notifAssigned = await client.query(`
      SELECT title, message, type FROM notifications WHERE related_entity_id = $1 AND type = 'task_assigned';
    `, [taskId1]);
    console.log(`Notificações geradas: ${notifAssigned.rows.length}`);
    if (notifAssigned.rows.length > 0) {
      console.log(`Mensagem:\n${notifAssigned.rows[0].message}`);
      if (notifAssigned.rows[0].message.includes('Competência: 10/2026')) {
        console.log('✅ 1. task_assigned: Competência PRESENTE!');
      } else {
        console.log('❌ 1. task_assigned: Competência AUSENTE!');
      }
    }

    // 2. TESTE: Reatribuição de Tarefa (task_reassigned)
    console.log('\n--- 2. Testando Reatribuição de Tarefa (task_reassigned) com Competência ---');
    await client.query(`
      UPDATE tasks SET responsible = $1 WHERE id = $2;
    `, [user2.full_name, taskId1]);

    const notifReassigned = await client.query(`
      SELECT title, message, type FROM notifications WHERE related_entity_id = $1 AND type = 'task_reassigned';
    `, [taskId1]);
    console.log(`Notificações geradas: ${notifReassigned.rows.length}`);
    if (notifReassigned.rows.length > 0) {
      console.log(`Mensagem:\n${notifReassigned.rows[0].message}`);
      if (notifReassigned.rows[0].message.includes('Competência: 10/2026')) {
        console.log('✅ 2. task_reassigned: Competência PRESENTE!');
      } else {
        console.log('❌ 2. task_reassigned: Competência AUSENTE!');
      }
    }

    // 3. TESTE: Tarefa Concluída (task_concluded)
    console.log('\n--- 3. Testando Tarefa Concluída (task_concluded) com Competência ---');
    await client.query(`
      UPDATE tasks SET status = 'Concluída' WHERE id = $1;
    `, [taskId1]);

    const notifConcluded = await client.query(`
      SELECT title, message, type FROM notifications WHERE related_entity_id = $1 AND type = 'task_concluded';
    `, [taskId1]);
    console.log(`Notificações geradas: ${notifConcluded.rows.length}`);
    if (notifConcluded.rows.length > 0) {
      console.log(`Mensagem:\n${notifConcluded.rows[0].message}`);
      if (notifConcluded.rows[0].message.includes('Competência: 10/2026')) {
        console.log('✅ 3. task_concluded: Competência PRESENTE!');
      } else {
        console.log('❌ 3. task_concluded: Competência AUSENTE!');
      }
    }

    // 4. TESTE: Alerta Fiscal (task_alert)
    console.log('\n--- 4. Testando Alerta Fiscal (task_alert) com Competência ---');
    const t2 = await client.query(`
      INSERT INTO tasks (org_id, client_id, client_name, task_name, competence, priority, status, recurrence, responsible, due_date, total_time_spent_seconds)
      VALUES ($1, $2, 'Empresa Teste Competência Ltda', 'PGDAS Mensal', '11/2026', 'Alta', 'Pendente', 'mensal', $3, CURRENT_DATE + 2, 0)
      RETURNING id;
    `, [orgId, clientId, user1.full_name]);
    const taskId2 = t2.rows[0].id;

    await client.query(`
      UPDATE tasks SET exceeded_sublimit = true WHERE id = $1;
    `, [taskId2]);

    const notifAlert = await client.query(`
      SELECT title, message, type FROM notifications WHERE related_entity_id = $1 AND type = 'task_alert';
    `, [taskId2]);
    console.log(`Notificações geradas: ${notifAlert.rows.length}`);
    if (notifAlert.rows.length > 0) {
      console.log(`Mensagem:\n${notifAlert.rows[0].message}`);
      if (notifAlert.rows[0].message.includes('Competência: 11/2026')) {
        console.log('✅ 4. task_alert: Competência PRESENTE!');
      } else {
        console.log('❌ 4. task_alert: Competência AUSENTE!');
      }
    }

    // 5. TESTE: Tarefa Atrasada (task_overdue) via check_daily_expirations()
    console.log('\n--- 5. Testando Tarefa Atrasada (task_overdue) com Competência ---');
    const t3 = await client.query(`
      INSERT INTO tasks (org_id, client_id, client_name, task_name, competence, priority, status, recurrence, responsible, due_date, total_time_spent_seconds)
      VALUES ($1, $2, 'Empresa Teste Competência Ltda', 'EFD Reinf Atrasada', '08/2026', 'Alta', 'Pendente', 'mensal', $3, CURRENT_DATE - 3, 0)
      RETURNING id;
    `, [orgId, clientId, user1.full_name]);
    const taskId3 = t3.rows[0].id;

    // Executar rotina diária de checagem
    await client.query('SELECT public.check_daily_expirations();');

    const notifOverdue = await client.query(`
      SELECT title, message, type FROM notifications WHERE related_entity_id = $1 AND type = 'task_overdue';
    `, [taskId3]);
    console.log(`Notificações geradas: ${notifOverdue.rows.length}`);
    if (notifOverdue.rows.length > 0) {
      console.log(`Mensagem:\n${notifOverdue.rows[0].message}`);
      if (notifOverdue.rows[0].message.includes('Competência: 08/2026')) {
        console.log('✅ 5. task_overdue: Competência PRESENTE!');
      } else {
        console.log('❌ 5. task_overdue: Competência AUSENTE!');
      }
    }

    // Limpeza
    console.log('\n--- Realizando Limpeza de Dados de Teste ---');
    await client.query(`DELETE FROM notifications WHERE related_entity_id = ANY($1);`, [[taskId1, taskId2, taskId3]]);
    await client.query(`DELETE FROM tasks WHERE id = ANY($1);`, [[taskId1, taskId2, taskId3]]);
    await client.query(`DELETE FROM clients WHERE id = $1;`, [clientId]);
    console.log('Limpeza concluída com sucesso!');

  } catch (err) {
    console.error('Erro no teste:', err);
  } finally {
    await client.end();
  }
}

run();
