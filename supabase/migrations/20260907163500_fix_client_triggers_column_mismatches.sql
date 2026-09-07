-- Migration: Corrigir campos inválidos em triggers de notificações de clientes
-- 1. notify_client_address_change: corrigir OLD.number e NEW.number para OLD.street_number e NEW.street_number
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
        ELSIF (OLD.street IS DISTINCT FROM NEW.street OR OLD.street_number IS DISTINCT FROM NEW.street_number OR OLD.neighborhood IS DISTINCT FROM NEW.neighborhood) THEN
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

-- 2. notify_client_legislation_added: corrigir NEW.legislation_name para NEW.description
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
                 '📜 ' || coalesce(NEW.description, 'Sem descrição') ||
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

-- 3. notify_client_contact_change: remover referência a OLD.role / NEW.role inexistente na tabela client_contacts
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
