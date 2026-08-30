import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function printRecentMessages() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        const result = await client.query(`
            SELECT m.id, c.name as channel_name, m.text, m.attachment_url
            FROM public.chat_messages m
            JOIN public.chat_channels c ON c.id = m.channel_id
            WHERE m.created_at >= now() - interval '15 minutes'
            ORDER BY m.created_at DESC;
        `);

        console.log(`Encontradas ${result.rows.length} mensagens recentes:`);
        for (const row of result.rows) {
            console.log("\n=========================================");
            console.log("CANAL:", row.channel_name);
            console.log("TEXTO DA MENSAGEM:");
            console.log(row.text);
            console.log("HEADER ATTACHMENT:", row.attachment_url ? "SIM" : "NÃO");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

printRecentMessages();
