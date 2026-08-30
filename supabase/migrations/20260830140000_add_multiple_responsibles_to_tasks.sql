-- Migration: Adicionar suporte a múltiplos responsáveis em tarefas contábeis (responsibles TEXT[])

-- 1. Criar a coluna responsibles se não existir
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS responsibles TEXT[] DEFAULT '{}';

-- 2. Migrar dados existentes da coluna responsible para o array responsibles
UPDATE public.tasks 
SET responsibles = ARRAY[responsible] 
WHERE responsible IS NOT NULL 
  AND responsible != '' 
  AND (responsibles IS NULL OR array_length(responsibles, 1) IS NULL OR array_length(responsibles, 1) = 0);

-- 3. Criar trigger para manter a coluna legacy responsible em sincronia com o primeiro responsável
CREATE OR REPLACE FUNCTION public.sync_task_primary_responsible()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.responsibles IS NOT NULL AND array_length(NEW.responsibles, 1) > 0 THEN
        NEW.responsible := NEW.responsibles[1];
    ELSIF NEW.responsible IS NOT NULL AND NEW.responsible != '' THEN
        NEW.responsibles := ARRAY[NEW.responsible];
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_task_primary_responsible ON public.tasks;
CREATE TRIGGER trg_sync_task_primary_responsible
BEFORE INSERT OR UPDATE OF responsible, responsibles ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_primary_responsible();
