import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function checkClientFilters() {
    const client = new pg.Client(config);
    try {
        await client.connect();
        
        console.log("=== Histórico de Regimes Tributários ===");
        const regimes = await client.query(`
            SELECT * FROM public.client_tax_regime_history;
        `);
        console.table(regimes.rows);

        console.log("=== Membros da Organização ===");
        const members = await client.query(`
            SELECT id, email, role, client_id, client_ids, sector_id 
            FROM public.members;
        `);
        console.table(members.rows);

        console.log("=== Setores ===");
        const sectors = await client.query(`
            SELECT id, name FROM public.sectors;
        `);
        console.table(sectors.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

checkClientFilters();
