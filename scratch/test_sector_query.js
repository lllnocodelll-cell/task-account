import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function testSectorQuery() {
    const client = new pg.Client(config);
    try {
        await client.connect();

        const taskRes = await client.query(`
            SELECT id, task_name, sector, LENGTH(sector) as sector_len, encode(sector::bytea, 'hex') as sector_hex, org_id
            FROM tasks
            WHERE id = '6e13f034-6f1a-4ec8-b733-259ea374f85c';
        `);
        console.log("Task sector info:");
        console.log(taskRes.rows[0]);

        const sectorRes = await client.query(`
            SELECT id, name, LENGTH(name) as name_len, encode(name::bytea, 'hex') as name_hex, org_id
            FROM sectors
            WHERE org_id = '71d62b55-1654-4827-9ff1-52dcd6c8b444';
        `);
        console.log("\nSectors info:");
        console.table(sectorRes.rows);

        const testQueryRes = await client.query(`
            SELECT id, name
            FROM sectors
            WHERE org_id = '71d62b55-1654-4827-9ff1-52dcd6c8b444'
              AND name = (SELECT sector FROM tasks WHERE id = '6e13f034-6f1a-4ec8-b733-259ea374f85c');
        `);
        console.log("\nResultado do match direto no SQL:");
        console.table(testQueryRes.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

testSectorQuery();
