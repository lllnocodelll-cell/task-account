import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function checkCronRun() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log("Conectado ao Postgres...");

        // 1. Check last runs in cron.job_run_details
        const cronRuns = await client.query(`
            SELECT runid, jobid, status, start_time, end_time 
            FROM cron.job_run_details 
            ORDER BY start_time DESC 
            LIMIT 5;
        `);
        console.log("\n=== Últimas execuções do pg_cron ===");
        console.table(cronRuns.rows);

        // 2. Check the dispatched message
        const messages = await client.query(`
            SELECT id, channel_id, text, attachment_url, file_name, file_type, attachments, created_at 
            FROM public.chat_messages 
            ORDER BY created_at DESC 
            LIMIT 2;
        `);
        console.log("\n=== Últimas mensagens enviadas ===");
        console.log(JSON.stringify(messages.rows, null, 2));

        // 3. Check the channel properties for these messages
        if (messages.rows.length > 0) {
            const channelIds = messages.rows.map(m => m.channel_id);
            const channels = await client.query(`
                SELECT id, name, type, status, support_status, is_notification 
                FROM public.chat_channels 
                WHERE id = ANY($1);
            `, [channelIds]);
            console.log("\n=== Status dos canais associados ===");
            console.table(channels.rows);
        }

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

checkCronRun();
