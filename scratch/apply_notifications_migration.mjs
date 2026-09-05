import pg from 'pg';
import fs from 'fs';
import path from 'path';

const config = {
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
};

async function applyMigration() {
  const client = new pg.Client(config);
  try {
    await client.connect();
    console.log("Conectado ao Postgres do Supabase.");

    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260904200000_notifications_realtime_and_engine_enhancements.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executando migration 20260904200000_notifications_realtime_and_engine_enhancements.sql...");
    await client.query(sql);
    console.log("Migração aplicada com sucesso!");

    // Verificar se notifications está agora em supabase_realtime
    const res = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
    `);
    console.log("Tabela no Realtime:", res.rows);

  } catch (err) {
    console.error("Erro ao aplicar migration:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
