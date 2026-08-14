-- Migração para adicionar started_at e completed_at na tabela tasks
-- Habilita métricas de tempo de execução e tempo médio de conclusão por colaborador

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE NULL;

-- Preenchimento retroativo para tarefas que já estão concluídas
UPDATE public.tasks 
SET completed_at = COALESCE(created_at, NOW()) 
WHERE status = 'Concluída' AND completed_at IS NULL;

-- Função trigger para atualizar automaticamente started_at e completed_at
CREATE OR REPLACE FUNCTION public.handle_task_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando status mudar para 'Iniciada', definir started_at se estiver nulo
    IF NEW.status = 'Iniciada' AND (OLD.started_at IS NULL OR NEW.started_at IS NULL) THEN
        NEW.started_at := NOW();
    END IF;

    -- Quando status mudar para 'Concluída', definir completed_at se estiver nulo
    IF NEW.status = 'Concluída' AND (OLD.completed_at IS NULL OR NEW.completed_at IS NULL) THEN
        NEW.completed_at := NOW();
    END IF;

    -- Se a tarefa for reaberta ou status mudar para algo diferente de 'Concluída', limpar completed_at
    IF NEW.status != 'Concluída' AND OLD.status = 'Concluída' THEN
        NEW.completed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associar a trigger na tabela tasks se ainda não existir
DROP TRIGGER IF EXISTS trg_task_status_timestamps ON public.tasks;
CREATE TRIGGER trg_task_status_timestamps
BEFORE INSERT OR UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_status_timestamps();
