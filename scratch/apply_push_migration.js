import pg from 'pg';

const config = {
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
};

async function applyMigration() {
  const client = new pg.Client(config);
  try {
    await client.connect();
    console.log("Conectado ao Supabase PostgreSQL com sucesso!");

    const sql = `
      CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          org_id TEXT NULL,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_user_push_subs_user_id ON public.user_push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_push_subs_org_id ON public.user_push_subscriptions(org_id);

      ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Usuários gerenciam suas próprias inscrições push" ON public.user_push_subscriptions;
      CREATE POLICY "Usuários gerenciam suas próprias inscrições push"
          ON public.user_push_subscriptions
          FOR ALL
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    `;

    console.log("Executando a migração SQL no Supabase...");
    await client.query(sql);
    console.log("MIGRAÇÃO EXECUTADA COM SUCESSO!");

    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_push_subscriptions';
    `;
    const res = await client.query(checkQuery);
    console.log("Resultado da verificação da tabela:", res.rows);

  } catch (err) {
    console.error("Erro ao aplicar migração:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
