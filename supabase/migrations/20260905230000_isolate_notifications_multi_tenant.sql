-- ============================================================================
-- MIGRATION: ISOLAMENTO TOTAL MULTI-TENANT DE NOTIFICAÇÕES (TASK ACCOUNT)
-- Garante que nenhuma notificação vaze entre escritórios distintos (org_id).
-- ============================================================================

-- 1. Coluna org_id na tabela notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS org_id UUID;

-- 2. Backfill do org_id para notificações existentes baseado no perfil do usuário destinatário
UPDATE public.notifications n
SET org_id = p.org_id
FROM public.profiles p
WHERE p.id = n.user_id
  AND n.org_id IS NULL;

-- 3. Limpeza de notificações de testes residuais
DELETE FROM public.notifications 
WHERE message ILIKE '%Empresa Teste Notificacoes Fix Ltda%'
   OR title ILIKE '%Empresa Teste Notificacoes Fix Ltda%';

-- 4. Índices para performance e consulta por escritório
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON public.notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_org ON public.notifications(user_id, org_id);

-- 5. Atualização da Política de Segurança RLS (Row Level Security)
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Enforce organization and user isolation on notifications" ON public.notifications;

CREATE POLICY "Enforce organization and user isolation on notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (
    user_id = auth.uid() 
    AND (
        org_id IS NULL 
        OR org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
)
WITH CHECK (
    user_id = auth.uid() 
    AND (
        org_id IS NULL 
        OR org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- ============================================================================
-- 6. ATUALIZAÇÃO DAS FUNÇÕES DE NOTIFICAÇÃO (TRIGGERS E CRON)
-- ============================================================================

-- A. NOTIFICAÇÃO DE ATRIBUIÇÃO DE TAREFA
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
    IF NEW.org_id IS NULL THEN
        RETURN NEW;
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
                    INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                    VALUES (
                        v_user_id, 
                        NEW.org_id,
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

-- B. REATRIBUIÇÃO DE TAREFA (notify_task_reassignment)
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
    IF NEW.org_id IS NULL THEN
        RETURN NEW;
    END IF;

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
        WHERE org_id = NEW.org_id AND lower(trim(full_name)) = lower(v_new_resp) LIMIT 1;
        IF v_new_user_id IS NULL THEN
            SELECT p.id INTO v_new_user_id FROM public.members m 
            JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
            WHERE m.org_id = NEW.org_id AND (lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(v_new_resp) OR lower(trim(m.first_name)) = lower(v_new_resp)) LIMIT 1;
        END IF;

        SELECT id INTO v_old_user_id FROM public.profiles 
        WHERE org_id = NEW.org_id AND lower(trim(full_name)) = lower(v_old_resp) LIMIT 1;
        IF v_old_user_id IS NULL THEN
            SELECT p.id INTO v_old_user_id FROM public.members m 
            JOIN public.profiles p ON lower(trim(p.full_name)) = lower(trim(m.first_name || ' ' || coalesce(m.last_name, '')))
            WHERE m.org_id = NEW.org_id AND (lower(trim(m.first_name || ' ' || coalesce(m.last_name, ''))) = lower(v_old_resp) OR lower(trim(m.first_name)) = lower(v_old_resp)) LIMIT 1;
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
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (v_new_user_id, NEW.org_id, 'Tarefa Transferida', v_msg_new, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
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
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (v_old_user_id, NEW.org_id, 'Tarefa Reatribuída', v_msg_old, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
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
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (gestor.id, NEW.org_id, 'Reatribuição de Tarefa', v_msg_gestor, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;

-- C. TAREFA CONCLUÍDA (notify_task_concluded)
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

-- D. ALERTAS FISCAIS DA TAREFA (notify_task_alerts)
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
    IF NEW.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.competence IS NOT NULL AND NEW.competence != '' THEN
        v_comp_suffix := chr(10) || '📅 Competência: ' || NEW.competence;
    END IF;

    IF NEW.exceeded_sublimit = true AND (OLD.exceeded_sublimit IS NULL OR OLD.exceeded_sublimit = false) THEN
        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                NEW.org_id,
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
            INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                NEW.org_id,
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

-- E. NOVO CLIENTE CADASTRADO (notify_new_client)
CREATE OR REPLACE FUNCTION public.notify_new_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    m RECORD;
    v_title TEXT := 'Novo Cliente Cadastrado';
    v_message TEXT;
BEGIN
    IF NEW.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_message := 'Novo cliente cadastrado no escritório!' || chr(10) ||
                 '🏢 ' || NEW.company_name || coalesce(' (' || NEW.trade_name || ')', '') || chr(10) ||
                 '📄 CNPJ/CPF: ' || coalesce(NEW.document, 'Não informado') ||
                 case when (NEW.city is not null and NEW.city != '') then chr(10) || '📍 ' || NEW.city || coalesce(' - ' || NEW.state, '') else '' end;

    -- Notificar apenas gestores e operacionais da MESMA organização
    FOR m IN 
        SELECT id FROM public.profiles 
        WHERE org_id = NEW.org_id 
          AND role IN ('gestor', 'operacional')
    LOOP
        INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
        VALUES (
            m.id, 
            NEW.org_id,
            v_title, 
            v_message, 
            'client_created', 
            '/clients?id=' || NEW.id,
            NEW.id,
            false,
            now()
        );
    END LOOP;

    RETURN NEW;
END;
$function$;

-- F. MUDANÇA DE DOMICÍLIO FISCAL (notify_client_address_change)
CREATE OR REPLACE FUNCTION public.notify_client_address_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    gestor RECORD;
    v_title TEXT;
    v_message TEXT;
    v_old_loc TEXT;
    v_new_loc TEXT;
BEGIN
    IF NEW.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_old_loc := trim(coalesce(OLD.city, '')) || '/' || trim(coalesce(OLD.state, ''));
        v_new_loc := trim(coalesce(NEW.city, '')) || '/' || trim(coalesce(NEW.state, ''));

        IF (OLD.city IS DISTINCT FROM NEW.city OR OLD.state IS DISTINCT FROM NEW.state)
           AND (OLD.city IS NOT NULL OR OLD.state IS NOT NULL)
           AND (NEW.city IS NOT NULL OR NEW.state IS NOT NULL) THEN
            
            v_title := 'Alerta: Mudança de Domicílio Fiscal';
            v_message := 'O cliente ' || coalesce(NEW.company_name, NEW.trade_name) || ' teve seu domicílio fiscal alterado!' || chr(10) ||
                         '📍 De: ' || v_old_loc || ' ➡️ Para: ' || v_new_loc || chr(10) ||
                         '⚠️ Verifique inscrições municipais, estaduais e alvarás correspondentes.';

            FOR gestor IN 
                SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
            LOOP
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    NEW.org_id,
                    v_title, 
                    v_message, 
                    'client_address_changed', 
                    '/clients?id=' || NEW.id,
                    NEW.id,
                    false,
                    now()
                );
            END LOOP;
        ELSIF (OLD.street IS DISTINCT FROM NEW.street OR OLD.number IS DISTINCT FROM NEW.number OR OLD.neighborhood IS DISTINCT FROM NEW.neighborhood) THEN
            v_title := 'Endereço Atualizado';
            v_message := 'O endereço comercial do cliente ' || coalesce(NEW.company_name, NEW.trade_name) || ' foi atualizado.';

            FOR gestor IN 
                SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
            LOOP
                INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    NEW.org_id,
                    v_title, 
                    v_message, 
                    'client_address_changed', 
                    '/clients?id=' || NEW.id,
                    NEW.id,
                    false,
                    now()
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- G. ALTERAÇÃO DE CONTATO DO CLIENTE (notify_client_contact_change)
CREATE OR REPLACE FUNCTION public.notify_client_contact_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cl RECORD;
    gestor RECORD;
    v_title TEXT;
    v_message TEXT;
    v_changes TEXT := '';
BEGIN
    SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = coalesce(NEW.client_id, OLD.client_id);
    IF cl.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_title := 'Novo Contato Adicionado';
        v_message := 'Novo contato cadastrado para ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                     '👤 ' || coalesce(NEW.name, 'Sem nome') || chr(10) ||
                     '📞 ' || coalesce(NEW.phone_mobile, NEW.phone_fixed, 'Sem telefone') || 
                     ' | ✉️ ' || coalesce(NEW.email, 'Sem email');

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                cl.org_id,
                v_title, 
                v_message, 
                'client_contact_updated', 
                '/clients?id=' || NEW.client_id,
                NEW.client_id,
                false,
                now()
            );
        END LOOP;

    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.name IS NOT DISTINCT FROM NEW.name) AND
           (OLD.email IS NOT DISTINCT FROM NEW.email) AND
           (OLD.phone_mobile IS NOT DISTINCT FROM NEW.phone_mobile) AND
           (OLD.phone_fixed IS NOT DISTINCT FROM NEW.phone_fixed) AND
           (OLD.role IS NOT DISTINCT FROM NEW.role) AND
           (OLD.is_main IS NOT DISTINCT FROM NEW.is_main) THEN
            RETURN NEW;
        END IF;

        IF OLD.name IS DISTINCT FROM NEW.name THEN
            v_changes := v_changes || chr(10) || '👤 Nome: ' || coalesce(OLD.name, '-') || ' ➡️ ' || coalesce(NEW.name, '-');
        END IF;
        IF OLD.email IS DISTINCT FROM NEW.email THEN
            v_changes := v_changes || chr(10) || '✉️ E-mail: ' || coalesce(OLD.email, '-') || ' ➡️ ' || coalesce(NEW.email, '-');
        END IF;
        IF OLD.phone_mobile IS DISTINCT FROM NEW.phone_mobile THEN
            v_changes := v_changes || chr(10) || '📱 Celular: ' || coalesce(OLD.phone_mobile, '-') || ' ➡️ ' || coalesce(NEW.phone_mobile, '-');
        END IF;
        IF OLD.phone_fixed IS DISTINCT FROM NEW.phone_fixed THEN
            v_changes := v_changes || chr(10) || '📞 Fixo: ' || coalesce(OLD.phone_fixed, '-') || ' ➡️ ' || coalesce(NEW.phone_fixed, '-');
        END IF;

        IF v_changes = '' THEN
            RETURN NEW;
        END IF;

        v_title := 'Contato Atualizado';
        v_message := 'O contato "' || coalesce(NEW.name, OLD.name) || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foi atualizado:' || v_changes;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                cl.org_id,
                v_title, 
                v_message, 
                'client_contact_updated', 
                '/clients?id=' || NEW.client_id,
                NEW.client_id,
                false,
                now()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;

-- H. CERTIFICADO DIGITAL DO CLIENTE (notify_client_certificate_change)
CREATE OR REPLACE FUNCTION public.notify_client_certificate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cl RECORD;
    gestor RECORD;
    v_title TEXT;
    v_message TEXT;
    v_model_disp TEXT;
    v_signatory_disp TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.expires_at IS NOT DISTINCT FROM NEW.expires_at) AND
           (OLD.model IS NOT DISTINCT FROM NEW.model) AND
           (OLD.signatory IS NOT DISTINCT FROM NEW.signatory) THEN
            RETURN NEW;
        END IF;

        SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
        IF cl.org_id IS NULL THEN
            RETURN NEW;
        END IF;

        v_model_disp := coalesce(NEW.model, 'A1');
        v_signatory_disp := coalesce(NEW.signatory, 'Signatário não informado');

        IF OLD.expires_at IS DISTINCT FROM NEW.expires_at THEN
            IF OLD.expires_at IS NULL THEN
                v_title := 'Validade de Certificado Definida';
                v_message := 'Validade do certificado ' || v_model_disp || ' (' || v_signatory_disp || ') de ' || coalesce(cl.company_name, cl.trade_name) || ' definida para ' || to_char(NEW.expires_at, 'DD/MM/YYYY') || '.';
            ELSIF NEW.expires_at > OLD.expires_at THEN
                v_title := 'Certificado Digital Renovado';
                v_message := 'O certificado ' || v_model_disp || ' (' || v_signatory_disp || ') de ' || coalesce(cl.company_name, cl.trade_name) || ' teve sua validade estendida.' || chr(10) ||
                             '📅 Validade anterior: ' || to_char(OLD.expires_at, 'DD/MM/YYYY') || chr(10) ||
                             '📅 Nova validade: ' || to_char(NEW.expires_at, 'DD/MM/YYYY');
            ELSE
                v_title := 'Validade do Certificado Alterada';
                v_message := 'A validade do certificado ' || v_model_disp || ' (' || v_signatory_disp || ') de ' || coalesce(cl.company_name, cl.trade_name) || ' foi alterada de ' || to_char(OLD.expires_at, 'DD/MM/YYYY') || ' para ' || to_char(NEW.expires_at, 'DD/MM/YYYY') || '.';
            END IF;
        ELSE
            v_title := 'Certificado Digital Atualizado';
            v_message := 'Dados do certificado digital de ' || coalesce(cl.company_name, cl.trade_name) || ' foram atualizados (' || v_model_disp || ' - ' || v_signatory_disp || ').';
        END IF;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                cl.org_id,
                v_title, 
                v_message, 
                case when v_title = 'Certificado Digital Renovado' then 'certificate_renewed' else 'certificate_updated' end, 
                '/clients?id=' || NEW.client_id,
                NEW.id,
                false,
                now()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;

-- I. LICENÇAS E ALVARÁS DO CLIENTE (notify_client_license_change)
CREATE OR REPLACE FUNCTION public.notify_client_license_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cl RECORD;
    gestor RECORD;
    v_title TEXT;
    v_message TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.expiry_date IS NOT DISTINCT FROM NEW.expiry_date) AND
           (OLD.license_name IS NOT DISTINCT FROM NEW.license_name) THEN
            RETURN NEW;
        END IF;

        SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
        IF cl.org_id IS NULL THEN
            RETURN NEW;
        END IF;

        IF OLD.expiry_date IS DISTINCT FROM NEW.expiry_date THEN
            IF OLD.expiry_date IS NULL THEN
                v_title := 'Vencimento de Licença Definido';
                v_message := 'Vencimento da licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' definido para ' || to_char(NEW.expiry_date, 'DD/MM/YYYY') || '.';
            ELSIF NEW.expiry_date > OLD.expiry_date THEN
                v_title := 'Licença / Alvará Renovado';
                v_message := 'A licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foi renovada com sucesso.' || chr(10) ||
                             '📅 Vencimento anterior: ' || to_char(OLD.expiry_date, 'DD/MM/YYYY') || chr(10) ||
                             '📅 Novo vencimento: ' || to_char(NEW.expiry_date, 'DD/MM/YYYY');
            ELSE
                v_title := 'Vencimento da Licença Alterado';
                v_message := 'O vencimento da licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foi alterado de ' || to_char(OLD.expiry_date, 'DD/MM/YYYY') || ' para ' || to_char(NEW.expiry_date, 'DD/MM/YYYY') || '.';
            END IF;
        ELSE
            v_title := 'Licença Atualizada';
            v_message := 'A licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' teve seus dados alterados.';
        END IF;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                cl.org_id,
                v_title, 
                v_message, 
                case when v_title = 'Licença / Alvará Renovado' then 'license_renewed' else 'license_updated' end, 
                '/clients?id=' || NEW.client_id,
                NEW.id,
                false,
                now()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;

-- J. LEGISLAÇÃO ADICIONADA (notify_client_legislation_added)
CREATE OR REPLACE FUNCTION public.notify_client_legislation_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cl RECORD;
    gestor RECORD;
    v_title TEXT := 'Nova Legislação Vinculada';
    v_message TEXT;
BEGIN
    SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
    IF cl.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_message := 'Nova legislação vinculada ao cliente ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                 '📜 ' || NEW.legislation_name ||
                 case when (NEW.status is not null and NEW.status != '') then chr(10) || '⚖️ Status: ' || NEW.status else '' end;

    FOR gestor IN 
        SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
    LOOP
        INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
        VALUES (
            gestor.id, 
            cl.org_id,
            v_title, 
            v_message, 
            'client_legislation_added', 
            '/tasks',
            NEW.id,
            false,
            now()
        );
    END LOOP;

    RETURN NEW;
END;
$function$;

-- K. ALTERAÇÃO DE REGIME TRIBUTÁRIO (notify_client_tax_regime_change)
CREATE OR REPLACE FUNCTION public.notify_client_tax_regime_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cl RECORD;
    gestor RECORD;
    v_title TEXT := 'Regime Tributário Alterado';
    v_message TEXT;
    v_regime_label TEXT;
BEGIN
    SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
    IF cl.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_regime_label := coalesce(NEW.regime, 'Não especificado');

    v_message := 'Regime tributário atualizado para o cliente ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                 '🏛️ Novo Regime Vigente: ' || v_regime_label || chr(10) ||
                 '📅 Vigência a partir de: ' || to_char(NEW.start_date, 'DD/MM/YYYY');

    FOR gestor IN 
        SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
    LOOP
        INSERT INTO public.notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
        VALUES (
            gestor.id, 
            cl.org_id,
            v_title, 
            v_message, 
            'client_tax_regime_changed', 
            '/tasks',
            NEW.id,
            false,
            now()
        );
    END LOOP;

    RETURN NEW;
END;
$function$;

-- L. NOVO TUTORIAL (notify_new_tutorial)
CREATE OR REPLACE FUNCTION public.notify_new_tutorial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    member RECORD;
BEGIN
    IF NEW.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    FOR member IN 
        SELECT id FROM profiles WHERE org_id = NEW.org_id
    LOOP
        INSERT INTO notifications (user_id, org_id, title, message, type, link, related_entity_id, read, created_at)
        VALUES (
            member.id, 
            NEW.org_id,
            'Novo Tutorial', 
            'Um novo tutorial foi adicionado: ' || NEW.subject, 
            'new_tutorial', 
            '/tutorials',
            NEW.id,
            false,
            now()
        );
    END LOOP;
    RETURN NEW;
END;
$function$;

-- M. CRON DIÁRIO DE EXPIRAÇÕES (check_daily_expirations)
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
                    IF NOT EXISTS (
                        SELECT 1 FROM public.notifications 
                        WHERE related_entity_id = t.id 
                          AND user_id = v_user_id 
                          AND type = 'task_due_soon' 
                          AND created_at >= CURRENT_DATE
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
                    IF NOT EXISTS (
                        SELECT 1 FROM public.notifications 
                        WHERE related_entity_id = t.id 
                          AND user_id = v_user_id 
                          AND type = 'task_overdue' 
                          AND created_at >= CURRENT_DATE
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
                    'A licença "' || t.license_name || '" do cliente ' || coalesce(t.company_name, t.trade_name) || ' venceu em ' || to_char(t.expiry_date, 'DD/MM/YYYY') || ' e necessita de renovação.', 
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
