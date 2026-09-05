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

  console.log('\n=== 4. FUNÇÕES SQL QUE FAZEM INSERT NA TABELA NOTIFICATIONS OU CITAM NOTIFICATIONS ===');
  const funcs = await client.query(`
    SELECT 
      proname, 
      pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.prokind = 'f'
      AND (
        proname IN ('notify_new_task', 'notify_task_concluded', 'notify_task_alerts', 'notify_new_tutorial', 'check_daily_expirations')
        OR proname ILIKE '%notif%'
      );
  `);
  funcs.rows.forEach(r => {
    console.log(`\n--- FUNÇÃO: ${r.proname} ---`);
    console.log(r.def);
  });

  console.log('\n=== 5. TIPOS DE NOTIFICAÇÕES EXISTENTES NO BANCO E CONTAGEM ===');
  const stats = await client.query(`
    SELECT type, count(*), min(created_at), max(created_at)
    FROM notifications
    GROUP BY type;
  `);
  console.log(JSON.stringify(stats.rows, null, 2));

  console.log('\n=== 6. AMOSTRA DAS ÚLTIMAS 5 NOTIFICAÇÕES GERADAS ===');
  const sample = await client.query(`
    SELECT id, user_id, title, type, message, link, read, created_at
    FROM notifications
    ORDER BY created_at DESC
    LIMIT 5;
  `);
  console.log(JSON.stringify(sample.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
