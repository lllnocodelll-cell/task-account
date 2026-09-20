-- Migration: Criação da tabela de sessões de suporte e tempo de atendimento
-- Registro permanente e auditável de cada finalização de chamado no Chat

CREATE TABLE IF NOT EXISTS public.chat_support_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    channel_name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
    sector_name TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_name TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_by_name TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_seconds INTEGER NOT NULL,
    duration_formatted TEXT NOT NULL,
    messages_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para relatórios e dashboards futuros
CREATE INDEX IF NOT EXISTS idx_chat_support_sessions_org 
    ON public.chat_support_sessions(org_id, resolved_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_support_sessions_channel 
    ON public.chat_support_sessions(channel_id, resolved_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_support_sessions_client 
    ON public.chat_support_sessions(client_id, resolved_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_support_sessions_resolved_by 
    ON public.chat_support_sessions(resolved_by, resolved_at DESC);

-- Habilitar RLS
ALTER TABLE public.chat_support_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuários da mesma organização podem ler sessões de suporte" ON public.chat_support_sessions;
CREATE POLICY "Usuários da mesma organização podem ler sessões de suporte"
    ON public.chat_support_sessions
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE org_id = chat_support_sessions.org_id
        )
    );

DROP POLICY IF EXISTS "Usuários autenticados podem registrar sessões de suporte" ON public.chat_support_sessions;
CREATE POLICY "Usuários autenticados podem registrar sessões de suporte"
    ON public.chat_support_sessions
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE org_id = chat_support_sessions.org_id
        )
    );
