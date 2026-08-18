-- Migração para adicionar colunas de cronômetro e tempo trabalhado na tabela tasks
-- Suporta o status 'Pausada' e mantém a contagem precisa de segundos mesmo se cancelada/pausada/reaberta

-- 1. Adicionar colunas se não existirem
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS total_time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Atualizar a trigger para calcular e acumular o tempo trabalhado automaticamente
CREATE OR REPLACE FUNCTION public.handle_task_status_timestamps()
RETURNS TRIGGER AS $$
DECLARE
    v_elapsed_seconds INT := 0;
BEGIN
    -- Quando status mudar para 'Iniciada'
    IF NEW.status = 'Iniciada' THEN
        IF NEW.started_at IS NULL THEN
            NEW.started_at := NOW();
        END IF;
        NEW.timer_started_at := NOW();
    END IF;

    -- Quando status sair de 'Iniciada' (para 'Pausada', 'Pendente', 'Concluída', 'Atrasada', etc.)
    IF OLD.status = 'Iniciada' AND NEW.status != 'Iniciada' THEN
        IF OLD.timer_started_at IS NOT NULL THEN
            v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - OLD.timer_started_at))::INT;
            IF v_elapsed_seconds > 0 THEN
                NEW.total_time_spent_seconds := COALESCE(OLD.total_time_spent_seconds, 0) + v_elapsed_seconds;
            END IF;
        END IF;
        NEW.timer_started_at := NULL;
    END IF;

    -- Quando status mudar para 'Concluída'
    IF NEW.status = 'Concluída' THEN
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at := NOW();
        END IF;
        NEW.timer_started_at := NULL;
    END IF;

    -- Se a tarefa for reaberta ou status mudar para algo diferente de 'Concluída'
    IF NEW.status != 'Concluída' AND OLD.status = 'Concluída' THEN
        NEW.completed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garantir que a trigger está ativa
DROP TRIGGER IF EXISTS trg_task_status_timestamps ON public.tasks;
CREATE TRIGGER trg_task_status_timestamps
BEFORE INSERT OR UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_status_timestamps();
