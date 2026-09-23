import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function checkMemberAndTask() {
    const client = new pg.Client(config);
    try {
        await client.connect();

        const taskRes = await client.query(`
            SELECT id, task_name, sector, responsible, responsibles
            FROM tasks
            WHERE id = '6e13f034-6f1a-4ec8-b733-259ea374f85c';
        `);
        console.log("=== DADOS DA TAREFA ===");
        console.log(taskRes.rows[0]);

        const memberRes = await client.query(`
            SELECT id, first_name, last_name, sector_id, sector_ids
            FROM members;
        `);
        console.log("\n=== MEMBROS CADASTRADOS ===");
        console.table(memberRes.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

checkMemberAndTask();
