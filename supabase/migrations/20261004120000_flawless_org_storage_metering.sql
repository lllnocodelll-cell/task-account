-- Migration: Medição Perfeita e Determinística de Armazenamento por Escritório (org_id)
-- Data: 2026-10-04
-- Descrição:
--   1. Cria função get_storage_object_org_id que identifica o org_id proprietário de qualquer objeto no Supabase Storage.
--   2. Cria calculate_org_storage_used_bytes para somatório real de bytes por organização.
--   3. Atualiza sync_office_storage_usage para recalcular e atualizar office_details.
--   4. Instala a trigger trg_storage_objects_auto_sync em storage.objects para atualização em tempo real (INSERT/UPDATE/DELETE).
--   5. Executa a sincronização inicial de todos os escritórios existentes.

-- 1. Função auxiliar para identificar a organização (org_id) de qualquer objeto no storage
CREATE OR REPLACE FUNCTION public.get_storage_object_org_id(
    p_bucket_id text, 
    p_name text, 
    p_owner uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
    v_segment text;
    v_uuid uuid;
BEGIN
    v_segment := split_part(p_name, '/', 1);
    
    -- CASO 1: Bucket client-documents
    IF p_bucket_id = 'client-documents' THEN
        -- Se estiver no path padrão de tarefas: tasks/<task_id>/...
        IF v_segment = 'tasks' THEN
            BEGIN
                v_uuid := split_part(p_name, '/', 2)::uuid;
                SELECT org_id INTO v_org_id FROM public.tasks WHERE id = v_uuid;
                IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        ELSE
            -- Se for <client_id>/...
            BEGIN
                v_uuid := v_segment::uuid;
                SELECT org_id INTO v_org_id FROM public.clients WHERE id = v_uuid;
                IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        -- Busca direta em client_documents
        SELECT cd.org_id INTO v_org_id 
        FROM public.client_documents cd 
        WHERE cd.storage_path = p_name 
        LIMIT 1;
        IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;

        -- Busca em task_attachments
        SELECT t.org_id INTO v_org_id 
        FROM public.task_attachments ta 
        JOIN public.tasks t ON t.id = ta.task_id 
        WHERE ta.storage_path = p_name 
        LIMIT 1;
        IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;

    -- CASO 2: Bucket chat_attachments (<channel_id>/...)
    ELSIF p_bucket_id = 'chat_attachments' THEN
        BEGIN
            v_uuid := v_segment::uuid;
            SELECT org_id INTO v_org_id FROM public.chat_channels WHERE id = v_uuid;
            IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

    -- CASO 3: Bucket tutorials (<org_id>/... ou tutorials.file_path)
    ELSIF p_bucket_id = 'tutorials' THEN
        BEGIN
            v_uuid := v_segment::uuid;
            IF EXISTS (SELECT 1 FROM public.office_details WHERE org_id = v_uuid) THEN
                RETURN v_uuid;
            END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        SELECT tut.org_id INTO v_org_id FROM public.tutorials tut WHERE tut.file_path = p_name LIMIT 1;
        IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;

    -- CASO 4: Bucket avatars (<user_id>/...)
    ELSIF p_bucket_id = 'avatars' THEN
        BEGIN
            v_uuid := v_segment::uuid;
            SELECT COALESCE(org_id, id) INTO v_org_id FROM public.profiles WHERE id = v_uuid;
            IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- CASO 5: Mapeamento pelo owner do arquivo na profiles
    IF p_owner IS NOT NULL THEN
        SELECT COALESCE(org_id, id) INTO v_org_id FROM public.profiles WHERE id = p_owner;
        IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;
    END IF;

    -- CASO 6: Se o path contiver explicitamente o UUID de algum escritório
    BEGIN
        SELECT od.org_id INTO v_org_id 
        FROM public.office_details od 
        WHERE p_name LIKE '%' || od.org_id::text || '%' 
        LIMIT 1;
        IF v_org_id IS NOT NULL THEN RETURN v_org_id; END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN NULL;
END;
$$;

-- 2. Função de cálculo completo e atômico de armazenamento de uma organização
CREATE OR REPLACE FUNCTION public.calculate_org_storage_used_bytes(p_org_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_bytes BIGINT := 0;
BEGIN
    SELECT COALESCE(SUM((o.metadata->>'size')::bigint), 0)
    INTO v_total_bytes
    FROM storage.objects o
    WHERE public.get_storage_object_org_id(o.bucket_id, o.name, o.owner) = p_org_id;

    RETURN v_total_bytes;
END;
$$;

-- 3. Função RPC para sincronizar o consumo e salvar em office_details
CREATE OR REPLACE FUNCTION public.sync_office_storage_usage(p_org_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_bytes BIGINT := 0;
BEGIN
    IF p_org_id IS NULL THEN
        RETURN 0;
    END IF;

    v_total_bytes := public.calculate_org_storage_used_bytes(p_org_id);

    UPDATE public.office_details
    SET 
        storage_used_bytes = v_total_bytes,
        updated_at = timezone('utc'::text, now())
    WHERE org_id = p_org_id;

    RETURN v_total_bytes;
END;
$$;

-- 4. Função Trigger que reage imediatamente a alterações em storage.objects
CREATE OR REPLACE FUNCTION public.trg_auto_sync_storage_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_org_id uuid;
    v_old_org_id uuid;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_target_org_id := public.get_storage_object_org_id(OLD.bucket_id, OLD.name, OLD.owner);
        IF v_target_org_id IS NOT NULL THEN
            PERFORM public.sync_office_storage_usage(v_target_org_id);
        END IF;
    ELSE
        v_target_org_id := public.get_storage_object_org_id(NEW.bucket_id, NEW.name, NEW.owner);
        IF v_target_org_id IS NOT NULL THEN
            PERFORM public.sync_office_storage_usage(v_target_org_id);
        END IF;

        IF (TG_OP = 'UPDATE') THEN
            v_old_org_id := public.get_storage_object_org_id(OLD.bucket_id, OLD.name, OLD.owner);
            IF v_old_org_id IS NOT NULL AND v_old_org_id IS DISTINCT FROM v_target_org_id THEN
                PERFORM public.sync_office_storage_usage(v_old_org_id);
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

-- Recria a trigger na tabela storage.objects
DROP TRIGGER IF EXISTS trg_storage_objects_auto_sync ON storage.objects;
CREATE TRIGGER trg_storage_objects_auto_sync
AFTER INSERT OR UPDATE OF metadata, name, owner OR DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_sync_storage_used();

-- 5. Sincronização inicial para todos os escritórios ativos
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT org_id FROM public.office_details LOOP
        PERFORM public.sync_office_storage_usage(r.org_id);
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.get_storage_object_org_id IS 'Identifica a organização proprietária de qualquer arquivo no Supabase Storage.';
COMMENT ON FUNCTION public.calculate_org_storage_used_bytes IS 'Calcula com exatidão o volume consumido em bytes por uma organização.';
COMMENT ON FUNCTION public.sync_office_storage_usage IS 'Sincroniza e persiste o volume consumido em bytes na tabela office_details.';
