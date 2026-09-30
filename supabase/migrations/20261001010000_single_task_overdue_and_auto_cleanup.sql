-- Migration: 20261001010000_single_task_overdue_and_auto_cleanup.sql
-- Objetivo:
-- 1. Disparo Único para notificações de atraso (task_overdue) e a vencer (task_due_soon),
--    eliminando o reenvio diário acumulativo da mesma tarefa.
-- 2. Auto-limpeza das notificações de atraso/vencimento ao concluir ou cancelar a tarefa.
-- 3. Saneamento retroativo de notificações duplicadas e órfãs na base.

-- ============================================================================
-- 1. ATUALIZAÇÃO DA FUNÇÃO check_daily_expirations() (Disparo Único)
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
          AND org_id IS NOT NULL
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
                    -- Trava de disparo único: só insere se ainda não existir notificação para esta tarefa
                    IF NOT EXISTS (
                        SELECT 1 FROM public.notifications 
                        WHERE related_entity_id = t.id 
                          AND user_id = v_user_id 
                          AND type = 'task_due_soon'
                    ) THEN
                        INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                        VALUES (
                            v_user_id, 
                            t.org_id,
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
          AND org_id IS NOT NULL
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
                    -- Trava de disparo único: só insere se ainda não existir notificação de atraso para esta tarefa
                    IF NOT EXISTS (
                        SELECT 1 FROM public.notifications 
                        WHERE related_entity_id = t.id 
                          AND user_id = v_user_id 
                          AND type = 'task_overdue'
                    ) THEN
                        INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                        VALUES (
                            v_user_id, 
                            t.org_id,
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
    -- C. LICENÇAS E ALVARÁS EXPIRANDO (Até 30 dias para vencer)
    -- ------------------------------------------------------------------------
    FOR t IN 
        SELECT l.id, l.license_name, l.expiry_date, c.company_name, c.trade_name, c.org_id, l.client_id
        FROM public.client_licenses l
        JOIN public.clients c ON l.client_id = c.id
        WHERE c.org_id IS NOT NULL
          AND l.expiry_date IS NOT NULL 
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
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    t.org_id,
                    'Licença/Alvará Expirando', 
                    'A licença "' || t.license_name || '" do cliente ' || coalesce(t.company_name, t.trade_name) || ' expira em ' || to_char(t.expiry_date, 'DD/MM/YYYY') || '.', 
                    'license_expiring', 
                    '/clients?id=' || t.client_id,
                    t.id,
                    false,
                    now()
                );
            END IF;
        END LOOP;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- D. CERTIFICADOS DIGITAIS EXPIRANDO (Até 30 dias para vencer)
    -- ------------------------------------------------------------------------
    FOR cert IN 
        SELECT c.id, c.model, c.signatory, c.expires_at, cl.company_name, cl.trade_name, cl.org_id, c.client_id
        FROM public.client_certificates c
        JOIN public.clients cl ON c.client_id = cl.id
        WHERE cl.org_id IS NOT NULL
          AND c.expires_at IS NOT NULL 
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
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    cert.org_id,
                    'Certificado Digital Expirando', 
                    'O certificado ' || coalesce(cert.model, 'A1') || ' (' || coalesce(cert.signatory, 'Signatário') || ') do cliente ' || coalesce(cert.company_name, cert.trade_name) || ' expira em ' || to_char(cert.expires_at, 'DD/MM/YYYY') || '.', 
                    'license_expiring', 
                    '/clients?id=' || cert.client_id,
                    cert.id,
                    false,
                    now()
                );
            END IF;
        END LOOP;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- E. CERTIFICADOS DIGITAIS VENCIDOS (expires_at < CURRENT_DATE)
    -- ------------------------------------------------------------------------
    FOR cert IN 
        SELECT c.id, c.model, c.signatory, c.expires_at, cl.company_name, cl.trade_name, cl.org_id, c.client_id
        FROM public.client_certificates c
        JOIN public.clients cl ON c.client_id = cl.id
        WHERE cl.org_id IS NOT NULL
          AND c.expires_at IS NOT NULL 
          AND c.expires_at < CURRENT_DATE
    LOOP
        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cert.org_id AND role = 'gestor'
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE related_entity_id = cert.id 
                  AND user_id = gestor.id 
                  AND type = 'certificate_expired' 
                  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            ) THEN
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    cert.org_id,
                    'Certificado Digital Vencido', 
                    'O certificado ' || coalesce(cert.model, 'A1') || ' (' || coalesce(cert.signatory, 'Signatário') || ') do cliente ' || coalesce(cert.company_name, cert.trade_name) || ' venceu em ' || to_char(cert.expires_at, 'DD/MM/YYYY') || ' e requer renovação urgente.', 
                    'certificate_expired', 
                    '/clients?id=' || cert.client_id,
                    cert.id,
                    false,
                    now()
                );
            END IF;
        END LOOP;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- F. LICENÇAS E ALVARÁS VENCIDOS (expiry_date < CURRENT_DATE)
    -- ------------------------------------------------------------------------
    FOR t IN 
        SELECT l.id, l.license_name, l.expiry_date, c.company_name, c.trade_name, c.org_id, l.client_id
        FROM public.client_licenses l
        JOIN public.clients c ON l.client_id = c.id
        WHERE c.org_id IS NOT NULL
          AND l.expiry_date IS NOT NULL 
          AND l.expiry_date < CURRENT_DATE
    LOOP
        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = t.org_id AND role = 'gestor'
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE related_entity_id = t.id 
                  AND user_id = gestor.id 
                  AND type = 'license_expired' 
                  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            ) THEN
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    t.org_id,
                    'Licença/Alvará Vencido', 
                    'A licença "' || t.license_name || '" do cliente ' || coalesce(t.company_name, t.trade_name) || ' venceu em ' || to_char(t.expiry_date, 'DD/MM/YYYY') || ' e requer renovação urgente.', 
                    'license_expired', 
                    '/clients?id=' || t.client_id,
                    t.id,
                    false,
                    now()
                );
            END IF;
        END LOOP;
    END LOOP;

END;
$function$;


-- ============================================================================
-- 2. ATUALIZAÇÃO DO TRIGGER notify_task_concluded() (Auto-Limpeza ao Concluir)
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
    IF NEW.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Se a tarefa foi concluída ou cancelada, limpar notificações de alerta e atraso
    IF NEW.status IN ('Concluída', 'Cancelada') THEN
        DELETE FROM public.notifications 
        WHERE related_entity_id = NEW.id 
          AND type IN ('task_overdue', 'task_due_soon');
    END IF;

    -- Se foi concluída (e não era concluída antes), notificar os gestores
    IF NEW.status = 'Concluída' AND (OLD.status IS NULL OR OLD.status != 'Concluída') THEN
        v_msg := 'A tarefa "' || NEW.task_name || '" foi concluída por ' || coalesce(NEW.responsible, 'Responsável não informado') || '.' ||
                 case when (NEW.client_name is not null and NEW.client_name != '') then chr(10) || '🏢 ' || NEW.client_name else '' end ||
                 case when (NEW.competence is not null and NEW.competence != '') then chr(10) || '📅 Competência: ' || NEW.competence else '' end;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                NEW.org_id,
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
-- 3. SANEAMENTO RETROATIVO DE NOTIFICAÇÕES DUPLICADAS E ÓRFÃS
-- ============================================================================

-- A. Remover notificações de alerta/atraso de tarefas já Concluídas ou Canceladas
DELETE FROM public.notifications n
WHERE n.type IN ('task_overdue', 'task_due_soon')
  AND EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = n.related_entity_id 
        AND t.status IN ('Concluída', 'Cancelada')
  );

-- B. Remover notificações de alerta/atraso de tarefas inexistentes (órfãs)
DELETE FROM public.notifications n
WHERE n.type IN ('task_overdue', 'task_due_soon')
  AND n.related_entity_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = n.related_entity_id
  );

-- C. Desduplicar notificações de tarefas atrasadas (task_overdue)
--    Mantém apenas o registro mais recente para cada par (tarefa, responsável)
DELETE FROM public.notifications n
WHERE n.type = 'task_overdue'
  AND n.id NOT IN (
      SELECT DISTINCT ON (related_entity_id, user_id, type) id
      FROM public.notifications
      WHERE type = 'task_overdue' 
        AND related_entity_id IS NOT NULL 
        AND user_id IS NOT NULL
      ORDER BY related_entity_id, user_id, type, created_at DESC
  );

-- D. Desduplicar notificações de tarefas próximas do vencimento (task_due_soon)
--    Mantém apenas o registro mais recente para cada par (tarefa, responsável)
DELETE FROM public.notifications n
WHERE n.type = 'task_due_soon'
  AND n.id NOT IN (
      SELECT DISTINCT ON (related_entity_id, user_id, type) id
      FROM public.notifications
      WHERE type = 'task_due_soon' 
        AND related_entity_id IS NOT NULL 
        AND user_id IS NOT NULL
      ORDER BY related_entity_id, user_id, type, created_at DESC
  );
