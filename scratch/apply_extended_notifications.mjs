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

async function apply() {
  const client = new pg.Client(config);
  try {
    await client.connect();
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260904203000_add_extended_business_notifications.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Aplicando migração 20260904203000_add_extended_business_notifications.sql...");
    await client.query(sql);
    console.log("Migração dos 6 novos cenários de notificação aplicada com sucesso!");
  } catch (err) {
    console.error("Erro ao aplicar migração:", err);
  } finally {
    await client.end();
  }
}

apply();
