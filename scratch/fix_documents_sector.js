import pg from 'pg';

const config = {
    host: 'db.lpskaluntuupvnnpvtop.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'TempPasswordTask2026!',
    ssl: { rejectUnauthorized: false }
};

async function fixDocuments() {
    const client = new pg.Client(config);
    try {
        await client.connect();

        console.log("=== BUSCANDO DOCUMENTOS COM sector_id NULO VINCULADOS A TAREFAS ===");
        const pendingDocsRes = await client.query(`
            SELECT cd.id, cd.name, cd.type, cd.task_id, t.task_name, t.sector as task_sector, cd.org_id
            FROM client_documents cd
            JOIN tasks t ON cd.task_id = t.id
            WHERE cd.sector_id IS NULL;
        `);
        console.table(pendingDocsRes.rows);

        if (pendingDocsRes.rows.length === 0) {
            console.log("Nenhum documento com sector_id nulo para corrigir.");
            return;
        }

        for (const doc of pendingDocsRes.rows) {
            const rawSector = (doc.task_sector || '').trim();
            if (!rawSector) continue;

            // Buscar setor correspondente no mesmo org_id
            const sectorRes = await client.query(`
                SELECT id, name
                FROM sectors
                WHERE org_id = $1 AND LOWER(TRIM(name)) = LOWER($2);
            `, [doc.org_id, rawSector]);

            if (sectorRes.rows.length > 0) {
                const sectorId = sectorRes.rows[0].id;
                const sectorName = sectorRes.rows[0].name;

                await client.query(`
                    UPDATE client_documents
                    SET sector_id = $1
                    WHERE id = $2;
                `, [sectorId, doc.id]);

                console.log(`Documento '${doc.name}' (${doc.id}) atualizado com o setor '${sectorName}' (${sectorId})!`);
            } else {
                console.log(`Não foi encontrado setor com nome '${rawSector}' para o org_id ${doc.org_id}.`);
            }
        }

        console.log("\n=== VERIFICANDO RESULTADO DO DOCUMENTO ===");
        const verifyRes = await client.query(`
            SELECT cd.id, cd.name, cd.type, cd.status, cd.sector_id, s.name as sector_name
            FROM client_documents cd
            LEFT JOIN sectors s ON cd.sector_id = s.id
            WHERE cd.id = '5a653808-a72f-4899-92d3-d21069b17c0e';
        `);
        console.table(verifyRes.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

fixDocuments();
