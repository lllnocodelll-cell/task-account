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
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'client_certificates'
    ORDER BY ordinal_position;
  `);
  console.log('COLUMNS client_certificates:', res.rows);

  const cronRes = await client.query(`
    SELECT jobid, schedule, command, nodename, nodeport, database, username, active
    FROM cron.job;
  `);
  console.log('CRON JOBS:', cronRes.rows);

  await client.end();
}

main().catch(console.error);
