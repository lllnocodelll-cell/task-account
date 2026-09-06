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
    
    const triggersRes = await client.query(`
      SELECT 
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE pg_get_functiondef(p.oid) ILIKE '%notifications%'
      ORDER BY c.relname, t.tgname;
    `);

    let out = `Found ${triggersRes.rows.length} triggers/functions referencing notifications.\n`;
    for (const r of triggersRes.rows) {
      out += `\n========================================\n`;
      out += `TRIGGER: ${r.trigger_name} ON TABLE: ${r.table_name} (FUNCTION: ${r.function_name})\n`;
      out += `========================================\n`;
      out += r.function_definition + '\n';
    }

    fs.writeFileSync('scratch/triggers_dump.txt', out, 'utf-8');
    console.log('Saved', triggersRes.rows.length, 'triggers to scratch/triggers_dump.txt');

  } finally {
    await client.end();
  }
}

run();
