import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function checkCron() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log("=== 1. VERIFICANDO JOBS NO PG_CRON ===");
        const jobs = await client.query(`SELECT jobid, schedule, command, nodename, nodeport, database, username, active FROM cron.job`);
        console.table(jobs.rows);

        console.log("\n=== 2. ÚLTIMAS EXECUÇÕES NO PG_CRON (cron.job_run_details) ===");
        try {
            const runs = await client.query(`SELECT runid, jobid, status, return_message, start_time, end_time FROM cron.job_run_details ORDER BY runid DESC LIMIT 10`);
            console.table(runs.rows);
        } catch (e) {
            console.log("Erro ao consultar cron.job_run_details:", e.message);
        }

        console.log("\n=== 3. TEMPLATES AUTOMÁTICOS CADASTRADOS ===");
        const templates = await client.query(`SELECT id, title, is_automated, org_id, trigger_type, trigger_value, trigger_time, reference_task_type_id FROM chat_message_templates WHERE is_automated = true`);
        console.table(templates.rows);

        console.log("\n=== 4. AGENDAMENTOS NA TABELA (chat_message_template_schedules) ===");
        const schedules = await client.query(`SELECT * FROM chat_message_template_schedules`);
        console.table(schedules.rows);

        console.log("\n=== 5. DISPAROS JÁ REGISTRADOS (chat_message_template_dispatches) ===");
        const dispatches = await client.query(`SELECT * FROM chat_message_template_dispatches ORDER BY sent_at DESC LIMIT 10`);
        console.table(dispatches.rows);

        console.log("\n=== 6. TESTANDO EXECUÇÃO MANIFESTA DA FUNÇÃO process_automated_chat_templates() ===");
        const nowLocal = await client.query(`SELECT timezone('America/Sao_Paulo', now()) as local_now, now() as utc_now, EXTRACT(HOUR FROM timezone('America/Sao_Paulo', now())) as local_hour, EXTRACT(HOUR FROM now()) as utc_hour`);
        console.log("Horários no Banco:", nowLocal.rows[0]);

        await client.query(`SELECT public.process_automated_chat_templates()`);
        console.log("Função executada com sucesso.");

        console.log("\n=== 7. MENSAGENS RECENTES NO CHAT ===");
        const msgs = await client.query(`SELECT id, channel_id, text, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 5`);
        console.table(msgs.rows);

    } catch (err) {
        console.error("Erro geral:", err);
    } finally {
        await client.end();
    }
}

checkCron();
