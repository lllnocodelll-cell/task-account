import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function viewMessages() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        const result = await client.query(`
            SELECT m.id, c.name as channel_name, m.text, m.attachment_url, m.attachments
            FROM public.chat_messages m
            JOIN public.chat_channels c ON c.id = m.channel_id
            WHERE m.created_at >= now() - interval '2 minutes'
            ORDER BY m.created_at DESC;
        `);

        for (const row of result.rows) {
            console.log("-----------------------------------------");
            console.log("CANAL:", row.channel_name);
            console.log("CONTEÚDO DA MENSAGEM:\n", row.text);
            console.log("ANEXO URL:", row.attachment_url);
            console.log("ANEXOS JSONB:", JSON.stringify(row.attachments));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

viewMessages();
