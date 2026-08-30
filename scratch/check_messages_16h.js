import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function check16hMessages() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        const result = await client.query(`
            SELECT m.id, c.name as channel_name, m.text, m.created_at
            FROM public.chat_messages m
            JOIN public.chat_channels c ON c.id = m.channel_id
            WHERE m.created_at >= '2026-08-30 19:00:00+00' AND m.created_at <= '2026-08-30 19:02:00+00'
            ORDER BY m.created_at DESC;
        `);

        console.log(`Encontradas ${result.rows.length} mensagens no intervalo do disparo das 16h:`);
        for (const row of result.rows) {
            console.log("\n=========================================");
            console.log("CANAL:", row.channel_name);
            console.log("TEXTO DA MENSAGEM:");
            console.log(row.text);
            console.log("CRIADO EM:", row.created_at);
        }

        // Consultar a tabela de dispatches para os schedules das 16h
        const dispatches = await client.query(`
            SELECT d.id, t.title, d.client_id, d.competence, d.created_at
            FROM public.chat_message_template_dispatches d
            JOIN public.chat_message_templates t ON t.id = d.template_id
            WHERE d.schedule_id IN ('6a943707-2115-43a3-a508-743637de0f68', '166c70b6-f333-4238-b461-a154858e7019');
        `);
        console.log("\n=== DISPATCHES REGISTRADOS PARA AS 16h ===");
        console.table(dispatches.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check16hMessages();
