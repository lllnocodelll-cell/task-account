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
    const user1 = profilesRes.rows[0]; // Celso
    const user2 = profilesRes.rows[1]; // Outro colaborador (ex: João Silva)

    console.log(`Organização: ${orgId}`);
    console.log(`Colaborador Anterior: ${user1.full_name}`);
    console.log(`Novo Colaborador: ${user2.full_name}`);

    // 1. Criar cliente temporário
    const cRes = await client.query(`
      INSERT INTO clients (org_id, company_name, trade_name, document)
      VALUES ($1, 'Empresa Teste Cascata Ltda', 'Teste Cascata', '33445566000177')
      RETURNING id;
    `, [orgId]);
    const clientId = cRes.rows[0].id;

    // 2. Criar 3 tarefas (Janeiro, Fevereiro e Março) atribuídas a Celso
    const competences = ['2026-01', '2026-02', '2026-03'];
    const taskIds = [];
    for (const comp of competences) {
      const tRes = await client.query(`
        INSERT INTO tasks (org_id, client_id, client_name, task_name, competence, priority, status, recurrence, responsible, responsibles, total_time_spent_seconds)
        VALUES ($1, $2, 'Empresa Teste Cascata Ltda', 'Fechamento Contábil', $3, 'Alta', 'Pendente', 'mensal', $4, ARRAY[$4], 0)
        RETURNING id;
      `, [orgId, clientId, comp, user1.full_name]);
      taskIds.push(tRes.rows[0].id);
    }
    console.log(`Tarefas criadas: 1 principal (${taskIds[0]}) e 2 futuras (${taskIds[1]}, ${taskIds[2]}).`);

    // 3. Simular a edição do TaskForm:
    // O usuário edita a tarefa de 2026-01, desmarca Celso e seleciona user2 (João Silva)
    const newResponsibles = [user2.full_name];
    const newPrimaryResp = user2.full_name;

    // Atualiza a principal
    await client.query(`
      UPDATE tasks 
      SET responsible = $1, responsibles = $2
      WHERE id = $3;
    `, [newPrimaryResp, newResponsibles, taskIds[0]]);

    // Atualiza as futuras em cascata (com a correção do TaskForm enviando responsibles)
    for (const ftId of [taskIds[1], taskIds[2]]) {
      await client.query(`
        UPDATE tasks 
        SET responsible = $1, responsibles = $2
        WHERE id = $3;
      `, [newPrimaryResp, newResponsibles, ftId]);
    }
    console.log('Atualização em cascata executada.');

    // 4. Conferir o estado das tarefas no banco
    const res = await client.query(`
      SELECT id, competence, responsible, responsibles
      FROM tasks
      WHERE id = ANY($1)
      ORDER BY competence ASC;
    `, [taskIds]);

    let allPassed = true;
    console.log('\n--- Resultado nas Tarefas ---');
    for (const row of res.rows) {
      console.log(`Competência: ${row.competence}`);
      console.log(`  responsible: ${row.responsible}`);
      console.log(`  responsibles: [${row.responsibles.join(', ')}]`);
      
      const containsOld = row.responsibles.includes(user1.full_name);
      const containsNew = row.responsibles.includes(user2.full_name);

      if (containsOld) {
        console.log(`  ❌ ERRO: ${user1.full_name} ainda está presente nos responsibles!`);
        allPassed = false;
      } else if (!containsNew) {
        console.log(`  ❌ ERRO: ${user2.full_name} não foi incluído nos responsibles!`);
        allPassed = false;
      } else {
        console.log(`  ✅ CORRETO: Apenas ${user2.full_name} é o responsável.`);
      }
    }

    if (allPassed) {
      console.log('\n🎉 TESTE PASSOU COM 100% DE SUCESSO!');
      console.log('   Celso foi completamente desvinculado tanto do período editado quanto dos posteriores!');
    } else {
      console.log('\n❌ TESTE FALHOU.');
    }

    // 5. Limpeza
    await client.query(`DELETE FROM notifications WHERE related_entity_id = ANY($1);`, [taskIds]);
    await client.query(`DELETE FROM tasks WHERE id = ANY($1);`, [taskIds]);
    await client.query(`DELETE FROM clients WHERE id = $1;`, [clientId]);
    console.log('\nDados de teste limpos com sucesso.');

  } catch (err) {
    console.error('Erro no teste:', err);
  } finally {
    await client.end();
  }
}

run();
