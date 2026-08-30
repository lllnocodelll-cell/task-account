import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function viewDispatches() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        
        const dispatches = await client.query(`SELECT id, template_id, client_id, competence, sent_at, schedule_id FROM chat_message_template_dispatches ORDER BY sent_at DESC LIMIT 10`);
        console.log("=== DISPAROS (chat_message_template_dispatches) ===");
        console.table(dispatches.rows);

        const msgs = await client.query(`SELECT id, channel_id, substring(text from 1 for 60) as preview, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 10`);
        console.log("=== MENSAGENS (chat_messages) ===");
        console.table(msgs.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

viewDispatches();
