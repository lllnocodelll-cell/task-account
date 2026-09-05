-- Migration: Correção definitiva da sincronização de responsáveis primários e co-responsáveis
-- Garante que responsibles seja a fonte da verdade sem preservar colaboradores desmarcados na edição em cascata

CREATE OR REPLACE FUNCTION public.sync_task_primary_responsible()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1. Se NEW.responsibles foi fornecido explicitamente com elementos:
    IF NEW.responsibles IS NOT NULL AND array_length(NEW.responsibles, 1) > 0 THEN
        NEW.responsible := NEW.responsibles[1];
    -- 2. Se apenas NEW.responsible foi fornecido:
    ELSIF NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN
        NEW.responsibles := ARRAY[NEW.responsible];
    END IF;

    RETURN NEW;
END;
$function$;
