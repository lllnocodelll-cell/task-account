import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    // Check clients
    const clientsRes = await client.query(`
      SELECT id, company_name, org_id
      FROM clients
      ORDER BY created_at DESC;
    `);
    console.log('--- ALL CLIENTS ---');
    console.table(clientsRes.rows);

    // Check licenses
    const licRes = await client.query(`
      SELECT l.id, l.license_name, l.client_id, c.org_id as client_org_id, c.company_name
      FROM client_licenses l
      LEFT JOIN clients c ON c.id = l.client_id;
    `);
    console.log('--- LICENSES ---');
    console.table(licRes.rows);

    // Check certificates
    const certRes = await client.query(`
      SELECT cert.id, cert.model, cert.signatory, cert.client_id, c.org_id as client_org_id, c.company_name
      FROM client_certificates cert
      LEFT JOIN clients c ON c.id = cert.client_id;
    `);
    console.log('--- CERTIFICATES ---');
    console.table(certRes.rows);

  } finally {
    await client.end();
  }
}

run();
