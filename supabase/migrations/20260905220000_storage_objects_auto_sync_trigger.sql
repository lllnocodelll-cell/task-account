-- Migration: Sincronização automática em tempo real do uso de armazenamento por organização
-- Trigger na tabela interna storage.objects do Supabase
-- Data: 2026-09-05

CREATE OR REPLACE FUNCTION public.trg_auto_sync_storage_used()
RETURNS trigger AS $$
DECLARE
    v_owner uuid;
    v_org_id uuid;
    v_total bigint := 0;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_owner := OLD.owner;
    ELSE
        v_owner := NEW.owner;
    END IF;

    IF v_owner IS NOT NULL THEN
        -- Identifica a organização à qual o proprietário do arquivo pertence
        SELECT COALESCE(org_id, id) INTO v_org_id
        FROM public.profiles
        WHERE id = v_owner;

        IF v_org_id IS NOT NULL THEN
            -- Recalcula o somatório de bytes consumidos por todos os membros desta organização
            SELECT COALESCE(SUM((o.metadata->>'size')::bigint), 0) INTO v_total
            FROM storage.objects o
            JOIN public.profiles p ON p.id = o.owner
            WHERE COALESCE(p.org_id, p.id) = v_org_id;

            -- Atualiza diretamente o escritório no banco de dados
            UPDATE public.office_details
            SET 
                storage_used_bytes = v_total,
                updated_at = timezone('utc'::text, now())
            WHERE org_id = v_org_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criação da Trigger em storage.objects
DROP TRIGGER IF EXISTS trg_storage_objects_auto_sync ON storage.objects;
CREATE TRIGGER trg_storage_objects_auto_sync
AFTER INSERT OR UPDATE OF metadata, owner OR DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_sync_storage_used();

-- Sincronização inicial para todos os escritórios já existentes
UPDATE public.office_details od
SET 
    storage_used_bytes = COALESCE((
        SELECT SUM((o.metadata->>'size')::bigint)
        FROM storage.objects o
        JOIN public.profiles p ON p.id = o.owner
        WHERE COALESCE(p.org_id, p.id) = od.org_id
    ), 0),
    updated_at = timezone('utc'::text, now());
