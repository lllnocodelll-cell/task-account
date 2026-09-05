-- Migration: Aprimoramento e Correções Críticas do Módulo de Notificações
-- 1. Ativação do Supabase Realtime para a tabela notifications
-- 2. Suporte a UPDATE e Múltiplos Responsáveis no trigger de tarefas
-- 3. Inclusão de Certificados Digitais A1 e Tarefas Atrasadas no check_daily_expirations

-- ============================================================================
-- 1. ADICIONAR NOTIFICATIONS NA PUBLICAÇÃO SUPABASE_REALTIME
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- Garantir replica identity default para envio de payloads via Realtime
ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;

-- ============================================================================
-- 2. TRIGGER DE ATRIBUIÇÃO DE TAREFAS COM SUPORTE A UPDATE E MULTI-RESPONSÁVEIS
-- ============================================================================
DROP TRIGGER IF EXISTS on_new_task ON public.tasks;
DROP TRIGGER IF EXISTS trg_notify_task_assignment ON public.tasks;

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
    v_is_new BOOLEAN;
BEGIN
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

    -- Construir a mensagem multi-linha
    v_message := 'Você foi atribuído à tarefa.' || chr(10) || 
                 '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                 '📝 ' || NEW.task_name;

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
                -- Deduplicação: evitar duplicação em menos de 2 minutos para a mesma tarefa
                IF NOT EXISTS (
                    SELECT 1 FROM public.notifications 
                    WHERE user_id = v_user_id 
                      AND type = 'task_assigned'
                      AND related_entity_id = NEW.id
                      AND read = false
                      AND created_at > (now() - interval '2 minutes')
                ) THEN
                    INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                    VALUES (
                        v_user_id, 
                        'Nova Tarefa', 
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

CREATE TRIGGER trg_notify_task_assignment
AFTER INSERT OR UPDATE OF responsible, responsibles ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- ============================================================================
-- 3. ATUALIZAR FUNÇÃO check_daily_expirations (Certificados A1, Atrasadas e Multi-responsáveis)
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
BEGIN
    -- ------------------------------------------------------------------------
    -- A. TAREFAS PRÓXIMAS DO VENCIMENTO (Vencem Hoje ou D+1)
    -- ------------------------------------------------------------------------
    FOR t IN 
        SELECT id, task_name, client_name, org_id, responsible, responsibles, due_date 
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
                            'A tarefa "' || t.task_name || '" (Cliente: ' || coalesce(t.client_name, 'N/A') || ') vence em ' || to_char(t.due_date, 'DD/MM/YYYY') || '.', 
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
        SELECT id, task_name, client_name, org_id, responsible, responsibles, due_date 
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
                            'A tarefa "' || t.task_name || '" (Cliente: ' || coalesce(t.client_name, 'N/A') || ') venceu em ' || to_char(t.due_date, 'DD/MM/YYYY') || ' e continua pendente.', 
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
