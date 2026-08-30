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
        console.log("Conectado ao Postgres do Supabase com sucesso.");

        const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260830150000_fix_cron_notification_channel_and_attachments.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executando migration de correção de canais e anexos do pg_cron...");
        await client.query(sql);
        console.log("Migration do pg_cron aplicada com sucesso!");
    } catch (err) {
        console.error("Erro ao aplicar migration:", err);
    } finally {
        await client.end();
    }
}

applyMigration();
