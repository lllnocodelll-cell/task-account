import pg from 'pg';
import fs from 'fs';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function inspectFunctions() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        
        const resLog = await client.query("SELECT * FROM public.recurring_task_cron_logs ORDER BY executed_at DESC LIMIT 1;");
        console.log("Último Log do Motor Recorrente:", resLog.rows[0]);
        
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

inspectFunctions();
