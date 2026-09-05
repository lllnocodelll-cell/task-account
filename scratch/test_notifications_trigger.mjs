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

  const orgs = await client.query(`
    SELECT org_id, count(*) 
    FROM profiles 
    WHERE org_id IS NOT NULL 
    GROUP BY org_id 
    HAVING count(*) > 1;
  `);

  if (orgs.rows.length > 0) {
    const orgId = orgs.rows[0].org_id;
    const users = await client.query(`SELECT id, full_name, org_id FROM profiles WHERE org_id = $1 LIMIT 2;`, [orgId]);
    console.log("Usuários da mesma org:", users.rows);

    const user1 = users.rows[0];
    const user2 = users.rows[1];

    console.log(`\n=== Criando tarefa atribuída a [${user1.full_name}] e [${user2.full_name}] ===`);
    const taskInsert = await client.query(`
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
        'Tarefa Teste Notificações Multi-Resp 2', 
        'Empresa Teste Multi', 
        $2, 
        $3, 
        'Pendente', 
        'Alta', 
        '09/2026'
      ) RETURNING id;
    `, [orgId, user1.full_name, [user1.full_name, user2.full_name]]);

    const taskId = taskInsert.rows[0].id;

    const notifs = await client.query(`
      SELECT id, user_id, title, message, type, related_entity_id, created_at
      FROM notifications
      WHERE related_entity_id = $1
      ORDER BY created_at DESC;
    `, [taskId]);

    console.log(`Notificações geradas (${notifs.rows.length}):`, notifs.rows);

    // Agora testar UPDATE adicionando um novo responsável
    console.log(`\n=== Testando UPDATE: adicionando um 3º responsável ou mudando responsável ===`);
    // Limpar e deletar
    await client.query(`DELETE FROM notifications WHERE related_entity_id = $1`, [taskId]);
    await client.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    console.log("Limpeza concluída.");
  } else {
    console.log("Nenhuma org com > 1 perfil.");
  }

  await client.end();
}

main().catch(console.error);
