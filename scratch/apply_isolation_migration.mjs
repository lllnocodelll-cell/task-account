import pg from 'pg';
import fs from 'fs';

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
    console.log('Connected to PostgreSQL database...');
    
    const sql = fs.readFileSync('supabase/migrations/20260905230000_isolate_notifications_multi_tenant.sql', 'utf-8');
    
    console.log('Executing isolation migration...');
    await client.query(sql);
    console.log('Migration executed successfully!');

    // Verify notifications table
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'org_id';
    `);
    console.log('Column org_id in notifications:', cols.rows);

    // Verify count of notifications per user and org_id
    const notifs = await client.query(`
      SELECT n.user_id, p.email, p.full_name, n.org_id, count(*) as total
      FROM notifications n
      LEFT JOIN profiles p ON p.id = n.user_id
      GROUP BY n.user_id, p.email, p.full_name, n.org_id
      ORDER BY total DESC;
    `);
    console.table(notifs.rows);

    // Verify policies on notifications
    const rls = await client.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as with_check
      FROM pg_policy
      JOIN pg_class ON pg_class.oid = pg_policy.polrelid
      WHERE pg_class.relname = 'notifications';
    `);
    console.log('--- RLS POLICIES ON NOTIFICATIONS ---');
    console.table(rls.rows);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
