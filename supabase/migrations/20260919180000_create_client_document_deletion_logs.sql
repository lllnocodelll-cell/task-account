-- Migration: Criação da tabela de auditoria de exclusões de documentos de clientes
-- Trilha imutável para conformidade contábil e segurança da informação

CREATE TABLE IF NOT EXISTS public.client_document_deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    document_id UUID,
    document_name TEXT NOT NULL,
    competence_month TEXT,
    due_date DATE,
    document_type TEXT,
    was_read_by_client BOOLEAN DEFAULT false,
    first_read_at TIMESTAMPTZ,
    deletion_source TEXT NOT NULL, -- 'reopen_task' ou 'client_drawer_manual'
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    task_title TEXT,
    deleted_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_by_name TEXT NOT NULL,
    deleted_by_role TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas rápidas no Cockpit e no Drawer do Cliente
CREATE INDEX IF NOT EXISTS idx_doc_deletion_logs_org_created 
    ON public.client_document_deletion_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_doc_deletion_logs_client 
    ON public.client_document_deletion_logs(client_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.client_document_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- 1. Leitura: usuários da mesma organização
DROP POLICY IF EXISTS "Usuários da mesma organização podem ler logs de exclusão" ON public.client_document_deletion_logs;
CREATE POLICY "Usuários da mesma organização podem ler logs de exclusão"
    ON public.client_document_deletion_logs
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE org_id = client_document_deletion_logs.org_id
        )
    );

-- 2. Inserção: usuários autenticados da mesma organização
DROP POLICY IF EXISTS "Usuários autenticados podem registrar logs de exclusão" ON public.client_document_deletion_logs;
CREATE POLICY "Usuários autenticados podem registrar logs de exclusão"
    ON public.client_document_deletion_logs
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE org_id = client_document_deletion_logs.org_id
        )
    );

-- Observação: UPDATE e DELETE não possuem políticas criadas, garantindo que os logs sejam 100% imutáveis.
