-- Criar a tabela de templates de mensagens
CREATE TABLE IF NOT EXISTS public.chat_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_tax_regimes TEXT[] DEFAULT '{}'::text[],
    target_sectors UUID[] DEFAULT '{}'::uuid[],
    target_segments TEXT[] DEFAULT '{}'::text[],
    target_client_ids UUID[] DEFAULT '{}'::uuid[],
    reference_task_type_id UUID REFERENCES public.task_types(id) ON DELETE SET NULL,
    is_automated BOOLEAN DEFAULT false NOT NULL,
    trigger_type TEXT CHECK (trigger_type IN ('day_of_month', 'days_before_due', 'manual')) DEFAULT 'manual',
    trigger_value INTEGER,
    send_email_copy BOOLEAN DEFAULT false NOT NULL,
    email_subject TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.chat_message_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura de templates por membros da org" ON public.chat_message_templates;
CREATE POLICY "Permitir leitura de templates por membros da org" ON public.chat_message_templates
    FOR SELECT USING (
        org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

DROP POLICY IF EXISTS "Permitir inserção de templates por gestores da org" ON public.chat_message_templates;
CREATE POLICY "Permitir inserção de templates por gestores da org" ON public.chat_message_templates
    FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

DROP POLICY IF EXISTS "Permitir atualização de templates por gestores da org" ON public.chat_message_templates;
CREATE POLICY "Permitir atualização de templates por gestores da org" ON public.chat_message_templates
    FOR UPDATE USING (
        org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

DROP POLICY IF EXISTS "Permitir exclusão de templates por gestores da org" ON public.chat_message_templates;
CREATE POLICY "Permitir exclusão de templates por gestores da org" ON public.chat_message_templates
    FOR DELETE USING (
        org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );
