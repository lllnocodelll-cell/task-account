import pg from 'pg';
import fs from 'fs';
import path from 'path';

const config = {
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
};

async function applyDrop() {
  const client = new pg.Client(config);
  try {
    await client.connect();
    console.log("Connected to PostgreSQL successfully.");

    const sqlPath = path.resolve('supabase/migrations/20260919160000_drop_chat_calls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing drop_chat_calls migration...");
    await client.query(sql);
    console.log("Table chat_calls dropped successfully!");

    // Verify it doesn't exist anymore
    const res = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE tablename = 'chat_calls';
    `);
    console.log("Existing tables named chat_calls:", res.rows.length);

  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyDrop();
