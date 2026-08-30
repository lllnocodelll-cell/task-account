import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function viewTemplatesAndSchedules() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        
        console.log("=== Modelos de Mensagem ===");
        const tmpl = await client.query(`
            SELECT * FROM public.chat_message_templates;
        `);
        console.log(JSON.stringify(tmpl.rows.map(r => ({
            id: r.id,
            title: r.title,
            is_automated: r.is_automated,
            reference_task_type_id: r.reference_task_type_id,
            target_client_ids: r.target_client_ids,
            target_tax_regimes: r.target_tax_regimes,
            target_sectors: r.target_sectors
        })), null, 2));

        console.log("=== Agendamentos (Schedules) ===");
        const sched = await client.query(`
            SELECT * FROM public.chat_message_template_schedules;
        `);
        console.table(sched.rows);

        console.log("=== Tarefas do Cliente ===");
        const tasks = await client.query(`
            SELECT id, client_id, task_name, due_date, status 
            FROM public.tasks 
            LIMIT 20;
        `);
        console.table(tasks.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

viewTemplatesAndSchedules();
