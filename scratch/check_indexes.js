import pg from 'pg';

const config = {
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
};

async function inspectTriggers() {
  const client = new pg.Client(config);
  try {
    await client.connect();

    const trigRes = await client.query(`
      SELECT tgname, tgtype, proname 
      FROM pg_trigger
      JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
      WHERE tgrelid = 'public.chat_calls'::regclass;
    `);
    console.log("Triggers on chat_calls:", trigRes.rows);

    // Also test an INSERT into chat_calls directly to see what happens!
    try {
      const testInsert = await client.query(`
        INSERT INTO chat_calls (caller_id, target_id, channel_id, is_video, status)
        VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true, 'pending')
        RETURNING *;
      `);
      console.log("Test insert succeeded:", testInsert.rows);
      // Clean up test row
      await client.query(`DELETE FROM chat_calls WHERE id = $1`, [testInsert.rows[0].id]);
    } catch (insErr) {
      console.log("Test insert failed with error:", insErr.message);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

inspectTriggers();
