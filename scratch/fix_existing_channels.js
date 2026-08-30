import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function fixExistingChannels() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log("Conectado ao Postgres...");

        const res = await client.query(`
            UPDATE public.chat_channels 
            SET is_notification = true 
            WHERE is_notification IS NOT TRUE;
        `);

        console.log(`Atualizados ${res.rowCount} canais para is_notification = true.`);
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

fixExistingChannels();
