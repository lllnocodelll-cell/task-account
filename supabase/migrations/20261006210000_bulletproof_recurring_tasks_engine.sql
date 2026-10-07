-- Migration: Bulletproof Recurring Tasks Engine & Anti-Drift Auto-Healing
-- 1. Cálculo da Páscoa para feriados móveis automáticos
-- 2. is_brazilian_business_day com feriados móveis + tabela public.holidays (com p_org_id)
-- 3. calculate_adjusted_due_date com suporte a p_org_id
-- 4. process_recurring_tasks_cycle:
--    - Preserva array completo de múltiplos responsáveis (t.responsibles)
--    - Elimina o Date Drift ancorando na primeira ocorrência da série (competence ASC)
--    - Suporta dias 29, 30 e 31 sem engessar no dia 28
--    - Considera feriados locais/municipais da organização via p_org_id
--    - Detalhamento de auditoria e captura de SQLERRM/SQLSTATE em recurring_task_cron_logs
-- 5. Atualização da trigger notify_task_assignment para silenciar tarefas com competências distantes (> atual + 1 mês)

-- ============================================================================
-- 1. Função de Cálculo da Páscoa (Meeus/Jones/Butcher) para Feriados Móveis
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_easter(p_year INT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    a INT; b INT; c INT; d INT; e INT;
    f INT; g INT; h INT; i INT; k INT;
    L INT; m INT;
    v_month INT;
    v_day INT;
BEGIN
    IF p_year IS NULL OR p_year < 1900 OR p_year > 2100 THEN
        RETURN NULL;
    END IF;

    a := p_year % 19;
    b := p_year / 100;
    c := p_year % 100;
    d := b / 4;
    e := b % 4;
    f := (b + 8) / 25;
    g := (b - f + 1) / 3;
    h := (19 * a + b - d - g + 15) % 30;
    i := c / 4;
    k := c % 4;
    L := (32 + 2 * e + 2 * i - h - k) % 7;
    m := (a + 11 * h + 22 * L) / 451;
    v_month := (h + L - 7 * m + 114) / 31;
    v_day := ((h + L - 7 * m + 114) % 31) + 1;

    RETURN make_date(p_year, v_month, v_day);
END;
$$;

-- ============================================================================
-- 2. Verificação de Dia Útil com Feriados Móveis e Feriados da Organização
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_brazilian_business_day(p_date DATE, p_org_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_dow INT;
    v_mm_dd TEXT;
    v_year INT;
    v_easter DATE;
    v_carnival_mon DATE;
    v_carnival_tue DATE;
    v_good_friday DATE;
    v_corpus_christi DATE;
BEGIN
    IF p_date IS NULL THEN
        RETURN false;
    END IF;

    -- 1 = Segunda, 6 = Sábado, 7 = Domingo (ISO DOW)
    v_dow := EXTRACT(ISODOW FROM p_date);
    IF v_dow = 6 OR v_dow = 7 THEN
        RETURN false;
    END IF;

    v_mm_dd := to_char(p_date, 'MM-DD');

    -- Feriados Nacionais Fixos (Brasil)
    IF v_mm_dd IN (
        '01-01', -- Confraternização Universal
        '04-21', -- Tiradentes
        '05-01', -- Dia do Trabalho
        '09-07', -- Independência do Brasil
        '10-12', -- Nossa Senhora Aparecida
        '11-02', -- Finados
        '11-15', -- Proclamação da República
        '11-20', -- Consciência Negra (Lei nº 14.759/2023)
        '12-25'  -- Natal
    ) THEN
        RETURN false;
    END IF;

    -- Feriados Nacionais Móveis (Calculados dinamicamente para qualquer ano)
    v_year := EXTRACT(YEAR FROM p_date)::INT;
    v_easter := public.calculate_easter(v_year);
    
    IF v_easter IS NOT NULL THEN
        v_carnival_mon := v_easter - 48;
        v_carnival_tue := v_easter - 47;
        v_good_friday := v_easter - 2;
        v_corpus_christi := v_easter + 60;

        IF p_date IN (v_carnival_mon, v_carnival_tue, v_good_friday, v_corpus_christi) THEN
            RETURN false;
        END IF;
    END IF;

    -- Feriados Municipais / Estaduais / Customizados da Organização
    IF p_org_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.holidays 
            WHERE org_id = p_org_id 
            AND date = to_char(p_date, 'YYYY-MM-DD')
        ) THEN
            RETURN false;
        END IF;
    END IF;

    RETURN true;
END;
$$;

-- Compatibilidade legada com 1 parâmetro
CREATE OR REPLACE FUNCTION public.is_brazilian_business_day(p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT public.is_brazilian_business_day(p_date, NULL::UUID);
$$;

-- ============================================================================
-- 3. Função de Ajuste da Data de Vencimento com Suporte à Organização
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_adjusted_due_date(p_base_date DATE, p_rule TEXT, p_org_id UUID DEFAULT NULL)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_curr_date DATE;
    v_direction INT := 1;
BEGIN
    IF p_base_date IS NULL THEN
        RETURN NULL;
    END IF;

    IF p_rule IS NULL OR LOWER(TRIM(p_rule)) IN ('nao_aplica', 'none', '') THEN
        RETURN p_base_date;
    END IF;

    v_curr_date := p_base_date;

    IF public.is_brazilian_business_day(v_curr_date, p_org_id) THEN
        RETURN v_curr_date;
    END IF;

    IF LOWER(TRIM(p_rule)) = 'antecipar' THEN
        v_direction := -1;
    ELSE
        v_direction := 1; -- postergar, prorrogar, proximo_dia_util
    END IF;

    WHILE NOT public.is_brazilian_business_day(v_curr_date, p_org_id) LOOP
        v_curr_date := (v_curr_date + (v_direction || ' day')::INTERVAL)::DATE;
    END LOOP;

    RETURN v_curr_date;
END;
$$;

-- Compatibilidade legada com 2 parâmetros
CREATE OR REPLACE FUNCTION public.calculate_adjusted_due_date(p_base_date DATE, p_rule TEXT)
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
    SELECT public.calculate_adjusted_due_date(p_base_date, p_rule, NULL::UUID);
$$;

-- ============================================================================
-- 4. Função Universal para Recomposição do Ciclo de Tarefas Recorrentes (Blindada)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_recurring_tasks_cycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now_local TIMESTAMP;
    v_current_year INT;
    v_current_month INT;
    v_target_limit_date DATE;
    v_target_limit_comp TEXT;
    
    t_rec RECORD;
    v_max_comp TEXT;
    v_max_year INT;
    v_max_month INT;
    v_next_year INT;
    v_next_month INT;
    v_next_comp TEXT;
    
    v_tasks_created INT := 0;
    v_errors_count INT := 0;
    v_errors_details JSONB := '[]'::jsonb;
    
    -- Âncora da primeira ocorrência para cálculo livre de Date Drift
    v_first_task RECORD;
    v_first_comp_year INT;
    v_first_comp_month INT;
    v_first_due_year INT;
    v_first_due_month INT;
    v_first_due_day INT;
    v_month_offset INT := 0;
    v_base_day_of_month INT := 10;

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
    v_now_local := timezone('America/Sao_Paulo', now());
    v_current_year := EXTRACT(YEAR FROM v_now_local)::INT;
    v_current_month := EXTRACT(MONTH FROM v_now_local)::INT;
    
    -- Limite do horizonte: 12 meses à frente a partir do mês atual
    v_target_limit_date := (date_trunc('month', v_now_local) + INTERVAL '12 months')::date;
    v_target_limit_comp := to_char(v_target_limit_date, 'YYYY-MM');

    -- Agrupar tarefas recorrentes por cliente e nome da tarefa
    -- WHITELIST ESTRITA: Apenas tipos de repetição contínua são expandidos pelo motor.
    FOR t_rec IN 
        SELECT DISTINCT ON (client_id, task_name)
            t.client_id,
            t.client_name,
            t.task_name,
            t.sector,
            t.responsible,
            t.responsibles,
            t.priority,
            t.recurrence,
            t.recurrence_months,
            t.tax_regime,
            t.registration_regime,
            t.no_movement,
            t.exceeded_sublimit,
            t.factor_r,
            t.notified_exclusion,
            t.selected_annexes,
            t.observation,
            t.org_id,
            t.variable_adjustment,
            t.id AS ref_id
        FROM public.tasks t
        JOIN public.clients c ON c.id = t.client_id
        WHERE c.status = 'Ativo'
        AND t.recurrence IS NOT NULL 
        AND (
            LOWER(TRIM(t.recurrence)) IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')
            OR (t.recurrence_months IS NOT NULL AND array_length(t.recurrence_months, 1) > 0)
        )
        AND LOWER(TRIM(t.recurrence)) NOT IN ('', 'unico', 'unica', 'única', 'nao_recorre', 'none', 'personalizado', 'personalizada', 'personalizados', 'personalizadas', 'custom', 'avulso', 'avulsa')
        ORDER BY client_id, task_name, competence DESC
    LOOP
        BEGIN
            -- 1. Descobrir a maior competência cadastrada para este cliente e tarefa
            SELECT MAX(competence) INTO v_max_comp 
            FROM public.tasks 
            WHERE client_id = t_rec.client_id 
            AND task_name = t_rec.task_name;

            IF v_max_comp IS NULL OR v_max_comp = '' OR v_max_comp !~ '^[0-9]{4}-[0-9]{2}$' THEN
                v_max_year := v_current_year;
                v_max_month := v_current_month;
            ELSE
                v_max_year := SPLIT_PART(v_max_comp, '-', 1)::INT;
                v_max_month := SPLIT_PART(v_max_comp, '-', 2)::INT;
            END IF;

            -- 2. ÂNCORA ANTI-DRIFT: Buscar a PRIMEIRA tarefa da série (competence ASC) para extrair o dia base original
            SELECT competence, due_date INTO v_first_task 
            FROM public.tasks 
            WHERE client_id = t_rec.client_id 
              AND task_name = t_rec.task_name
              AND competence IS NOT NULL 
              AND competence ~ '^[0-9]{4}-[0-9]{2}$'
              AND due_date IS NOT NULL
            ORDER BY competence ASC
            LIMIT 1;

            IF v_first_task.competence IS NOT NULL AND v_first_task.due_date IS NOT NULL THEN
                v_first_comp_year := SPLIT_PART(v_first_task.competence, '-', 1)::INT;
                v_first_comp_month := SPLIT_PART(v_first_task.competence, '-', 2)::INT;
                v_first_due_year := EXTRACT(YEAR FROM v_first_task.due_date)::INT;
                v_first_due_month := EXTRACT(MONTH FROM v_first_task.due_date)::INT;
                v_first_due_day := EXTRACT(DAY FROM v_first_task.due_date)::INT;

                v_month_offset := (v_first_due_year - v_first_comp_year) * 12 + (v_first_due_month - v_first_comp_month);
                v_base_day_of_month := v_first_due_day;
            ELSE
                v_month_offset := 0;
                v_base_day_of_month := 10;
            END IF;

            -- 3. Preparar array de múltiplos responsáveis (garante que nunca seja nulo ou vazio)
            IF t_rec.responsibles IS NOT NULL AND array_length(t_rec.responsibles, 1) > 0 THEN
                v_responsibles_array := t_rec.responsibles;
            ELSIF t_rec.responsible IS NOT NULL AND TRIM(t_rec.responsible) != '' THEN
                v_responsibles_array := ARRAY[TRIM(t_rec.responsible)];
            ELSE
                v_responsibles_array := '{}';
            END IF;

            v_next_year := v_max_year;
            v_next_month := v_max_month;

            -- 4. Loop de expansão até atingir a data limite do horizonte (12 meses à frente)
            LOOP
                -- Calcular o próximo mês/ano com base no tipo de recorrência
                IF LOWER(TRIM(t_rec.recurrence)) = 'mensal' THEN
                    v_next_month := v_next_month + 1;
                    IF v_next_month > 12 THEN
                        v_next_month := 1;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(t_rec.recurrence)) = 'bimestral' THEN
                    v_next_month := v_next_month + 2;
                    IF v_next_month > 12 THEN
                        v_next_month := v_next_month - 12;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(t_rec.recurrence)) = 'trimestral' THEN
                    v_next_month := v_next_month + 3;
                    IF v_next_month > 12 THEN
                        v_next_month := v_next_month - 12;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(t_rec.recurrence)) = 'semestral' THEN
                    v_next_month := v_next_month + 6;
                    IF v_next_month > 12 THEN
                        v_next_month := v_next_month - 12;
                        v_next_year := v_next_year + 1;
                    END IF;

                ELSIF LOWER(TRIM(t_rec.recurrence)) = 'anual' THEN
                    v_next_year := v_next_year + 1;

                ELSIF t_rec.recurrence_months IS NOT NULL AND array_length(t_rec.recurrence_months, 1) > 0 THEN
                    v_months_arr := t_rec.recurrence_months;
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

                -- Formatar a nova competência (YYYY-MM)
                v_next_comp := v_next_year || '-' || LPAD(v_next_month::text, 2, '0');

                -- Condição de saída: ultrapassou a data limite do horizonte de 12 meses
                IF v_next_comp > v_target_limit_comp THEN
                    EXIT;
                END IF;

                -- 5. Cálculo preciso da data de vencimento base (suporta dias 29, 30 e 31 sem truncamento estático no 28)
                BEGIN
                    v_target_first_of_month := (date_trunc('month', (v_next_comp || '-01')::DATE) + (v_month_offset || ' month')::INTERVAL)::DATE;
                    v_days_in_target_month := EXTRACT(DAY FROM (date_trunc('month', v_target_first_of_month) + INTERVAL '1 month' - INTERVAL '1 day'))::INT;
                    v_safe_day := LEAST(v_base_day_of_month, v_days_in_target_month);
                    v_raw_due_date := v_target_first_of_month + ((v_safe_day - 1) || ' day')::INTERVAL;
                EXCEPTION WHEN OTHERS THEN
                    v_raw_due_date := (v_next_comp || '-28')::DATE;
                END;

                -- 6. Aplicar ajuste de dia útil considerando os feriados municipais/estaduais da organização
                v_new_due_date := public.calculate_adjusted_due_date(v_raw_due_date, t_rec.variable_adjustment, t_rec.org_id);

                -- 7. Inserir a nova tarefa preservando múltiplos responsáveis e idempotência
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
                    t_rec.client_id,
                    t_rec.client_name,
                    t_rec.task_name,
                    t_rec.sector,
                    t_rec.responsible,
                    v_responsibles_array,
                    v_next_comp,
                    v_new_due_date,
                    t_rec.variable_adjustment,
                    t_rec.priority,
                    'Pendente',
                    t_rec.recurrence,
                    t_rec.recurrence_months,
                    t_rec.tax_regime,
                    t_rec.registration_regime,
                    t_rec.no_movement,
                    t_rec.exceeded_sublimit,
                    t_rec.factor_r,
                    t_rec.notified_exclusion,
                    t_rec.selected_annexes,
                    t_rec.observation,
                    t_rec.org_id,
                    NOW()
                )
                ON CONFLICT (client_id, task_name, competence) DO NOTHING
                RETURNING id INTO v_new_task_id;

                IF v_new_task_id IS NOT NULL THEN
                    v_tasks_created := v_tasks_created + 1;

                    -- Copiar os workflows (checklist) da tarefa de referência em ordem
                    FOR v_workflow IN 
                        SELECT description, is_mandatory, order_index 
                        FROM public.task_workflows 
                        WHERE task_id = t_rec.ref_id
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

            END LOOP; -- Fim do loop de expansão por tarefa

        EXCEPTION WHEN OTHERS THEN
            v_errors_count := v_errors_count + 1;
            v_errors_details := v_errors_details || jsonb_build_object(
                'client_id', t_rec.client_id,
                'client_name', t_rec.client_name,
                'task_name', t_rec.task_name,
                'error_message', SQLERRM,
                'error_state', SQLSTATE
            );
        END;
    END LOOP; -- Fim do loop por clientes

    -- Gravar log com detalhes de diagnóstico
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
            'errors_details', v_errors_details
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
-- 5. Atualização da Trigger notify_task_assignment (Silenciar Spam Futuro)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_resp_names TEXT[] := '{}';
    v_r_name TEXT;
    v_user_id UUID;
    v_message TEXT;
    v_title TEXT := 'Nova Tarefa';
    v_is_new BOOLEAN;
    v_is_recurring BOOLEAN := false;
    v_comp_line TEXT := '';
    v_max_notify_comp TEXT;
BEGIN
    -- Se a tarefa possuir competência e for além do próximo mês imediato (mais de 1 mês à frente),
    -- silenciar notificação imediata para evitar spam de tarefas criadas em batch pelo cron
    IF NEW.competence IS NOT NULL AND TRIM(NEW.competence) ~ '^[0-9]{4}-[0-9]{2}$' THEN
        v_max_notify_comp := to_char((timezone('America/Sao_Paulo', now()) + INTERVAL '1 month'), 'YYYY-MM');
        IF NEW.competence > v_max_notify_comp THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Obter linha de competência formatada
    IF NEW.competence IS NOT NULL AND trim(NEW.competence) != '' THEN
        v_comp_line := chr(10) || '📅 Competência: ' || trim(NEW.competence);
    END IF;

    -- Verificar se a tarefa possui recorrência periódica
    IF NEW.recurrence IS NOT NULL 
       AND trim(lower(NEW.recurrence)) NOT IN ('', 'none', 'nao_aplica', 'nao_se_aplica', 'unica', 'única') THEN
        v_is_recurring := true;
        v_title := 'Nova Tarefa Recorrente';
    END IF;

    -- Se for INSERT, todos os responsáveis definidos são novos
    IF TG_OP = 'INSERT' THEN
        IF NEW.responsibles IS NOT NULL AND array_length(NEW.responsibles, 1) > 0 THEN
            v_resp_names := NEW.responsibles;
        ELSIF NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN
            v_resp_names := ARRAY[NEW.responsible];
        END IF;
    -- Se for UPDATE:
    ELSIF TG_OP = 'UPDATE' THEN
        -- Se for reatribuição do responsável primário, notify_task_reassignment assume
        IF OLD.responsible IS NOT NULL AND trim(OLD.responsible) != ''
           AND NEW.responsible IS NOT NULL AND trim(NEW.responsible) != ''
           AND OLD.responsible IS DISTINCT FROM NEW.responsible THEN
            RETURN NEW;
        END IF;

        IF NEW.responsibles IS NOT NULL AND array_length(NEW.responsibles, 1) > 0 THEN
            FOREACH v_r_name IN ARRAY NEW.responsibles LOOP
                v_is_new := true;
                IF OLD.responsibles IS NOT NULL AND array_length(OLD.responsibles, 1) > 0 THEN
                    IF v_r_name = ANY(OLD.responsibles) THEN
                        v_is_new := false;
                    END IF;
                ELSIF OLD.responsible IS NOT NULL AND trim(OLD.responsible) = trim(v_r_name) THEN
                    v_is_new := false;
                END IF;

                IF v_is_new THEN
                    v_resp_names := array_append(v_resp_names, v_r_name);
                END IF;
            END LOOP;
        ELSIF NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN
            IF OLD.responsible IS NULL OR trim(OLD.responsible) = '' THEN
                v_resp_names := ARRAY[NEW.responsible];
            END IF;
        END IF;
    END IF;

    IF array_length(v_resp_names, 1) IS NULL OR array_length(v_resp_names, 1) = 0 THEN
        RETURN NEW;
    END IF;

    IF v_is_recurring THEN
        v_message := 'Você foi atribuído à tarefa recorrente.' || chr(10) || 
                     '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                     '📝 ' || NEW.task_name ||
                     v_comp_line || chr(10) ||
                     '🔁 Recorrência: ' || initcap(NEW.recurrence);
    ELSE
        v_message := 'Você foi atribuído à tarefa.' || chr(10) || 
                     '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                     '📝 ' || NEW.task_name ||
                     v_comp_line;
    END IF;

    FOREACH v_r_name IN ARRAY v_resp_names LOOP
        IF v_r_name IS NOT NULL AND trim(v_r_name) != '' THEN
            v_user_id := NULL;

            SELECT id INTO v_user_id 
            FROM public.profiles 
            WHERE org_id = NEW.org_id 
              AND lower(trim(full_name)) = lower(trim(v_r_name))
            LIMIT 1;

            IF v_user_id IS NULL THEN
                SELECT p.id INTO v_user_id 
                FROM public.members m
                JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
                                       AND p.org_id = m.org_id
                WHERE m.org_id = NEW.org_id
                  AND (
                    lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(trim(v_r_name))
                    OR lower(trim(m.first_name)) = lower(trim(v_r_name))
                  )
                LIMIT 1;
            END IF;

            IF v_user_id IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.notifications 
                    WHERE user_id = v_user_id 
                      AND type = 'task_assigned'
                      AND message = v_message
                      AND created_at > (now() - interval '10 minutes')
                ) THEN
                    INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at, org_id)
                    VALUES (
                        v_user_id, 
                        v_title, 
                        v_message, 
                        'task_assigned', 
                        '/tasks?id=' || NEW.id,
                        NEW.id,
                        false,
                        now(),
                        NEW.org_id
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$function$;
