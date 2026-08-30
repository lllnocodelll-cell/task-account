import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function testCronDispatch() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log("Conectado ao Postgres...");

        // 1. Limpar dispatches anteriores para permitir novo teste hoje
        console.log("Limpando dispatches anteriores de teste...");
        await client.query(`
            DELETE FROM public.chat_message_template_dispatches 
            WHERE template_id IN ('bfb2606e-7367-4d6c-a5dd-222f1853d4e1', '8d445a20-2066-4918-bc68-cf72055f7d62');
        `);

        // 2. Chamar a procedure de disparos automáticos
        console.log("Executando procedure public.process_automated_chat_templates()...");
        await client.query("SELECT public.process_automated_chat_templates();");
        console.log("Procedure executada com sucesso!");

        // 3. Consultar as mensagens geradas hoje para validar tags e anexos
        const result = await client.query(`
            SELECT m.id, m.channel_id, c.name as channel_name, m.text, m.attachment_url, m.attachments, m.created_at
            FROM public.chat_messages m
            JOIN public.chat_channels c ON c.id = m.channel_id
            WHERE m.created_at >= now() - interval '1 minute'
            ORDER BY m.created_at DESC;
        `);

        console.log("\n=== MENSAGENS DISPARADAS NO ÚLTIMO MINUTO ===");
        console.log(JSON.stringify(result.rows, null, 2));

        // 4. Verificar se os membros foram vinculados corretamente
        if (result.rows.length > 0) {
            const channelIds = result.rows.map(r => r.channel_id);
            const members = await client.query(`
                SELECT cm.channel_id, p.full_name, p.role, cm.role as member_role
                FROM public.chat_channel_members cm
                JOIN public.profiles p ON p.id = cm.user_id
                WHERE cm.channel_id = ANY($1);
            `, [channelIds]);
            console.log("\n=== MEMBROS DOS CANAIS ===");
            console.table(members.rows);
        }

    } catch (err) {
        console.error("Erro durante teste:", err);
    } finally {
        await client.end();
    }
}

testCronDispatch();
