import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function inspectDoc() {
    const client = new pg.Client(config);
    try {
        await client.connect();

        const docRes = await client.query(`
            SELECT *
            FROM client_documents
            WHERE id = '5a653808-a72f-4899-92d3-d21069b17c0e';
        `);
        console.log("Documento 5a653808-a72f-4899-92d3-d21069b17c0e:");
        console.log(docRes.rows[0]);

        const prevDocRes = await client.query(`
            SELECT *
            FROM client_documents
            WHERE id = '7199fe8f-1c1f-4a05-a552-ac92e0ad6e96';
        `);
        console.log("\nDocumento anterior (7199fe8f - AP. PGDAS-D):");
        console.log(prevDocRes.rows[0]);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

inspectDoc();
