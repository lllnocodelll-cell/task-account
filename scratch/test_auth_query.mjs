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
  await client.connect();

  // Testar a query simulando auth.uid() = '71d62b55-1654-4827-9ff1-52dcd6c8b444' (Celso)
  await client.query(`SET LOCAL role = 'authenticated';`);
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '71d62b55-1654-4827-9ff1-52dcd6c8b444';`);
  await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "71d62b55-1654-4827-9ff1-52dcd6c8b444", "role": "authenticated"}';`);

  const res = await client.query(`
    SELECT id, task_name, client_id, competence, created_at 
    FROM tasks 
    WHERE client_id = '969159b6-a1fa-47b3-97f7-148fc6a61116'
    ORDER BY competence DESC 
    LIMIT 1;
  `);

  console.log('QUERY AS CELSO:', res.rows);

  await client.end();
}

run();
