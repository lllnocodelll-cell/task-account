-- Migration: Otimização de Escala para Alto Volume Multi-Tenant (Motor de Recorrência)
-- Objetivos:
-- 1. Índice composto em public.holidays (org_id, date) para lookup O(1) de feriados municipais/estaduais.
-- 2. Cursor inteligente `next_run_competence` + índice parcial em public.recurring_task_series:
--    - O cron só lê séries cuja próxima competência realmente entrou no horizonte de +12 meses.
--    - Em dias normais ou séries anuais/semestrais fora do mês de geração, o índice ignora 100% delas.
-- 3. Substituição do sub-loop de `task_workflows` por um único `INSERT INTO ... SELECT`.
-- 4. Isolamento e orçamento de tempo para fallback no navegador (`authenticated`, statement_timeout 8s):
--    - Quando acionado via navegador (`auth.uid() IS NOT NULL`), processa apenas a organização do usuário
--      com lock próprio da org e teto seguro de 5 segundos.
--    - Quando acionado via `pg_cron` (`auth.uid() IS NULL`), usa `statement_timeout = 5min` por lote seguro.

-- ============================================================================
-- 1. Índice Composto em Feriados da Organização
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_holidays_org_date
    ON public.holidays (org_id, date);

-- ============================================================================
-- 2. Cursor Inteligente de Próxima Execução em recurring_task_series
-- ============================================================================
ALTER TABLE public.recurring_task_series
    ADD COLUMN IF NOT EXISTS next_run_competence TEXT;

CREATE INDEX IF NOT EXISTS idx_recurring_series_active_next_run
    ON public.recurring_task_series (next_run_competence NULLS FIRST, org_id, client_id)
    WHERE is_active = true;

-- Backfill inicial seguro (força 1ª avaliação calculando o próximo mês real na próxima rodada)
UPDATE public.recurring_task_series
SET next_run_competence = NULL
WHERE next_run_competence IS NOT NULL;

-- ============================================================================
-- 3. Manter Cursor Sincronizado ao Inativar Cliente, Criar ou Editar Séries
-- ============================================================================
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

    -- Recalcula o cursor na próxima execução caso o cliente seja reativado no futuro
    UPDATE public.recurring_task_series
    SET next_run_competence = NULL,
        updated_at = now()
    WHERE client_id = p_client_id
      AND is_active = true;

    RETURN v_deleted_count;
END;
$$;

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
        next_run_competence,
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
        next_run_competence = NULL,
        ended_at = NULL,
        updated_at = now();
END;
$$;

-- ============================================================================
-- 4. Motor Otimizado para Alto Volume (O(pendências), Batch INSERT workflows, Budget Seguro)
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
    v_caller_org_id UUID;
    v_lock_key INT;
    v_lock_acquired BOOLEAN;
    v_started_at TIMESTAMPTZ := clock_timestamp();
    v_budget_exceeded BOOLEAN := false;

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
    v_series_failed BOOLEAN;

    v_series_processed INT := 0;
    v_tasks_created INT := 0;
    v_errors_count INT := 0;
    v_errors_details JSONB := '[]'::jsonb;

    v_target_first_of_month DATE;
    v_days_in_target_month INT;
    v_safe_day INT;
    v_raw_due_date DATE;
    v_new_due_date DATE;

    v_new_task_id UUID;
    v_months_arr INT[];
    v_i INT;
    v_step_found BOOLEAN;
    v_responsibles_array TEXT[];
BEGIN
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NOT NULL THEN
        SELECT role, org_id INTO v_caller_role, v_caller_org_id
        FROM public.profiles
        WHERE id = v_caller_uid;

        IF v_caller_role IS NULL OR v_caller_role NOT IN ('gestor', 'operacional') OR v_caller_org_id IS NULL THEN
            RETURN jsonb_build_object('status', 'forbidden');
        END IF;

        -- Lock isolado por organização quando acionado pelo fallback de navegador
        v_lock_key := hashtext('process_recurring_tasks_cycle:' || v_caller_org_id::text);
    ELSE
        -- Execução noturna global pelo pg_cron (postgres): estende statement_timeout local para 5min
        PERFORM set_config('statement_timeout', '300000', true);
        v_lock_key := hashtext('process_recurring_tasks_cycle:global');
    END IF;

    SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
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

    v_target_limit_date := (date_trunc('month', v_now_local) + INTERVAL '12 months')::date;
    v_target_limit_comp := to_char(v_target_limit_date, 'YYYY-MM');

    -- O cursor usa o índice parcial `idx_recurring_series_active_next_run`
    -- lendo APENAS séries cuja próxima ocorrência já entrou no horizonte de 12 meses.
    FOR s_rec IN
        SELECT
            s.*,
            c.company_name AS current_client_name
        FROM public.recurring_task_series s
        JOIN public.clients c ON c.id = s.client_id
        WHERE s.is_active = true
          AND c.status = 'Ativo'
          AND (v_caller_org_id IS NULL OR s.org_id = v_caller_org_id)
          AND (s.next_run_competence IS NULL OR s.next_run_competence <= v_target_limit_comp)
          AND LOWER(TRIM(s.recurrence)) IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')
        ORDER BY s.next_run_competence ASC NULLS FIRST, s.org_id, s.client_id
    LOOP
        -- No fallback do navegador (statement_timeout=8s), interrompe de forma limpa antes de 5s
        -- deixando as séries restantes com `next_run_competence` intacto para a próxima chamada/cron.
        IF v_caller_uid IS NOT NULL AND (clock_timestamp() - v_started_at) > INTERVAL '5 seconds' THEN
            v_budget_exceeded := true;
            EXIT;
        END IF;

        v_series_processed := v_series_processed + 1;
        v_series_failed := false;

        BEGIN
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

            IF s_rec.responsibles IS NOT NULL AND array_length(s_rec.responsibles, 1) > 0 THEN
                v_responsibles_array := s_rec.responsibles;
            ELSIF s_rec.responsible IS NOT NULL AND TRIM(s_rec.responsible) != '' THEN
                v_responsibles_array := ARRAY[TRIM(s_rec.responsible)];
            ELSE
                v_responsibles_array := '{}'::text[];
            END IF;

            v_next_year := v_max_year;
            v_next_month := v_max_month;
            v_next_comp := NULL;
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

                -- Ao ultrapassar o horizonte atual, v_next_comp guarda exatamente o próximo mês futuro pendente
                IF v_next_comp > v_target_limit_comp THEN
                    EXIT;
                END IF;

                -- Nunca criar competências retroativas após reativação de cliente
                IF v_next_comp < v_current_comp THEN
                    CONTINUE;
                END IF;

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

                    -- Cópia em lote (único INSERT...SELECT) dos workflows da referência
                    IF v_ref_task_id IS NOT NULL THEN
                        INSERT INTO public.task_workflows (
                            task_id,
                            description,
                            is_completed,
                            is_mandatory,
                            order_index
                        )
                        SELECT
                            v_new_task_id,
                            w.description,
                            false,
                            COALESCE(w.is_mandatory, false),
                            COALESCE(w.order_index, 0)
                        FROM public.task_workflows w
                        WHERE w.task_id = v_ref_task_id
                        ORDER BY w.order_index ASC;
                    END IF;
                END IF;
            END LOOP;

        EXCEPTION WHEN OTHERS THEN
            v_series_failed := true;
            v_errors_count := v_errors_count + 1;
            v_errors_details := v_errors_details || jsonb_build_object(
                'client_id', s_rec.client_id,
                'client_name', s_rec.client_name,
                'task_name', s_rec.task_name,
                'error_message', SQLERRM,
                'error_state', SQLSTATE
            );
        END;

        -- Atualiza cursor da série para que não seja relida até a próxima competência pendente entrar no horizonte
        IF NOT v_series_failed AND v_next_comp IS NOT NULL AND v_next_comp > v_target_limit_comp THEN
            UPDATE public.recurring_task_series
            SET next_run_competence = v_next_comp,
                updated_at = now()
            WHERE id = s_rec.id;
        END IF;
    END LOOP;

    -- Retenção de 90 dias apenas durante a execução global noturna
    IF v_caller_uid IS NULL THEN
        DELETE FROM public.recurring_task_cron_logs
        WHERE executed_at < (NOW() - INTERVAL '90 days');
    END IF;

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
            'series_processed', v_series_processed,
            'tasks_created', v_tasks_created,
            'errors_count', v_errors_count,
            'errors_details', v_errors_details,
            'budget_exceeded', v_budget_exceeded,
            'org_id', v_caller_org_id,
            'triggered_by', CASE WHEN v_caller_uid IS NULL THEN 'pg_cron' ELSE 'frontend_fallback' END
        )
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'series_processed', v_series_processed,
        'tasks_created', v_tasks_created,
        'errors', v_errors_count,
        'budget_exceeded', v_budget_exceeded,
        'target_limit_comp', v_target_limit_comp
    );
END;
$$;
