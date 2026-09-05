-- Migration: Inclusão da Competência/Período em Todas as Notificações de Tarefas
-- Atualiza notify_task_assignment, notify_task_reassignment, check_daily_expirations, notify_task_concluded e notify_task_alerts

-- ============================================================================
-- 1. ATRIBUIÇÃO DE TAREFA (notify_task_assignment)
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
BEGIN
    -- Obter linha de competência formatada
    IF NEW.competence IS NOT NULL AND trim(NEW.competence) != '' THEN
        v_comp_line := chr(10) || '📅 Competência: ' || trim(NEW.competence);
    END IF;

    -- Verificar se a tarefa possui recorrência periódica (mensal, bimestral, trimestral, semestral, anual, etc.)
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
                    INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                    VALUES (
                        v_user_id, 
                        v_title, 
                        v_message, 
                        'task_assigned', 
                        '/tasks?id=' || NEW.id,
                        NEW.id,
                        false,
                        now()
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$function$;


-- ============================================================================
-- 2. REATRIBUIÇÃO DE TAREFA COM DE -> PARA (notify_task_reassignment)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_task_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_old_resp TEXT;
    v_new_resp TEXT;
    v_old_user_id UUID;
    v_new_user_id UUID;
    gestor RECORD;
    v_msg_new TEXT;
    v_msg_old TEXT;
    v_msg_gestor TEXT;
    v_is_recurring BOOLEAN := false;
    v_comp_line TEXT := '';
BEGIN
    IF OLD.responsible IS DISTINCT FROM NEW.responsible 
       AND OLD.responsible IS NOT NULL AND trim(OLD.responsible) != ''
       AND NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN

        v_old_resp := trim(OLD.responsible);
        v_new_resp := trim(NEW.responsible);

        IF NEW.competence IS NOT NULL AND trim(NEW.competence) != '' THEN
            v_comp_line := chr(10) || '📅 Competência: ' || trim(NEW.competence);
        END IF;

        IF NEW.recurrence IS NOT NULL 
           AND trim(lower(NEW.recurrence)) NOT IN ('', 'none', 'nao_aplica', 'nao_se_aplica', 'unica', 'única') THEN
            v_is_recurring := true;
        END IF;

        SELECT id INTO v_new_user_id FROM public.profiles 
        WHERE (org_id = NEW.org_id OR NEW.org_id IS NULL) AND lower(trim(full_name)) = lower(v_new_resp) LIMIT 1;
        IF v_new_user_id IS NULL THEN
            SELECT p.id INTO v_new_user_id FROM public.members m 
            JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
            WHERE (m.org_id = NEW.org_id OR NEW.org_id IS NULL) AND (lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(v_new_resp) OR lower(trim(m.first_name)) = lower(v_new_resp)) LIMIT 1;
        END IF;

        SELECT id INTO v_old_user_id FROM public.profiles 
        WHERE (org_id = NEW.org_id OR NEW.org_id IS NULL) AND lower(trim(full_name)) = lower(v_old_resp) LIMIT 1;
        IF v_old_user_id IS NULL THEN
            SELECT p.id INTO v_old_user_id FROM public.members m 
            JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
            WHERE (m.org_id = NEW.org_id OR NEW.org_id IS NULL) AND (lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(v_old_resp) OR lower(trim(m.first_name)) = lower(v_old_resp)) LIMIT 1;
        END IF;

        IF v_is_recurring THEN
            v_msg_new := 'Você recebeu uma tarefa recorrente transferida.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name ||
                         v_comp_line || chr(10) || 
                         '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp || chr(10) ||
                         '🔁 Recorrência: ' || initcap(NEW.recurrence);

            v_msg_old := 'A tarefa recorrente foi transferida para outro responsável.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name ||
                         v_comp_line || chr(10) || 
                         '🔄 Transferida para: ' || v_new_resp || chr(10) ||
                         '🔁 Recorrência: ' || initcap(NEW.recurrence);

            v_msg_gestor := 'Reatribuição de tarefa recorrente realizada.' || chr(10) || 
                            '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                            '📝 ' || NEW.task_name ||
                            v_comp_line || chr(10) || 
                            '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp || chr(10) ||
                            '🔁 Recorrência: ' || initcap(NEW.recurrence);
        ELSE
            v_msg_new := 'Você recebeu uma tarefa transferida.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name ||
                         v_comp_line || chr(10) || 
                         '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp;

            v_msg_old := 'A tarefa foi transferida para outro responsável.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name ||
                         v_comp_line || chr(10) || 
                         '🔄 Transferida para: ' || v_new_resp;

            v_msg_gestor := 'Reatribuição de tarefa realizada.' || chr(10) || 
                            '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                            '📝 ' || NEW.task_name ||
                            v_comp_line || chr(10) || 
                            '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp;
        END IF;

        IF v_new_user_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = v_new_user_id 
                  AND type = 'task_reassigned'
                  AND message = v_msg_new
                  AND created_at > (now() - interval '10 minutes')
            ) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (v_new_user_id, 'Tarefa Transferida', v_msg_new, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
            END IF;
        END IF;

        IF v_old_user_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = v_old_user_id 
                  AND type = 'task_reassigned'
                  AND message = v_msg_old
                  AND created_at > (now() - interval '10 minutes')
            ) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (v_old_user_id, 'Tarefa Reatribuída', v_msg_old, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
            END IF;
        END IF;

        FOR gestor IN 
            SELECT id FROM public.profiles 
            WHERE org_id = NEW.org_id 
              AND role = 'gestor'
              AND id NOT IN (coalesce(v_new_user_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(v_old_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = gestor.id 
                  AND type = 'task_reassigned'
                  AND message = v_msg_gestor
                  AND created_at > (now() - interval '10 minutes')
            ) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (gestor.id, 'Reatribuição de Tarefa', v_msg_gestor, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;


-- ============================================================================
-- 3. EXPIRAÇÃO DIÁRIA: TAREFAS A VENCER E ATRASADAS (check_daily_expirations)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_daily_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    t RECORD;
    cert RECORD;
    v_user_id UUID;
    gestor RECORD;
    v_resp_names TEXT[];
    v_r_name TEXT;
    v_comp_text TEXT;
BEGIN
    -- ------------------------------------------------------------------------
    -- A. TAREFAS PRÓXIMAS DO VENCIMENTO (Vencem Hoje ou D+1)
    -- ------------------------------------------------------------------------
    FOR t IN 
        SELECT id, task_name, client_name, competence, org_id, responsible, responsibles, due_date 
        FROM public.tasks 
        WHERE status NOT IN ('Concluída', 'Cancelada') 
          AND due_date IS NOT NULL 
          AND due_date <= CURRENT_DATE + INTERVAL '1 day'
          AND due_date >= CURRENT_DATE
    LOOP
        v_resp_names := '{}';
        IF t.responsibles IS NOT NULL AND array_length(t.responsibles, 1) > 0 THEN
            v_resp_names := t.responsibles;
        ELSIF t.responsible IS NOT NULL AND trim(t.responsible) != '' THEN
            v_resp_names := ARRAY[t.responsible];
        END IF;

        v_comp_text := case when (t.competence is not null and t.competence != '') then ' | Competência: ' || t.competence else '' end;

        FOREACH v_r_name IN ARRAY v_resp_names LOOP
            IF v_r_name IS NOT NULL AND trim(v_r_name) != '' THEN
                v_user_id := NULL;
                SELECT id INTO v_user_id FROM public.profiles 
                WHERE org_id = t.org_id AND lower(trim(full_name)) = lower(trim(v_r_name)) LIMIT 1;

                IF v_user_id IS NULL THEN
                    SELECT p.id INTO v_user_id 
                    FROM public.members m
                    JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
                                           AND p.org_id = m.org_id
                    WHERE m.org_id = t.org_id
                      AND (lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(trim(v_r_name))
                           OR lower(trim(m.first_name)) = lower(trim(v_r_name)))
                    LIMIT 1;
                END IF;

                IF v_user_id IS NOT NULL THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM public.notifications 
                        WHERE related_entity_id = t.id 
                          AND user_id = v_user_id 
                          AND type = 'task_due_soon' 
                          AND created_at >= CURRENT_DATE
                    ) THEN
                        INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                        VALUES (
                            v_user_id, 
                            'Tarefa Próxima do Vencimento', 
                            'A tarefa "' || t.task_name || '" (Cliente: ' || coalesce(t.client_name, 'N/A') || v_comp_text || ') vence em ' || to_char(t.due_date, 'DD/MM/YYYY') || '.', 
                            'task_due_soon', 
                            '/tasks?id=' || t.id,
                            t.id,
                            false,
                            now()
                        );
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- B. TAREFAS ATRASADAS (due_date < CURRENT_DATE e não concluídas)
    -- ------------------------------------------------------------------------
    FOR t IN 
        SELECT id, task_name, client_name, competence, org_id, responsible, responsibles, due_date 
        FROM public.tasks 
        WHERE status NOT IN ('Concluída', 'Cancelada') 
          AND due_date IS NOT NULL 
          AND due_date < CURRENT_DATE
    LOOP
        v_resp_names := '{}';
        IF t.responsibles IS NOT NULL AND array_length(t.responsibles, 1) > 0 THEN
            v_resp_names := t.responsibles;
        ELSIF t.responsible IS NOT NULL AND trim(t.responsible) != '' THEN
            v_resp_names := ARRAY[t.responsible];
        END IF;

        v_comp_text := case when (t.competence is not null and t.competence != '') then ' | Competência: ' || t.competence else '' end;

        FOREACH v_r_name IN ARRAY v_resp_names LOOP
            IF v_r_name IS NOT NULL AND trim(v_r_name) != '' THEN
                v_user_id := NULL;
                SELECT id INTO v_user_id FROM public.profiles 
                WHERE org_id = t.org_id AND lower(trim(full_name)) = lower(trim(v_r_name)) LIMIT 1;

                IF v_user_id IS NOT NULL THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM public.notifications 
                        WHERE related_entity_id = t.id 
                          AND user_id = v_user_id 
                          AND type = 'task_overdue' 
                          AND created_at >= CURRENT_DATE
                    ) THEN
                        INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                        VALUES (
                            v_user_id, 
                            'Tarefa Atrasada', 
                            'A tarefa "' || t.task_name || '" (Cliente: ' || coalesce(t.client_name, 'N/A') || v_comp_text || ') venceu em ' || to_char(t.due_date, 'DD/MM/YYYY') || ' e continua pendente.', 
                            'task_overdue', 
                            '/tasks?id=' || t.id,
                            t.id,
                            false,
                            now()
                        );
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- C. LICENÇAS E ALVARÁS EXPIRANDO (Até 30 dias)
    -- ------------------------------------------------------------------------
    FOR t IN 
        SELECT l.id, l.license_name, l.expiry_date, c.company_name, c.trade_name, c.org_id
        FROM public.client_licenses l
        JOIN public.clients c ON l.client_id = c.id
        WHERE l.expiry_date IS NOT NULL 
          AND l.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          AND l.expiry_date >= CURRENT_DATE
    LOOP
        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = t.org_id AND role = 'gestor'
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE related_entity_id = t.id 
                  AND user_id = gestor.id 
                  AND type = 'license_expiring' 
                  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            ) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    'Licença/Alvará Expirando', 
                    'A licença "' || t.license_name || '" do cliente ' || coalesce(t.company_name, t.trade_name) || ' expira em ' || to_char(t.expiry_date, 'DD/MM/YYYY') || '.', 
                    'license_expiring', 
                    '/clients',
                    t.id,
                    false,
                    now()
                );
            END IF;
        END LOOP;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- D. CERTIFICADOS DIGITAIS A1/A3 EXPIRANDO (Até 30 dias)
    -- ------------------------------------------------------------------------
    FOR cert IN 
        SELECT c.id, c.model, c.signatory, c.expires_at, cl.company_name, cl.trade_name, cl.org_id
        FROM public.client_certificates c
        JOIN public.clients cl ON c.client_id = cl.id
        WHERE c.expires_at IS NOT NULL 
          AND c.expires_at <= CURRENT_DATE + INTERVAL '30 days'
          AND c.expires_at >= CURRENT_DATE
    LOOP
        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cert.org_id AND role = 'gestor'
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE related_entity_id = cert.id 
                  AND user_id = gestor.id 
                  AND type = 'license_expiring' 
                  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            ) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    'Certificado Digital Expirando', 
                    'O certificado ' || coalesce(cert.model, 'A1') || ' (' || coalesce(cert.signatory, 'Signatário') || ') do cliente ' || coalesce(cl.company_name, cl.trade_name) || ' expira em ' || to_char(cert.expires_at, 'DD/MM/YYYY') || '.', 
                    'license_expiring', 
                    '/clients',
                    cert.id,
                    false,
                    now()
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$function$;


-- ============================================================================
-- 4. TAREFA CONCLUÍDA (notify_task_concluded)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_task_concluded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    gestor RECORD;
    v_msg TEXT;
BEGIN
    IF NEW.status = 'Concluída' AND (OLD.status IS NULL OR OLD.status != 'Concluída') THEN
        v_msg := 'A tarefa "' || NEW.task_name || '" foi concluída por ' || coalesce(NEW.responsible, 'Responsável não informado') || '.' ||
                 case when (NEW.client_name is not null and NEW.client_name != '') then chr(10) || '🏢 ' || NEW.client_name else '' end ||
                 case when (NEW.competence is not null and NEW.competence != '') then chr(10) || '📅 Competência: ' || NEW.competence else '' end;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                'Tarefa Concluída', 
                v_msg, 
                'task_concluded', 
                '/tasks?id=' || NEW.id,
                NEW.id,
                false,
                now()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;


-- ============================================================================
-- 5. ALERTAS FISCAIS DA TAREFA (notify_task_alerts)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_task_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    gestor RECORD;
    v_comp_suffix TEXT := '';
BEGIN
    IF NEW.competence IS NOT NULL AND NEW.competence != '' THEN
        v_comp_suffix := chr(10) || '📅 Competência: ' || NEW.competence;
    END IF;

    IF NEW.exceeded_sublimit = true AND (OLD.exceeded_sublimit IS NULL OR OLD.exceeded_sublimit = false) THEN
        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                'Alerta: Excedeu Sublimite', 
                'O cliente ' || coalesce(NEW.client_name, 'não informado') || ' excedeu o sublimite do Simples Nacional na tarefa "' || NEW.task_name || '".' || v_comp_suffix, 
                'task_alert', 
                '/tasks?id=' || NEW.id,
                NEW.id,
                false,
                now()
            );
        END LOOP;
    END IF;

    IF NEW.notified_exclusion = true AND (OLD.notified_exclusion IS NULL OR OLD.notified_exclusion = false) THEN
        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                'Alerta Crítico: Exclusão Notificada', 
                'O cliente ' || coalesce(NEW.client_name, 'não informado') || ' teve exclusão notificada do Simples Nacional na tarefa "' || NEW.task_name || '".' || v_comp_suffix, 
                'task_alert_critical', 
                '/tasks?id=' || NEW.id,
                NEW.id,
                false,
                now()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;
