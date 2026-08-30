import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function checkCronSummary() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        
        console.log("=== EXECUÇÃO DA FUNÇÃO MANIFESTA ===");
        await client.query(`SELECT public.process_automated_chat_templates()`);
        console.log("Função executada sem erros.");

        console.log("\n=== DISPAROS REGISTRADOS EM CHAT_MESSAGE_TEMPLATE_DISPATCHES ===");
        const dispatches = await client.query(`SELECT id, template_id, client_id, competence, sent_at, schedule_id FROM chat_message_template_dispatches ORDER BY sent_at DESC LIMIT 5`);
        console.table(dispatches.rows);

        console.log("\n=== MENSAGENS GERADAS EM CHAT_MESSAGES ===");
        const msgs = await client.query(`SELECT id, channel_id, substring(text from 1 for 60) as preview, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 5`);
        console.table(msgs.rows);

        console.log("\n=== JOBS DO PG_CRON ===");
        const jobs = await client.query(`SELECT jobid, schedule, command, active FROM cron.job`);
        console.table(jobs.rows);

        console.log("\n=== EXECUÇÕES RECENTES DO PG_CRON ===");
        try {
            const runs = await client.query(`SELECT runid, jobid, status, return_message, start_time FROM cron.job_run_details ORDER BY runid DESC LIMIT 5`);
            console.table(runs.rows);
        } catch (e) {
            console.log("Sem tabela cron.job_run_details ou sem acesso.");
        }

    } catch (err) {
        console.error("Erro na execução:", err);
    } finally {
        await client.end();
    }
}

checkCronSummary();
