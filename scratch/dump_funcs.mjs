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
    
    const funcs = [
      'check_daily_expirations',
      'notify_new_tutorial',
      'notify_task_concluded',
      'notify_new_task',
      'notify_task_alerts',
      'notify_client_tax_regime_change',
      'notify_new_client',
      'notify_client_legislation_added',
      'notify_client_address_change',
      'notify_task_assignment',
      'notify_task_reassignment',
      'notify_client_certificate_change',
      'notify_client_license_change',
      'notify_client_contact_change'
    ];

    let out = '';
    for (const name of funcs) {
      const res = await client.query(`
        SELECT pg_get_functiondef(oid) as def
        FROM pg_proc
        WHERE proname = $1 AND pronamespace = 'public'::regnamespace;
      `, [name]);
      
      out += `\n========================================\n`;
      out += `FUNCTION: ${name}\n`;
      out += `========================================\n`;
      if (res.rows.length > 0) {
        out += res.rows[0].def + '\n';
      } else {
        out += 'NOT FOUND\n';
      }
    }

    fs.writeFileSync('scratch/all_funcs.txt', out, 'utf-8');
    console.log('Saved all funcs to scratch/all_funcs.txt');

  } finally {
    await client.end();
  }
}

run();
