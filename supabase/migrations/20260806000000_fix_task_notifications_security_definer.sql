-- Fix: Adicionar SECURITY DEFINER nas funções de trigger notify_new_task e notify_task_alerts
-- Isso garante que ao atribuir tarefas para outros membros ou disparar alertas, a gravação na tabela "notifications" 
-- seja realizada sem violar a política de Row Level Security (RLS) da tabela notifications.

CREATE OR REPLACE FUNCTION public.notify_new_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_message TEXT;
BEGIN
    -- First try: direct match on profiles.full_name
    SELECT id INTO v_user_id FROM profiles 
    WHERE org_id = NEW.org_id 
    AND trim(full_name) = trim(NEW.responsible)
    LIMIT 1;

    -- Second try: match via members table, but always return the profiles.id
    IF v_user_id IS NULL THEN
        SELECT p.id INTO v_user_id 
        FROM members m
        JOIN profiles p ON p.full_name = trim(m.first_name || ' ' || coalesce(m.last_name, ''))
                       AND p.org_id = m.org_id
        WHERE m.org_id = NEW.org_id
        AND (trim(m.first_name || ' ' || coalesce(m.last_name, '')) = trim(NEW.responsible)
             OR trim(m.first_name) = trim(NEW.responsible))
        LIMIT 1;
    END IF;

    -- Only proceed if we found a valid profiles.id
    IF v_user_id IS NOT NULL THEN
        -- Construir a mensagem multi-linha com nome da empresa e da tarefa
        v_message := 'Você foi atribuído à tarefa.' || chr(10) || 
                     '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                     '📝 ' || NEW.task_name;

        -- Evita duplicidade em massa/recorrentes: check se já existe uma notificação não lida idêntica nos últimos 2 minutos
        IF NOT EXISTS (
            SELECT 1 FROM notifications 
            WHERE user_id = v_user_id 
            AND type = 'task_assigned'
            AND title = 'Nova Tarefa'
            AND message = v_message
            AND read = false
            AND created_at > (now() - interval '2 minutes')
        ) THEN
            INSERT INTO notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
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

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_task_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    gestor RECORD;
BEGIN
    IF NEW.exceeded_sublimit = true AND (OLD.exceeded_sublimit IS NULL OR OLD.exceeded_sublimit = false) THEN
        FOR gestor IN 
            SELECT id FROM profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                'Alerta: Excedeu Sublimite', 
                'O cliente ' || coalesce(NEW.client_name, '') || ' excedeu o sublimite do Simples Nacional.', 
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
            SELECT id FROM profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                'Alerta Crítico: Exclusão Notificada', 
                'O cliente ' || coalesce(NEW.client_name, '') || ' teve exclusão notificada do Simples Nacional.', 
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
