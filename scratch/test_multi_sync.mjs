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
  const t = await client.query(`
    INSERT INTO tasks (org_id, client_name, task_name, competence, priority, status, responsible, responsibles, total_time_spent_seconds)
    VALUES ('71d62b55-1654-4827-9ff1-52dcd6c8b444', 'Teste Multi', 'Task Multi', '2026-04', 'Média', 'Pendente', 'Celso Andrade', ARRAY['Celso Andrade'], 0)
    RETURNING id;
  `);
  const tid = t.rows[0].id;
  await client.query(`
    UPDATE tasks
    SET responsible = 'João Silva', responsibles = ARRAY['João Silva', 'Lucas']
    WHERE id = $1;
  `, [tid]);
  const check = await client.query('SELECT responsible, responsibles FROM tasks WHERE id = $1;', [tid]);
  console.log('Multi result:', check.rows[0]);
  await client.query('DELETE FROM tasks WHERE id = $1;', [tid]);
  await client.end();
}

run();
