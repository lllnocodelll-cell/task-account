import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('--- TESTANDO ISOLAMENTO MULTI-TENANT DE NOTIFICAÇÕES ---\n');

    // 1. Verificar notificações atuais por escritório
    const orgNotifs = await client.query(`
      SELECT 
        n.org_id,
        o.company_name as office_name,
        count(n.id) as total_notifications,
        array_agg(DISTINCT n.type) as types
      FROM notifications n
      LEFT JOIN office_details o ON o.org_id = n.org_id
      GROUP BY n.org_id, o.company_name;
    `);
    console.log('1. DISTRIBUIÇÃO DAS NOTIFICAÇÕES POR ESCRITÓRIO:');
    console.table(orgNotifs.rows);

    // 2. Verificar se existe QUALQUER notificação com mismatch entre n.org_id e p.org_id
    const mismatchRes = await client.query(`
      SELECT n.id, n.user_id, n.org_id as notif_org_id, p.org_id as user_org_id, p.email, n.title
      FROM notifications n
      JOIN profiles p ON p.id = n.user_id
      WHERE n.org_id IS DISTINCT FROM p.org_id;
    `);
    console.log(`2. NOTIFICAÇÕES COM MISMATCH ENTRE USUÁRIO E ESCRITÓRIO: ${mismatchRes.rows.length}`);
    if (mismatchRes.rows.length > 0) {
      console.table(mismatchRes.rows);
    } else {
      console.log('   ✅ PERFEITO! Zero notificações cruzadas entre escritórios.');
    }

    // 3. Simular criação de tarefa no Escritório 1 e verificar que o gestor do Escritório 2 NÃO recebe notificação
    const org1Id = '71d62b55-1654-4827-9ff1-52dcd6c8b444'; // Celso Contabilidade Ltda
    const org2Id = '108375a6-cc17-4c7b-80f8-72618b24ac78'; // Escritório 2 (celso@task.com.br)
    const user2Id = '108375a6-cc17-4c7b-80f8-72618b24ac78';

    const beforeCountRes = await client.query(`
      SELECT count(*) as count FROM notifications WHERE user_id = $1;
    `, [user2Id]);
    const beforeCount = parseInt(beforeCountRes.rows[0].count);

    // Criar e concluir tarefa no Org 1 com responsável "Celso"
    console.log('\n3. SIMULANDO ATIVIDADE NO ESCRITÓRIO 1 COM RESPONSÁVEL "Celso":');
    const taskInsert = await client.query(`
      INSERT INTO tasks (org_id, task_name, client_name, responsible, status, competence, due_date, priority)
      VALUES ($1, 'Tarefa de Teste Isolamento', 'CLIENTE 1 LTDA', 'Celso', 'Em Andamento', '2026-09', CURRENT_DATE + 5, 'Média')
      RETURNING id;
    `, [org1Id]);
    const taskId = taskInsert.rows[0].id;
    console.log(`   Tarefa criada no Org 1: ${taskId}`);

    // Concluir tarefa no Org 1
    await client.query(`
      UPDATE tasks SET status = 'Concluída' WHERE id = $1;
    `, [taskId]);
    console.log('   Tarefa concluída no Org 1.');

    // Verificar se o usuário do Org 2 recebeu algo
    const afterCountRes = await client.query(`
      SELECT count(*) as count FROM notifications WHERE user_id = $1;
    `, [user2Id]);
    const afterCount = parseInt(afterCountRes.rows[0].count);

    console.log(`   Notificações do usuário celso@task.com.br (Org 2):`);
    console.log(`   - Antes: ${beforeCount}`);
    console.log(`   - Depois: ${afterCount}`);

    if (beforeCount === afterCount) {
      console.log('   ✅ SUCESSO ABSOLUTO: Nenhuma notificação vazou para o outro escritório!');
    } else {
      console.error('   ❌ FALHA: Uma notificação vazou para o outro escritório!');
    }

    // Limpar tarefa de teste e notificações criadas
    await client.query(`DELETE FROM tasks WHERE id = $1;`, [taskId]);
    await client.query(`DELETE FROM notifications WHERE related_entity_id = $1;`, [taskId]);
    console.log('   Limpeza pós-teste concluída com sucesso.\n');

  } catch (err) {
    console.error('Erro no teste:', err);
  } finally {
    await client.end();
  }
}

run();
