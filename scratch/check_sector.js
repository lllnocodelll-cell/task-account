import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function checkTaskAndDocument() {
    const client = new pg.Client(config);
    try {
        await client.connect();

        console.log("=== 1. TAREFA 'AP. FOLHA PAGTO' OU SIMILARES ===");
        const tasksRes = await client.query(`
            SELECT id, task_name, sector, client_name, client_id, status, due_date, competence
            FROM tasks
            WHERE task_name ILIKE '%FOLHA%'
            ORDER BY created_at DESC
            LIMIT 5;
        `);
        console.table(tasksRes.rows);

        console.log("\n=== 2. DOCUMENTOS EM 'client_documents' ===");
        const docsRes = await client.query(`
            SELECT cd.id, cd.name, cd.type, cd.status, cd.sector_id, cd.task_id, s.name as sector_name, cd.client_id, cd.created_at
            FROM client_documents cd
            LEFT JOIN sectors s ON cd.sector_id = s.id
            ORDER BY cd.created_at DESC
            LIMIT 5;
        `);
        console.table(docsRes.rows);

        console.log("\n=== 3. SETORES CADASTRADOS EM 'sectors' ===");
        const sectorsRes = await client.query(`
            SELECT id, name, org_id
            FROM sectors;
        `);
        console.table(sectorsRes.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

checkTaskAndDocument();
