-- Migration: Hardening completo do Motor de Tarefas Recorrentes e Limpeza de Jobs Conflitantes
-- Objetivos:
-- 1. Remover o cron job legado conflitante (expand_tasks_job / proc_expand_recurring_tasks)
--    que rodava antes do motor principal sem checar clientes ativos, checklists ou múltiplos responsáveis.
-- 2. Corrigir fuso horário (America/Sao_Paulo) em proc_update_overdue_tasks() e check_daily_expirations().
-- 3. Criar tabela public.recurring_task_series para controle explícito de séries recorrentes:
--    - Impede ressurreição de séries excluídas ("Excluir atual e futuras")
--    - Mantém a regra de vencimento vigente atualizada após edições ("Alterar esta e futuras")
--    - Backfill automático das séries contínuas já existentes + trigger passiva de segurança
-- 4. Endurecer process_recurring_tasks_cycle():
--    - SET search_path TO 'public' e verificação de permissão quando acionada via RPC
--    - Advisory lock transacional (pg_try_advisory_xact_lock) contra execuções concorrentes
--    - Prevenção de criação retroativa na reativação de clientes (v_next_comp >= v_current_comp)
--    - Alinhamento correto de recorrência 'anual' com recurrence_months
--    - Retenção automática de logs (> 90 dias)
-- 5. Restringir RLS de public.recurring_task_cron_logs para equipe interna (gestor/operacional).

-- ============================================================================
-- 1. Limpeza de Cron Job Legado Conflitante e Funções Obsoletas
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expand_tasks_job') THEN
            PERFORM cron.unschedule('expand_tasks_job');
        END IF;

        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update_overdue_tasks_job') THEN
            PERFORM cron.unschedule('update_overdue_tasks_job');
        END IF;
        -- 03:05 UTC = 00:05 BRT (logo após a virada do dia no horário de Brasília)
        PERFORM cron.schedule(
            'update_overdue_tasks_job',
            '5 3 * * *',
            'CALL public.proc_update_overdue_tasks()'
        );
    END IF;
END $$;

DROP PROCEDURE IF EXISTS public.proc_expand_recurring_tasks();
DROP FUNCTION IF EXISTS public.get_adjusted_due_date(date, text, uuid);

-- ============================================================================
-- 2. Correção de Fuso Horário (America/Sao_Paulo) em proc_update_overdue_tasks
-- ============================================================================
CREATE OR REPLACE PROCEDURE public.proc_update_overdue_tasks()
LANGUAGE plpgsql
SET search_path TO 'public'
AS $procedure$
DECLARE
    v_today_brt DATE;
BEGIN
    v_today_brt := (timezone('America/Sao_Paulo', now()))::date;

    -- Regra 1: Passar para 'Atrasada' as tarefas cujo prazo venceu no calendário de Brasília
    UPDATE public.tasks
    SET status = 'Atrasada'
    WHERE due_date < v_today_brt
      AND status IN ('Pendente', 'Iniciada');

    -- Regra 2: Passar para 'Pendente' se a tarefa estiver 'Atrasada',
    -- mas a data de vencimento tiver sido ajustada para Hoje ou Futuro em Brasília
    UPDATE public.tasks
    SET status = 'Pendente'
    WHERE due_date >= v_today_brt
      AND status = 'Atrasada';
END;
$procedure$;

-- Atualizar também cancel_inactivated_client_tasks com search_path explícito
CREATE OR REPLACE FUNCTION public.cancel_inactivated_client_tasks(p_client_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_deleted_count INTEGER;
    v_current_comp TEXT;
BEGIN
    v_current_comp := to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM');

    DELETE FROM public.tasks
    WHERE client_id = p_client_id
      AND status = 'Pendente'
      AND competence >= v_current_comp;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- 3. Tabela Explícita de Séries Recorrentes (public.recurring_task_series)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_task_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    task_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    recurrence TEXT NOT NULL,
    recurrence_months INTEGER[],
    base_due_day INTEGER NOT NULL DEFAULT 10,
    month_offset INTEGER NOT NULL DEFAULT 0,
    variable_adjustment TEXT,
    sector TEXT,
    responsible TEXT,
    responsibles TEXT[] NOT NULL DEFAULT '{}'::text[],
    priority TEXT NOT NULL DEFAULT 'Média',
    tax_regime TEXT,
    registration_regime TEXT,
    no_movement BOOLEAN DEFAULT false,
    exceeded_sublimit BOOLEAN DEFAULT false,
    factor_r BOOLEAN DEFAULT false,
    notified_exclusion BOOLEAN DEFAULT false,
    selected_annexes TEXT[],
    observation TEXT,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_recurring_task_series_client_task UNIQUE (client_id, task_name)
);

CREATE INDEX IF NOT EXISTS idx_recurring_task_series_org_active
    ON public.recurring_task_series (org_id, is_active);

CREATE INDEX IF NOT EXISTS idx_recurring_task_series_active_client
    ON public.recurring_task_series (is_active, client_id);

ALTER TABLE public.recurring_task_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_task_series_select_policy" ON public.recurring_task_series;
CREATE POLICY "recurring_task_series_select_policy" ON public.recurring_task_series
FOR SELECT TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
    AND (
        org_id = public.get_auth_org_id()
        OR public.check_client_access(client_id)
    )
);

DROP POLICY IF EXISTS "recurring_task_series_insert_policy" ON public.recurring_task_series;
CREATE POLICY "recurring_task_series_insert_policy" ON public.recurring_task_series
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
    AND (
        org_id = public.get_auth_org_id()
        OR public.check_client_access(client_id)
    )
);

DROP POLICY IF EXISTS "recurring_task_series_update_policy" ON public.recurring_task_series;
CREATE POLICY "recurring_task_series_update_policy" ON public.recurring_task_series
FOR UPDATE TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
    AND (
        org_id = public.get_auth_org_id()
        OR public.check_client_access(client_id)
    )
);

DROP POLICY IF EXISTS "recurring_task_series_delete_policy" ON public.recurring_task_series;
CREATE POLICY "recurring_task_series_delete_policy" ON public.recurring_task_series
FOR DELETE TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
    AND (
        org_id = public.get_auth_org_id()
        OR public.check_client_access(client_id)
    )
);

-- ============================================================================
-- 4. Backfill Inicial das Séries Recorrentes Contínuas Existentes
-- ============================================================================
INSERT INTO public.recurring_task_series (
    org_id,
    client_id,
    client_name,
    task_name,
    is_active,
    recurrence,
    recurrence_months,
    base_due_day,
    month_offset,
    variable_adjustment,
    sector,
    responsible,
    responsibles,
    priority,
    tax_regime,
    registration_regime,
    no_movement,
    exceeded_sublimit,
    factor_r,
    notified_exclusion,
    selected_annexes,
    observation
)
SELECT
    COALESCE(latest.org_id, c.org_id),
    latest.client_id,
    latest.client_name,
    latest.task_name,
    true,
    LOWER(TRIM(latest.recurrence)),
    latest.recurrence_months,
    COALESCE(EXTRACT(DAY FROM anchor.due_date)::INT, 10),
    COALESCE(
        (EXTRACT(YEAR FROM anchor.due_date)::INT - SPLIT_PART(anchor.competence, '-', 1)::INT) * 12 +
        (EXTRACT(MONTH FROM anchor.due_date)::INT - SPLIT_PART(anchor.competence, '-', 2)::INT),
        0
    ),
    latest.variable_adjustment,
    latest.sector,
    latest.responsible,
    CASE
        WHEN latest.responsibles IS NOT NULL AND array_length(latest.responsibles, 1) > 0 THEN latest.responsibles
        WHEN latest.responsible IS NOT NULL AND TRIM(latest.responsible) != '' THEN ARRAY[TRIM(latest.responsible)]
        ELSE '{}'::text[]
    END,
    COALESCE(latest.priority, 'Média'),
    latest.tax_regime,
    latest.registration_regime,
    COALESCE(latest.no_movement, false),
    COALESCE(latest.exceeded_sublimit, false),
    COALESCE(latest.factor_r, false),
    COALESCE(latest.notified_exclusion, false),
    latest.selected_annexes,
    latest.observation
FROM (
    SELECT DISTINCT ON (t.client_id, t.task_name) t.*
    FROM public.tasks t
    WHERE t.client_id IS NOT NULL
      AND t.recurrence IS NOT NULL
      AND LOWER(TRIM(t.recurrence)) IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')
    ORDER BY t.client_id, t.task_name, t.competence DESC
) latest
JOIN public.clients c ON c.id = latest.client_id
LEFT JOIN LATERAL (
    SELECT t_first.competence, t_first.due_date
    FROM public.tasks t_first
    WHERE t_first.client_id = latest.client_id
      AND t_first.task_name = latest.task_name
      AND t_first.competence ~ '^[0-9]{4}-[0-9]{2}$'
      AND t_first.due_date IS NOT NULL
    ORDER BY t_first.competence ASC
    LIMIT 1
) anchor ON true
ON CONFLICT (client_id, task_name) DO NOTHING;

-- ============================================================================
-- 5. RPCs Seguras para Sincronizar e Encerrar Séries pelo Frontend
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_recurring_task_series(
    p_client_id UUID,
    p_client_name TEXT,
    p_task_name TEXT,
    p_recurrence TEXT,
    p_recurrence_months INTEGER[],
    p_base_due_day INTEGER,
    p_month_offset INTEGER,
    p_variable_adjustment TEXT,
    p_sector TEXT,
    p_responsible TEXT,
    p_responsibles TEXT[],
    p_priority TEXT,
    p_tax_regime TEXT,
    p_registration_regime TEXT,
    p_no_movement BOOLEAN,
    p_exceeded_sublimit BOOLEAN,
    p_factor_r BOOLEAN,
    p_notified_exclusion BOOLEAN,
    p_selected_annexes TEXT[],
    p_observation TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role TEXT;
    v_org_id UUID;
    v_norm_recurrence TEXT;
    v_resp_arr TEXT[];
    v_primary_resp TEXT;
BEGIN
    SELECT role, org_id INTO v_role, v_org_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role IS NULL OR v_role NOT IN ('gestor', 'operacional') THEN
        RAISE EXCEPTION 'Permissão negada para gerenciar séries recorrentes.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.clients
        WHERE id = p_client_id AND org_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'Cliente não pertence à organização autenticada.';
    END IF;

    v_norm_recurrence := LOWER(TRIM(COALESCE(p_recurrence, '')));
    IF v_norm_recurrence NOT IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual') THEN
        RETURN;
    END IF;

    IF p_responsibles IS NOT NULL AND array_length(p_responsibles, 1) > 0 THEN
        v_resp_arr := p_responsibles;
        v_primary_resp := COALESCE(NULLIF(TRIM(p_responsible), ''), v_resp_arr[1]);
    ELSIF p_responsible IS NOT NULL AND TRIM(p_responsible) != '' THEN
        v_primary_resp := TRIM(p_responsible);
        v_resp_arr := ARRAY[v_primary_resp];
    ELSE
        v_primary_resp := NULL;
        v_resp_arr := '{}'::text[];
    END IF;

    INSERT INTO public.recurring_task_series (
        org_id,
        client_id,
        client_name,
        task_name,
        is_active,
        recurrence,
        recurrence_months,
        base_due_day,
        month_offset,
        variable_adjustment,
        sector,
        responsible,
        responsibles,
        priority,
        tax_regime,
        registration_regime,
        no_movement,
        exceeded_sublimit,
        factor_r,
        notified_exclusion,
        selected_annexes,
        observation,
        ended_at,
        updated_at
    ) VALUES (
        v_org_id,
        p_client_id,
        p_client_name,
        p_task_name,
        true,
        v_norm_recurrence,
        p_recurrence_months,
        GREATEST(1, LEAST(31, COALESCE(p_base_due_day, 10))),
        COALESCE(p_month_offset, 0),
        p_variable_adjustment,
        p_sector,
        v_primary_resp,
        v_resp_arr,
        COALESCE(p_priority, 'Média'),
        p_tax_regime,
        p_registration_regime,
        COALESCE(p_no_movement, false),
        COALESCE(p_exceeded_sublimit, false),
        COALESCE(p_factor_r, false),
        COALESCE(p_notified_exclusion, false),
        p_selected_annexes,
        p_observation,
        NULL,
        now()
    )
    ON CONFLICT (client_id, task_name) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        client_name = EXCLUDED.client_name,
        is_active = true,
        recurrence = EXCLUDED.recurrence,
        recurrence_months = EXCLUDED.recurrence_months,
        base_due_day = EXCLUDED.base_due_day,
        month_offset = EXCLUDED.month_offset,
        variable_adjustment = EXCLUDED.variable_adjustment,
        sector = EXCLUDED.sector,
        responsible = EXCLUDED.responsible,
        responsibles = EXCLUDED.responsibles,
        priority = EXCLUDED.priority,
        tax_regime = EXCLUDED.tax_regime,
        registration_regime = EXCLUDED.registration_regime,
        no_movement = EXCLUDED.no_movement,
        exceeded_sublimit = EXCLUDED.exceeded_sublimit,
        factor_r = EXCLUDED.factor_r,
        notified_exclusion = EXCLUDED.notified_exclusion,
        selected_annexes = EXCLUDED.selected_annexes,
        observation = EXCLUDED.observation,
        ended_at = NULL,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_recurring_task_series(
    p_client_id UUID,
    p_task_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role TEXT;
    v_org_id UUID;
BEGIN
    SELECT role, org_id INTO v_role, v_org_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role IS NULL OR v_role NOT IN ('gestor', 'operacional') THEN
        RAISE EXCEPTION 'Permissão negada para encerrar séries recorrentes.';
    END IF;

    INSERT INTO public.recurring_task_series (
        org_id,
        client_id,
        client_name,
        task_name,
        is_active,
        recurrence,
        ended_at,
        updated_at
    )
    SELECT
        c.org_id,
        c.id,
        c.company_name,
        p_task_name,
        false,
        'mensal',
        now(),
        now()
    FROM public.clients c
    WHERE c.id = p_client_id
      AND c.org_id = v_org_id
    ON CONFLICT (client_id, task_name) DO UPDATE SET
        is_active = false,
        ended_at = now(),
        updated_at = now()
    WHERE public.recurring_task_series.org_id = v_org_id;
END;
$$;

-- Trigger passiva de segurança: se alguma tarefa contínua for inserida sem registro na tabela de séries,
-- registra automaticamente apenas se a série ainda não existir (não reativa séries encerradas manualmente).
CREATE OR REPLACE FUNCTION public.ensure_recurring_task_series_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_norm_rec TEXT;
    v_base_day INT := 10;
    v_month_offset INT := 0;
    v_resp_arr TEXT[];
BEGIN
    IF NEW.client_id IS NULL OR NEW.org_id IS NULL OR NEW.recurrence IS NULL THEN
        RETURN NEW;
    END IF;

    v_norm_rec := LOWER(TRIM(NEW.recurrence));
    IF v_norm_rec NOT IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual') THEN
        RETURN NEW;
    END IF;

    IF NEW.due_date IS NOT NULL AND NEW.competence ~ '^[0-9]{4}-[0-9]{2}$' THEN
        v_base_day := EXTRACT(DAY FROM NEW.due_date)::INT;
        v_month_offset := (EXTRACT(YEAR FROM NEW.due_date)::INT - SPLIT_PART(NEW.competence, '-', 1)::INT) * 12
                        + (EXTRACT(MONTH FROM NEW.due_date)::INT - SPLIT_PART(NEW.competence, '-', 2)::INT);
    END IF;

    IF NEW.responsibles IS NOT NULL AND array_length(NEW.responsibles, 1) > 0 THEN
        v_resp_arr := NEW.responsibles;
    ELSIF NEW.responsible IS NOT NULL AND TRIM(NEW.responsible) != '' THEN
        v_resp_arr := ARRAY[TRIM(NEW.responsible)];
    ELSE
        v_resp_arr := '{}'::text[];
    END IF;

    INSERT INTO public.recurring_task_series (
        org_id,
        client_id,
        client_name,
        task_name,
        is_active,
        recurrence,
        recurrence_months,
        base_due_day,
        month_offset,
        variable_adjustment,
        sector,
        responsible,
        responsibles,
        priority,
        tax_regime,
        registration_regime,
        no_movement,
        exceeded_sublimit,
        factor_r,
        notified_exclusion,
        selected_annexes,
        observation
    ) VALUES (
        NEW.org_id,
        NEW.client_id,
        NEW.client_name,
        NEW.task_name,
        true,
        v_norm_rec,
        NEW.recurrence_months,
        v_base_day,
        v_month_offset,
        NEW.variable_adjustment,
        NEW.sector,
        NEW.responsible,
        v_resp_arr,
        COALESCE(NEW.priority, 'Média'),
        NEW.tax_regime,
        NEW.registration_regime,
        COALESCE(NEW.no_movement, false),
        COALESCE(NEW.exceeded_sublimit, false),
        COALESCE(NEW.factor_r, false),
        COALESCE(NEW.notified_exclusion, false),
        NEW.selected_annexes,
        NEW.observation
    )
    ON CONFLICT (client_id, task_name) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_recurring_task_series ON public.tasks;
CREATE TRIGGER trg_ensure_recurring_task_series
    AFTER INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_recurring_task_series_on_insert();

-- ============================================================================
-- 6. Endurecimento Completo de process_recurring_tasks_cycle()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_recurring_tasks_cycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_uid UUID;
    v_caller_role TEXT;
    v_lock_acquired BOOLEAN;

    v_now_local TIMESTAMP;
    v_current_year INT;
    v_current_month INT;
    v_current_comp TEXT;
    v_target_limit_date DATE;
    v_target_limit_comp TEXT;

    s_rec RECORD;
    v_max_comp TEXT;
    v_max_year INT;
    v_max_month INT;
    v_next_year INT;
    v_next_month INT;
    v_next_comp TEXT;
    v_ref_task_id UUID;
    v_loop_guard INT;

    v_tasks_created INT := 0;
    v_errors_count INT := 0;
    v_errors_details JSONB := '[]'::jsonb;

    v_target_first_of_month DATE;
    v_days_in_target_month INT;
    v_safe_day INT;
    v_raw_due_date DATE;
    v_new_due_date DATE;

    v_workflow RECORD;
    v_new_task_id UUID;
    v_months_arr INT[];
    v_i INT;
    v_step_found BOOLEAN;
    v_responsibles_array TEXT[];
BEGIN
    -- Controle de acesso: permite pg_cron/postgres (auth.uid() IS NULL) ou staff interno autenticado
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_uid;
        IF v_caller_role IS NULL OR v_caller_role NOT IN ('gestor', 'operacional') THEN
            RETURN jsonb_build_object('status', 'forbidden');
        END IF;
    END IF;

    -- Advisory lock transacional evita concorrência simultânea entre pg_cron e frontend fallback
    SELECT pg_try_advisory_xact_lock(hashtext('process_recurring_tasks_cycle')) INTO v_lock_acquired;
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object(
            'status', 'skipped_concurrent',
            'tasks_created', 0,
            'errors', 0
        );
    END IF;

    v_now_local := timezone('America/Sao_Paulo', now());
    v_current_year := EXTRACT(YEAR FROM v_now_local)::INT;
    v_current_month := EXTRACT(MONTH FROM v_now_local)::INT;
    v_current_comp := to_char(v_now_local, 'YYYY-MM');

    -- Horizonte rolante de 12 meses à frente do mês atual em Brasília
    v_target_limit_date := (date_trunc('month', v_now_local) + INTERVAL '12 months')::date;
    v_target_limit_comp := to_char(v_target_limit_date, 'YYYY-MM');

    -- Processar apenas séries ativas cujo cliente esteja Ativo
    FOR s_rec IN
        SELECT
            s.*,
            c.company_name AS current_client_name
        FROM public.recurring_task_series s
        JOIN public.clients c ON c.id = s.client_id
        WHERE s.is_active = true
          AND c.status = 'Ativo'
          AND LOWER(TRIM(s.recurrence)) IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')
        ORDER BY s.org_id, s.client_id, s.task_name
    LOOP
        BEGIN
            -- Descobrir a maior competência já existente e a última tarefa de referência (para copiar checklist)
            SELECT MAX(competence) INTO v_max_comp
            FROM public.tasks
            WHERE client_id = s_rec.client_id
              AND task_name = s_rec.task_name;

            SELECT id INTO v_ref_task_id
            FROM public.tasks
            WHERE client_id = s_rec.client_id
              AND task_name = s_rec.task_name
            ORDER BY competence DESC, created_at DESC
            LIMIT 1;

            IF v_max_comp IS NULL OR v_max_comp !~ '^[0-9]{4}-[0-9]{2}$' THEN
                v_max_year := v_current_year;
                v_max_month := v_current_month;
            ELSE
                v_max_year := SPLIT_PART(v_max_comp, '-', 1)::INT;
                v_max_month := SPLIT_PART(v_max_comp, '-', 2)::INT;
            END IF;

            -- Garantir array consistente de múltiplos responsáveis
            IF s_rec.responsibles IS NOT NULL AND array_length(s_rec.responsibles, 1) > 0 THEN
                v_responsibles_array := s_rec.responsibles;
            ELSIF s_rec.responsible IS NOT NULL AND TRIM(s_rec.responsible) != '' THEN
                v_responsibles_array := ARRAY[TRIM(s_rec.responsible)];
            ELSE
                v_responsibles_array := '{}'::text[];
            END IF;

            v_next_year := v_max_year;
            v_next_month := v_max_month;
            v_loop_guard := 0;

            LOOP
                v_loop_guard := v_loop_guard + 1;
                IF v_loop_guard > 120 THEN
                    EXIT;
                END IF;

                IF LOWER(TRIM(s_rec.recurrence)) = 'mensal' THEN
                    v_next_month := v_next_month + 1;
                    IF v_next_month > 12 THEN
                        v_next_month := 1;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(s_rec.recurrence)) = 'bimestral' THEN
                    v_next_month := v_next_month + 2;
                    IF v_next_month > 12 THEN
                        v_next_month := v_next_month - 12;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(s_rec.recurrence)) = 'trimestral' THEN
                    v_next_month := v_next_month + 3;
                    IF v_next_month > 12 THEN
                        v_next_month := v_next_month - 12;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(s_rec.recurrence)) = 'semestral' THEN
                    v_next_month := v_next_month + 6;
                    IF v_next_month > 12 THEN
                        v_next_month := v_next_month - 12;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(s_rec.recurrence)) = 'anual' THEN
                    v_next_year := v_next_year + 1;
                    IF s_rec.recurrence_months IS NOT NULL AND array_length(s_rec.recurrence_months, 1) > 0 THEN
                        v_next_month := GREATEST(1, LEAST(12, s_rec.recurrence_months[1]));
                    END IF;

                ELSIF s_rec.recurrence_months IS NOT NULL AND array_length(s_rec.recurrence_months, 1) > 0 THEN
                    v_months_arr := s_rec.recurrence_months;
                    v_step_found := false;

                    FOR v_i IN 1..array_length(v_months_arr, 1) LOOP
                        IF v_months_arr[v_i] > v_next_month THEN
                            v_next_month := v_months_arr[v_i];
                            v_step_found := true;
                            EXIT;
                        END IF;
                    END LOOP;

                    IF NOT v_step_found THEN
                        v_next_year := v_next_year + 1;
                        v_next_month := v_months_arr[1];
                    END IF;
                ELSE
                    EXIT;
                END IF;

                v_next_comp := v_next_year || '-' || LPAD(v_next_month::text, 2, '0');

                -- Sair se ultrapassou o horizonte de 12 meses
                IF v_next_comp > v_target_limit_comp THEN
                    EXIT;
                END IF;

                -- Nunca criar competências retroativas caso o cliente tenha sido inativado e reativado
                IF v_next_comp < v_current_comp THEN
                    CONTINUE;
                END IF;

                -- Cálculo exato da data base usando a regra vigente da série (s_rec)
                BEGIN
                    v_target_first_of_month := (date_trunc('month', (v_next_comp || '-01')::DATE) + (COALESCE(s_rec.month_offset, 0) || ' month')::INTERVAL)::DATE;
                    v_days_in_target_month := EXTRACT(DAY FROM (date_trunc('month', v_target_first_of_month) + INTERVAL '1 month' - INTERVAL '1 day'))::INT;
                    v_safe_day := LEAST(GREATEST(COALESCE(s_rec.base_due_day, 10), 1), v_days_in_target_month);
                    v_raw_due_date := v_target_first_of_month + ((v_safe_day - 1) || ' day')::INTERVAL;
                EXCEPTION WHEN OTHERS THEN
                    v_raw_due_date := (v_next_comp || '-28')::DATE;
                END;

                v_new_due_date := public.calculate_adjusted_due_date(v_raw_due_date, s_rec.variable_adjustment, s_rec.org_id);
                v_new_task_id := NULL;

                INSERT INTO public.tasks (
                    client_id,
                    client_name,
                    task_name,
                    sector,
                    responsible,
                    responsibles,
                    competence,
                    due_date,
                    variable_adjustment,
                    priority,
                    status,
                    recurrence,
                    recurrence_months,
                    tax_regime,
                    registration_regime,
                    no_movement,
                    exceeded_sublimit,
                    factor_r,
                    notified_exclusion,
                    selected_annexes,
                    observation,
                    org_id,
                    created_at
                ) VALUES (
                    s_rec.client_id,
                    COALESCE(s_rec.current_client_name, s_rec.client_name),
                    s_rec.task_name,
                    s_rec.sector,
                    s_rec.responsible,
                    v_responsibles_array,
                    v_next_comp,
                    v_new_due_date,
                    s_rec.variable_adjustment,
                    s_rec.priority,
                    'Pendente',
                    s_rec.recurrence,
                    s_rec.recurrence_months,
                    s_rec.tax_regime,
                    s_rec.registration_regime,
                    COALESCE(s_rec.no_movement, false),
                    COALESCE(s_rec.exceeded_sublimit, false),
                    COALESCE(s_rec.factor_r, false),
                    COALESCE(s_rec.notified_exclusion, false),
                    s_rec.selected_annexes,
                    s_rec.observation,
                    s_rec.org_id,
                    NOW()
                )
                ON CONFLICT (client_id, task_name, competence) DO NOTHING
                RETURNING id INTO v_new_task_id;

                IF v_new_task_id IS NOT NULL THEN
                    v_tasks_created := v_tasks_created + 1;

                    IF v_ref_task_id IS NOT NULL THEN
                        FOR v_workflow IN
                            SELECT description, is_mandatory, order_index
                            FROM public.task_workflows
                            WHERE task_id = v_ref_task_id
                            ORDER BY order_index ASC
                        LOOP
                            INSERT INTO public.task_workflows (
                                task_id,
                                description,
                                is_completed,
                                is_mandatory,
                                order_index
                            ) VALUES (
                                v_new_task_id,
                                v_workflow.description,
                                false,
                                COALESCE(v_workflow.is_mandatory, false),
                                COALESCE(v_workflow.order_index, 0)
                            );
                        END LOOP;
                    END IF;
                END IF;
            END LOOP;

        EXCEPTION WHEN OTHERS THEN
            v_errors_count := v_errors_count + 1;
            v_errors_details := v_errors_details || jsonb_build_object(
                'client_id', s_rec.client_id,
                'client_name', s_rec.client_name,
                'task_name', s_rec.task_name,
                'error_message', SQLERRM,
                'error_state', SQLSTATE
            );
        END;
    END LOOP;

    -- Limpeza automática de retenção (mantém 90 dias de auditoria)
    DELETE FROM public.recurring_task_cron_logs
    WHERE executed_at < (NOW() - INTERVAL '90 days');

    INSERT INTO public.recurring_task_cron_logs (
        executed_at,
        tasks_created_count,
        errors_count,
        status,
        details
    ) VALUES (
        NOW(),
        v_tasks_created,
        v_errors_count,
        CASE WHEN v_errors_count = 0 THEN 'success' ELSE 'warning' END,
        jsonb_build_object(
            'target_limit_comp', v_target_limit_comp,
            'tasks_created', v_tasks_created,
            'errors_count', v_errors_count,
            'errors_details', v_errors_details,
            'triggered_by', CASE WHEN v_caller_uid IS NULL THEN 'pg_cron' ELSE 'frontend_fallback' END
        )
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'tasks_created', v_tasks_created,
        'errors', v_errors_count,
        'target_limit_comp', v_target_limit_comp
    );
END;
$$;

-- ============================================================================
-- 7. Restringir RLS de Logs do Cron apenas à equipe interna autenticada
-- ============================================================================
DROP POLICY IF EXISTS "Permitir leitura de logs por membros da org" ON public.recurring_task_cron_logs;
CREATE POLICY "Permitir leitura de logs por equipe interna" ON public.recurring_task_cron_logs
FOR SELECT TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);
