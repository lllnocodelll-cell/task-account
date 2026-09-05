-- Migration: Deduplicação e Consolidação de Notificações na Reatribuição de Tarefas
-- Evita múltiplas notificações repetidas quando tarefas com recorrência são reatribuídas em lote (update cascata)
-- e impede duplicidade entre task_assigned e task_reassigned.

-- 1. AJUSTE EM notify_task_assignment: Em UPDATE, reatribuições primárias (De A para B) ficam a cargo de task_reassigned
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
BEGIN
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
        -- Se for uma reatribuição do responsável primário de um colaborador para outro,
        -- deixamos exclusivamente para a função notify_task_reassignment notificar (com histórico De -> Para)
        IF OLD.responsible IS NOT NULL AND trim(OLD.responsible) != ''
           AND NEW.responsible IS NOT NULL AND trim(NEW.responsible) != ''
           AND OLD.responsible IS DISTINCT FROM NEW.responsible THEN
            -- Reatribuição tratada por notify_task_reassignment
            RETURN NEW;
        END IF;

        -- Caso contrário, verifica novos responsáveis adicionados (ex: em responsibles[])
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

    -- Se não houver novos responsáveis, encerra
    IF array_length(v_resp_names, 1) IS NULL OR array_length(v_resp_names, 1) = 0 THEN
        RETURN NEW;
    END IF;

    -- Construir a mensagem multi-linha identificando se é recorrente
    IF v_is_recurring THEN
        v_message := 'Você foi atribuído à tarefa recorrente.' || chr(10) || 
                     '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                     '📝 ' || NEW.task_name || chr(10) ||
                     '🔁 Recorrência: ' || initcap(NEW.recurrence);
    ELSE
        v_message := 'Você foi atribuído à tarefa.' || chr(10) || 
                     '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                     '📝 ' || NEW.task_name;
    END IF;

    -- Notificar cada responsável recém-atribuído com anti-spam inteligente
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
                -- Anti-spam: descarta duplicatas idênticas dos últimos 10 minutos
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


-- 2. AJUSTE EM notify_task_reassignment: Deduplicação anti-spam na transferência de tarefas em lote
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
BEGIN
    -- Apenas atua se houver mudança real de responsável primário
    IF OLD.responsible IS DISTINCT FROM NEW.responsible 
       AND OLD.responsible IS NOT NULL AND trim(OLD.responsible) != ''
       AND NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN

        v_old_resp := trim(OLD.responsible);
        v_new_resp := trim(NEW.responsible);

        -- Verificar se a tarefa é recorrente
        IF NEW.recurrence IS NOT NULL 
           AND trim(lower(NEW.recurrence)) NOT IN ('', 'none', 'nao_aplica', 'nao_se_aplica', 'unica', 'única') THEN
            v_is_recurring := true;
        END IF;

        -- Localizar ID do novo responsável
        SELECT id INTO v_new_user_id FROM public.profiles 
        WHERE (org_id = NEW.org_id OR NEW.org_id IS NULL) AND lower(trim(full_name)) = lower(v_new_resp) LIMIT 1;
        IF v_new_user_id IS NULL THEN
            SELECT p.id INTO v_new_user_id FROM public.members m 
            JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
            WHERE (m.org_id = NEW.org_id OR NEW.org_id IS NULL) AND (lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(v_new_resp) OR lower(trim(m.first_name)) = lower(v_new_resp)) LIMIT 1;
        END IF;

        -- Localizar ID do responsável anterior
        SELECT id INTO v_old_user_id FROM public.profiles 
        WHERE (org_id = NEW.org_id OR NEW.org_id IS NULL) AND lower(trim(full_name)) = lower(v_old_resp) LIMIT 1;
        IF v_old_user_id IS NULL THEN
            SELECT p.id INTO v_old_user_id FROM public.members m 
            JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
            WHERE (m.org_id = NEW.org_id OR NEW.org_id IS NULL) AND (lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(v_old_resp) OR lower(trim(m.first_name)) = lower(v_old_resp)) LIMIT 1;
        END IF;

        -- Montar mensagens (incluindo indicação de recorrência se aplicável)
        IF v_is_recurring THEN
            v_msg_new := 'Você recebeu uma tarefa recorrente transferida.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name || chr(10) || 
                         '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp || chr(10) ||
                         '🔁 Recorrência: ' || initcap(NEW.recurrence);

            v_msg_old := 'A tarefa recorrente foi transferida para outro responsável.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name || chr(10) || 
                         '🔄 Transferida para: ' || v_new_resp || chr(10) ||
                         '🔁 Recorrência: ' || initcap(NEW.recurrence);

            v_msg_gestor := 'Reatribuição de tarefa recorrente realizada.' || chr(10) || 
                            '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                            '📝 ' || NEW.task_name || chr(10) || 
                            '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp || chr(10) ||
                            '🔁 Recorrência: ' || initcap(NEW.recurrence);
        ELSE
            v_msg_new := 'Você recebeu uma tarefa transferida.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name || chr(10) || 
                         '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp;

            v_msg_old := 'A tarefa foi transferida para outro responsável.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name || chr(10) || 
                         '🔄 Transferida para: ' || v_new_resp;

            v_msg_gestor := 'Reatribuição de tarefa realizada.' || chr(10) || 
                            '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                            '📝 ' || NEW.task_name || chr(10) || 
                            '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp;
        END IF;

        -- 1. Notificar novo responsável (com anti-spam de lote para tarefas recorrentes)
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

        -- 2. Notificar responsável anterior (com anti-spam de lote para tarefas recorrentes)
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

        -- 3. Notificar Gestores (com anti-spam de lote para tarefas recorrentes)
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
