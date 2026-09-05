-- Migration: 6 Novos Cenários de Notificações de Negócio
-- 1. Novo Cliente Cadastrado (client_created)
-- 2. Reatribuição de Tarefa com De -> Para (task_reassigned)
-- 3. Alteração de Regime Tributário Vigente (client_tax_regime_changed)
-- 4. Nova Legislação Vinculada (client_legislation_added)
-- 5. Contato de Cliente Adicionado ou Alterado (client_contact_updated)
-- 6. Alteração de Endereço / Mudança de Domicílio Fiscal (client_address_changed)

-- ============================================================================
-- 0. ATUALIZAÇÃO DA CONSTRAINT DE TIPOS DE NOTIFICAÇÃO
-- ============================================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'info'::text, 
    'success'::text, 
    'warning'::text, 
    'alert'::text, 
    'task_assigned'::text, 
    'task_concluded'::text, 
    'task_alert'::text, 
    'task_alert_critical'::text, 
    'new_tutorial'::text, 
    'task_due_soon'::text, 
    'task_overdue'::text,
    'license_expiring'::text,
    'client_created'::text,
    'task_reassigned'::text,
    'client_tax_regime_changed'::text,
    'client_legislation_added'::text,
    'client_contact_updated'::text,
    'client_address_changed'::text
  ])
);

-- ============================================================================
-- 1. NOVO CLIENTE CADASTRADO (client_created)
-- ============================================================================
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
    v_client_display TEXT;
BEGIN
    v_client_display := coalesce(NEW.company_name, NEW.trade_name, 'Cliente sem nome');
    IF NEW.trade_name IS NOT NULL AND NEW.trade_name != '' AND NEW.trade_name != v_client_display THEN
        v_client_display := v_client_display || ' (' || NEW.trade_name || ')';
    END IF;

    v_message := 'Novo cliente cadastrado no escritório!' || chr(10) ||
                 '🏢 ' || v_client_display || chr(10) ||
                 '📄 CNPJ/CPF: ' || coalesce(NEW.document, 'Não informado') ||
                 case when (NEW.city is not null and NEW.city != '') then chr(10) || '📍 ' || NEW.city || coalesce(' - ' || NEW.state, '') else '' end;

    -- Notificar gestores e colaboradores operacionais do escritório
    FOR m IN 
        SELECT id FROM public.profiles 
        WHERE org_id = NEW.org_id 
          AND role IN ('gestor', 'operacional')
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
        VALUES (
            m.id, 
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

DROP TRIGGER IF EXISTS trg_notify_new_client ON public.clients;
CREATE TRIGGER trg_notify_new_client
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_client();

-- ============================================================================
-- 2. REATRIBUIÇÃO DE TAREFAS COM DE -> PARA (task_reassigned)
-- ============================================================================

-- Aprimorar a sincronização bidirecional entre responsible e responsibles
CREATE OR REPLACE FUNCTION public.sync_task_primary_responsible()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Se responsible foi explicitamente alterado e difere do anterior
    IF TG_OP = 'UPDATE' AND NEW.responsible IS DISTINCT FROM OLD.responsible AND NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN
        IF NEW.responsibles IS NULL OR array_length(NEW.responsibles, 1) IS NULL OR array_length(NEW.responsibles, 1) = 0 THEN
            NEW.responsibles := ARRAY[NEW.responsible];
        ELSIF NEW.responsibles[1] IS DISTINCT FROM NEW.responsible THEN
            NEW.responsibles := ARRAY[NEW.responsible] || array_remove(NEW.responsibles, NEW.responsible);
        END IF;
    -- Caso responsibles tenha sido atualizado ou inserção inicial
    ELSIF NEW.responsibles IS NOT NULL AND array_length(NEW.responsibles, 1) > 0 THEN
        NEW.responsible := NEW.responsibles[1];
    ELSIF NEW.responsible IS NOT NULL AND NEW.responsible != '' THEN
        NEW.responsibles := ARRAY[NEW.responsible];
    END IF;

    RETURN NEW;
END;
$function$;

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
BEGIN
    -- Apenas atua se houver mudança real de responsável primário
    IF OLD.responsible IS DISTINCT FROM NEW.responsible 
       AND OLD.responsible IS NOT NULL AND trim(OLD.responsible) != ''
       AND NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN

        v_old_resp := trim(OLD.responsible);
        v_new_resp := trim(NEW.responsible);

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

        -- 1. Notificar novo responsável
        IF v_new_user_id IS NOT NULL THEN
            v_msg_new := 'Você recebeu uma tarefa transferida.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name || chr(10) || 
                         '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp;

            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (v_new_user_id, 'Tarefa Transferida', v_msg_new, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
        END IF;

        -- 2. Notificar responsável anterior
        IF v_old_user_id IS NOT NULL THEN
            v_msg_old := 'A tarefa foi transferida para outro responsável.' || chr(10) || 
                         '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                         '📝 ' || NEW.task_name || chr(10) || 
                         '🔄 Transferida para: ' || v_new_resp;

            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (v_old_user_id, 'Tarefa Reatribuída', v_msg_old, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
        END IF;

        -- 3. Notificar Gestores (que não sejam nem o antigo nem o novo)
        v_msg_gestor := 'Reatribuição de tarefa realizada.' || chr(10) || 
                        '🏢 ' || coalesce(NEW.client_name, 'Empresa não informada') || chr(10) || 
                        '📝 ' || NEW.task_name || chr(10) || 
                        '🔄 De: ' || v_old_resp || ' ➡️ Para: ' || v_new_resp;

        FOR gestor IN 
            SELECT id FROM public.profiles 
            WHERE org_id = NEW.org_id 
              AND role = 'gestor'
              AND id NOT IN (coalesce(v_new_user_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(v_old_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (gestor.id, 'Reatribuição de Tarefa', v_msg_gestor, 'task_reassigned', '/tasks?id=' || NEW.id, NEW.id, false, now());
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_task_reassignment ON public.tasks;
CREATE TRIGGER trg_notify_task_reassignment
AFTER UPDATE OF responsible, responsibles ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_reassignment();

-- ============================================================================
-- 3. ALTERAÇÃO DE REGIME TRIBUTÁRIO (client_tax_regime_changed)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_client_tax_regime_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cl RECORD;
    gestor RECORD;
    v_prev_regime TEXT;
    v_message TEXT;
BEGIN
    -- Dispara quando um novo regime ativo é inserido (end_date IS NULL)
    IF NEW.end_date IS NULL THEN
        SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
        IF cl.org_id IS NOT NULL THEN
            -- Buscar regime anterior
            SELECT regime INTO v_prev_regime 
            FROM public.client_tax_regime_history 
            WHERE client_id = NEW.client_id AND id != NEW.id 
            ORDER BY created_at DESC LIMIT 1;

            v_message := 'Regime tributário atualizado para o cliente ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                         '🏛️ Novo Regime Vigente: ' || NEW.regime || 
                         case when v_prev_regime is not null then ' (Anterior: ' || v_prev_regime || ')' else '' end ||
                         case when NEW.start_date is not null then chr(10) || '📅 Vigência a partir de: ' || to_char(NEW.start_date, 'DD/MM/YYYY') else '' end;

            FOR gestor IN 
                SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
            LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    'Regime Tributário Alterado', 
                    v_message, 
                    'client_tax_regime_changed', 
                    '/clients?id=' || NEW.client_id,
                    NEW.client_id,
                    false,
                    now()
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_client_tax_regime_change ON public.client_tax_regime_history;
CREATE TRIGGER trg_notify_client_tax_regime_change
AFTER INSERT ON public.client_tax_regime_history
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_tax_regime_change();

-- ============================================================================
-- 4. NOVA LEGISLAÇÃO VINCULADA (client_legislation_added)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_client_legislation_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cl RECORD;
    gestor RECORD;
    v_message TEXT;
BEGIN
    SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
    IF cl.org_id IS NOT NULL THEN
        v_message := 'Nova legislação vinculada ao cliente ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                     '📜 ' || NEW.description ||
                     case when (NEW.status is not null and NEW.status != '') then chr(10) || '⚖️ Status: ' || NEW.status else '' end;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                'Nova Legislação Vinculada', 
                v_message, 
                'client_legislation_added', 
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

DROP TRIGGER IF EXISTS trg_notify_client_legislation_added ON public.client_legislations;
CREATE TRIGGER trg_notify_client_legislation_added
AFTER INSERT ON public.client_legislations
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_legislation_added();

-- ============================================================================
-- 5. CONTATO ADICIONADO OU ALTERADO (client_contact_updated)
-- ============================================================================
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
BEGIN
    SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
    IF cl.org_id IS NOT NULL THEN
        IF TG_OP = 'INSERT' THEN
            v_title := 'Novo Contato Adicionado';
            v_message := 'Novo contato cadastrado para ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                         '👤 ' || NEW.name || chr(10) ||
                         '📞 ' || coalesce(NEW.phone_mobile, NEW.phone_fixed, 'Sem telefone') || ' | ✉️ ' || coalesce(NEW.email, 'Sem e-mail');
        ELSE
            v_title := 'Contato Atualizado';
            v_message := 'Dados do contato ' || NEW.name || ' foram atualizados no cliente ' || coalesce(cl.company_name, cl.trade_name) || '.';
        END IF;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
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

DROP TRIGGER IF EXISTS trg_notify_client_contact_change ON public.client_contacts;
CREATE TRIGGER trg_notify_client_contact_change
AFTER INSERT OR UPDATE ON public.client_contacts
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_contact_change();

-- ============================================================================
-- 6. ALTERAÇÃO DE ENDEREÇO / MUDANÇA DE MUNICÍPIO/ESTADO (client_address_changed)
-- ============================================================================
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
    v_client_display TEXT;
BEGIN
    v_client_display := coalesce(NEW.company_name, NEW.trade_name, 'Cliente');

    -- Caso A: Mudança de Município ou Estado (Impacto Tributário Crítico)
    IF (OLD.city IS DISTINCT FROM NEW.city) OR (OLD.state IS DISTINCT FROM NEW.state) THEN
        v_title := 'Alerta: Mudança de Domicílio Fiscal';
        v_message := 'O cliente ' || v_client_display || ' teve seu domicílio fiscal alterado!' || chr(10) ||
                     '📍 De: ' || coalesce(OLD.city, 'Não inf.') || '/' || coalesce(OLD.state, '') || 
                     ' ➡️ Para: ' || coalesce(NEW.city, 'Não inf.') || '/' || coalesce(NEW.state, '') || chr(10) ||
                     '⚠️ Verifique inscrições municipais, estaduais e alvarás correspondentes.';

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                v_title, 
                v_message, 
                'client_address_changed', 
                '/clients?id=' || NEW.id,
                NEW.id,
                false,
                now()
            );
        END LOOP;

    -- Caso B: Atualização de logradouro, número ou CEP no mesmo município
    ELSIF (OLD.street IS DISTINCT FROM NEW.street) OR 
          (OLD.street_number IS DISTINCT FROM NEW.street_number) OR 
          (OLD.zip_code IS DISTINCT FROM NEW.zip_code) OR 
          (OLD.neighborhood IS DISTINCT FROM NEW.neighborhood) THEN

        v_title := 'Atualização de Endereço';
        v_message := 'O endereço comercial de ' || v_client_display || ' foi atualizado.' || chr(10) ||
                     '📍 ' || coalesce(NEW.street, '') || coalesce(', ' || NEW.street_number, '') || 
                     coalesce(' - ' || NEW.neighborhood, '') || coalesce(' (' || NEW.city || '/' || NEW.state || ')', '');

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = NEW.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
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

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_client_address_change ON public.clients;
CREATE TRIGGER trg_notify_client_address_change
AFTER UPDATE OF city, state, street, street_number, zip_code, neighborhood ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_address_change();
