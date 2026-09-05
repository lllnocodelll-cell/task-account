import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function debug() {
  await client.connect();
  client.on('notice', msg => console.log('PG NOTICE:', msg.message));

  // Verificar se a trigger trg_notify_task_reassignment está ativa na tabela tasks
  const trigCheck = await client.query(`
    SELECT tgname, tgenabled, tgtype, tgattr
    FROM pg_trigger
    WHERE tgrelid = 'tasks'::regclass;
  `);
  console.log('Triggers on tasks:', trigCheck.rows);

  const t = await client.query(`
    INSERT INTO tasks (org_id, client_name, task_name, competence, priority, status, responsible, total_time_spent_seconds)
    VALUES ('71d62b55-1654-4827-9ff1-52dcd6c8b444', 'Teste Client', 'Tarefa Teste Reatrib', '09/2026', 'Média', 'Pendente', 'Celso Andrade', 0)
    RETURNING id, responsible, org_id;
  `);
  console.log('Inserted task:', t.rows[0]);

  const u = await client.query(`
    UPDATE tasks SET responsible = 'João Silva' WHERE id = $1 RETURNING id, responsible;
  `, [t.rows[0].id]);
  console.log('Updated task:', u.rows[0]);

  const notifs = await client.query(`SELECT * FROM notifications WHERE related_entity_id = $1;`, [t.rows[0].id]);
  console.log('Notifs found:', notifs.rows);

  await client.query('DELETE FROM tasks WHERE id = $1;', [t.rows[0].id]);
  await client.query('DELETE FROM notifications WHERE related_entity_id = $1;', [t.rows[0].id]);

  await client.end();
}

debug();
