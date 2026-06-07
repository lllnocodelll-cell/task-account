import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function inspectFunctions() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        
        console.log("\n--- Listando definições das funções SQL customizadas ---");
        const query = `
            SELECT 
                proname, 
                pg_get_functiondef(p.oid) as def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND proname IN ('is_channel_member', 'is_chat_member');
        `;
        
        const res = await client.query(query);
        res.rows.forEach(r => {
            console.log(`\nFunção: ${r.proname}`);
            console.log(r.def);
        });
        
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

inspectFunctions();
