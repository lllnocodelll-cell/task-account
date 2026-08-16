-- Migração para corrigir o motor de tarefas recorrentes:
-- Exclui o tipo 'personalizado' da expansão contínua do ciclo de auto-cura/cron,
-- garantindo que a quantidade de repetições configurada na criação seja rigorosamente respeitada.

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
    
    v_ref_task RECORD;
    v_ref_comp_year INT;
    v_ref_comp_month INT;
    v_ref_due_year INT;
    v_ref_due_month INT;
    v_ref_due_day INT;
    v_month_offset INT := 0;
    v_day_of_month INT := 10;

    v_raw_due_date DATE;
    v_new_due_date DATE;
    
    v_workflow RECORD;
    v_new_task_id UUID;
    v_months_arr INT[];
    v_i INT;
    v_step_found BOOLEAN;
BEGIN
    v_now_local := timezone('America/Sao_Paulo', now());
    v_current_year := EXTRACT(YEAR FROM v_now_local);
    v_current_month := EXTRACT(MONTH FROM v_now_local);
    
    -- Limite do horizonte: 12 meses à frente a partir do mês atual
    v_target_limit_date := (date_trunc('month', v_now_local) + INTERVAL '12 months')::date;
    v_target_limit_comp := to_char(v_target_limit_date, 'YYYY-MM');

    -- Agrupar tarefas recorrentes por cliente e nome da tarefa
    -- WHITELIST ESTRITA: Apenas tipos de repetição contínua e infinita são expandidos pelo motor.
    -- Tipos 'personalizado', 'personalizada', 'unico', 'avulso' NUNCA são expandidos pelo cron/RPC.
    FOR t_rec IN 
        SELECT DISTINCT ON (client_id, task_name)
            t.client_id,
            t.client_name,
            t.task_name,
            t.sector,
            t.responsible,
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
            -- Descobrir a maior competência atual cadastrada para este cliente e tarefa
            SELECT MAX(competence) INTO v_max_comp 
            FROM public.tasks 
            WHERE client_id = t_rec.client_id 
            AND task_name = t_rec.task_name;

            IF v_max_comp IS NULL OR v_max_comp = '' THEN
                v_max_year := v_current_year;
                v_max_month := v_current_month;
            ELSE
                v_max_year := SPLIT_PART(v_max_comp, '-', 1)::INT;
                v_max_month := SPLIT_PART(v_max_comp, '-', 2)::INT;
            END IF;

            -- Buscar a tarefa de referência e calcular o month_offset e o dia base de vencimento
            SELECT competence, due_date INTO v_ref_task 
            FROM public.tasks 
            WHERE id = t_rec.ref_id;

            IF v_ref_task.competence IS NOT NULL AND v_ref_task.competence != '' AND v_ref_task.due_date IS NOT NULL THEN
                v_ref_comp_year := SPLIT_PART(v_ref_task.competence, '-', 1)::INT;
                v_ref_comp_month := SPLIT_PART(v_ref_task.competence, '-', 2)::INT;
                v_ref_due_year := EXTRACT(YEAR FROM v_ref_task.due_date);
                v_ref_due_month := EXTRACT(MONTH FROM v_ref_task.due_date);
                v_ref_due_day := EXTRACT(DAY FROM v_ref_task.due_date);

                v_month_offset := (v_ref_due_year - v_ref_comp_year) * 12 + (v_ref_due_month - v_ref_comp_month);
                v_day_of_month := v_ref_due_day;
            ELSE
                v_month_offset := 0;
                v_day_of_month := 10;
            END IF;

            v_next_year := v_max_year;
            v_next_month := v_max_month;

            -- Loop de geração até atingir a data limite do horizonte (12 meses à frente)
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
                    -- Se a recorrência não corresponder a um tipo suportado para expansão contínua, encerra o loop
                    EXIT;
                END IF;

                -- Formatar a nova competência (YYYY-MM)
                v_next_comp := v_next_year || '-' || LPAD(v_next_month::text, 2, '0');

                -- Condição de saída: ultrapassou a data limite do horizonte de 12 meses
                IF v_next_comp > v_target_limit_comp THEN
                    EXIT;
                END IF;

                -- Calcular a data de vencimento base adicionando o month_offset
                BEGIN
                    v_raw_due_date := (date_trunc('month', (v_next_comp || '-01')::DATE) 
                                       + (v_month_offset || ' month')::INTERVAL 
                                       + ((LEAST(v_day_of_month, 28) - 1) || ' day')::INTERVAL)::DATE;
                EXCEPTION WHEN OTHERS THEN
                    v_raw_due_date := (v_next_comp || '-28')::DATE;
                END;

                -- Aplicar o ajuste de finais de semana e feriados
                v_new_due_date := public.calculate_adjusted_due_date(v_raw_due_date, t_rec.variable_adjustment);

                -- Inserir a nova tarefa respeitando a restrição única de idempotência
                INSERT INTO public.tasks (
                    client_id,
                    client_name,
                    task_name,
                    sector,
                    responsible,
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

                    -- Copiar os workflows da tarefa de referência
                    FOR v_workflow IN 
                        SELECT description, is_mandatory, order_index 
                        FROM public.task_workflows 
                        WHERE task_id = t_rec.ref_id
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
        END;
    END LOOP; -- Fim do loop por clientes

    -- Gravar log da execução
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
            'errors', v_errors_count
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

