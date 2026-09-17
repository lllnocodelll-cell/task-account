-- Tabela de Inscrições para Notificações Web Push (PWA)
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

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_push_subs_user_id ON public.user_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_subs_org_id ON public.user_push_subscriptions(org_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política de RLS: O próprio usuário pode inserir/visualizar/deletar suas inscrições
CREATE POLICY "Usuários gerenciam suas próprias inscrições push"
    ON public.user_push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
