-- Migration: Deduplicação Inteligente de Notificações de Tarefas Recorrentes
-- Evita enxurrada de notificações quando tarefas mensais, bimestrais, semestrais, etc. são criadas em lote

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
    -- Se for UPDATE, identificamos quais responsáveis foram adicionados
    ELSIF TG_OP = 'UPDATE' THEN
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
            IF OLD.responsible IS NULL OR trim(OLD.responsible) != trim(NEW.responsible) THEN
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

    -- Notificar cada responsável recém-atribuído
    FOREACH v_r_name IN ARRAY v_resp_names LOOP
        IF v_r_name IS NOT NULL AND trim(v_r_name) != '' THEN
            v_user_id := NULL;

            -- 1ª tentativa: Correspondência direta em profiles.full_name
            SELECT id INTO v_user_id 
            FROM public.profiles 
            WHERE org_id = NEW.org_id 
              AND lower(trim(full_name)) = lower(trim(v_r_name))
            LIMIT 1;

            -- 2ª tentativa: Correspondência via tabela members
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

            -- Inserir notificação se usuário for encontrado
            IF v_user_id IS NOT NULL THEN
                -- Deduplicação Inteligente:
                -- Se já foi gerada uma notificação idêntica para este usuário (mesma mensagem / mesma tarefa e cliente)
                -- nos últimos 10 minutos, descarta as ocorrências irmãs geradas pelo lote de recorrência.
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
