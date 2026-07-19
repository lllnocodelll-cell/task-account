-- Criar a tabela office_details
CREATE TABLE IF NOT EXISTS public.office_details (
    org_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    document TEXT,
    constitution_date DATE,
    zip_code TEXT,
    street TEXT,
    street_number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    plan_name TEXT DEFAULT 'Bronze'::text NOT NULL,
    plan_value NUMERIC(10,2) DEFAULT 199.90 NOT NULL,
    storage_limit_gb INTEGER DEFAULT 50 NOT NULL,
    storage_used_bytes BIGINT DEFAULT 0 NOT NULL,
    contract_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.office_details ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura para membros da org" ON public.office_details;
CREATE POLICY "Permitir leitura para membros da org" ON public.office_details
    FOR SELECT USING (
        org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

DROP POLICY IF EXISTS "Permitir gestor atualizar dados" ON public.office_details;
CREATE POLICY "Permitir gestor atualizar dados" ON public.office_details
    FOR ALL USING (
        org_id = auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'gestor'
    );
