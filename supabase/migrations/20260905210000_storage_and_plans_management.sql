-- Migration: Gerenciamento inteligente de armazenamento e parâmetros de planos contábeis
-- Data: 2026-09-05

-- 1. Função RPC para atualizar os limites de um plano em massa para escritórios existentes
-- Caso a política comercial do escritório mude (ex: aumentar Bronze de 50GB para 80GB),
-- basta executar: SELECT public.update_office_plan_limits('Bronze', 80, 199.90);
CREATE OR REPLACE FUNCTION public.update_office_plan_limits(
    p_plan_name TEXT,
    p_new_limit_gb INT,
    p_new_price NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    affected_offices INT,
    plan_updated TEXT,
    new_storage_gb INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected INT := 0;
BEGIN
    IF p_new_price IS NOT NULL THEN
        UPDATE public.office_details
        SET 
            storage_limit_gb = p_new_limit_gb,
            plan_value = p_new_price,
            updated_at = timezone('utc'::text, now())
        WHERE LOWER(plan_name) = LOWER(p_plan_name);
    ELSE
        UPDATE public.office_details
        SET 
            storage_limit_gb = p_new_limit_gb,
            updated_at = timezone('utc'::text, now())
        WHERE LOWER(plan_name) = LOWER(p_plan_name);
    END IF;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    RETURN QUERY SELECT v_affected, p_plan_name, p_new_limit_gb;
END;
$$;

-- 2. Função RPC para recalcular e sincronizar o armazenamento consumido de uma organização
CREATE OR REPLACE FUNCTION public.sync_office_storage_usage(p_org_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_bytes BIGINT := 0;
    v_task_att_bytes BIGINT := 0;
    v_storage_objects_bytes BIGINT := 0;
BEGIN
    -- Soma bytes dos anexos registrados em tarefas da organização
    SELECT COALESCE(SUM(ta.file_size), 0)
    INTO v_task_att_bytes
    FROM public.task_attachments ta
    JOIN public.tasks t ON t.id = ta.task_id
    WHERE t.org_id = p_org_id;

    -- Soma também objetos do bucket do supabase storage quando o path pertencer à organização
    -- No Supabase Storage, a tabela interna storage.objects pode ser inspecionada com SECURITY DEFINER
    BEGIN
        SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
        INTO v_storage_objects_bytes
        FROM storage.objects
        WHERE (
            name LIKE p_org_id::text || '/%'
            OR name LIKE '%/' || p_org_id::text || '/%'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Fallback seguro se storage.objects não tiver permissão direta ou formato customizado
        v_storage_objects_bytes := 0;
    END;

    -- Usa o maior valor apurado para garantir que não haja subcontagem
    v_total_bytes := GREATEST(v_task_att_bytes, v_storage_objects_bytes);

    -- Se ambos forem 0 e o escritório já possui valor registrado, mantém o atual ou atualiza
    IF v_total_bytes > 0 THEN
        UPDATE public.office_details
        SET 
            storage_used_bytes = v_total_bytes,
            updated_at = timezone('utc'::text, now())
        WHERE org_id = p_org_id;
    END IF;

    RETURN v_total_bytes;
END;
$$;

-- Comentários de documentação
COMMENT ON FUNCTION public.update_office_plan_limits IS 'Atualiza os limites de armazenamento (GB) e valor de planos para todos os escritórios de uma categoria.';
COMMENT ON FUNCTION public.sync_office_storage_usage IS 'Sincroniza e recalcula o volume em bytes consumido pelos arquivos da organização.';
