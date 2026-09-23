import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function checkProfiles() {
    const client = new pg.Client(config);
    try {
        await client.connect();

        console.log("=== PROFILES ===");
        const profRes = await client.query(`
            SELECT id, email, full_name, role, org_id, org_name
            FROM profiles;
        `);
        console.table(profRes.rows);

        console.log("\n=== TAREFA DETALHES ===");
        const taskRes = await client.query(`
            SELECT id, task_name, sector, org_id
            FROM tasks
            WHERE id = '6e13f034-6f1a-4ec8-b733-259ea374f85c';
        `);
        console.table(taskRes.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

checkProfiles();
