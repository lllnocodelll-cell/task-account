-- Migration: 20260905130000_fix_client_notifications_and_cert_lifecycle.sql
-- 1. Ampliar a constraint de tipos de notificação (adicionar certificate_renewed, certificate_expired, license_renewed, license_expired)
-- 2. Blindar trigger de contatos contra falsos positivos com verificação estrita IS DISTINCT FROM e detalhamento De -> Para
-- 3. Criar trigger de renovação/alteração de validade de certificados digitais (trg_notify_client_certificate_change)
-- 4. Criar trigger de renovação/alteração de validade de licenças e alvarás (trg_notify_client_license_change)
-- 5. Atualizar check_daily_expirations() com alertas de Certificados Vencidos e Licenças Vencidas

-- ============================================================================
-- 1. ATUALIZAÇÃO DA CONSTRAINT DE TIPOS DE NOTIFICAÇÃO
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
    'license_expired'::text,
    'license_renewed'::text,
    'certificate_expired'::text,
    'certificate_renewed'::text,
    'client_created'::text,
    'task_reassigned'::text,
    'client_tax_regime_changed'::text,
    'client_legislation_added'::text,
    'client_contact_updated'::text,
    'client_address_changed'::text
  ])
);

-- ============================================================================
-- 2. BLINDAGEM E DETALHAMENTO EM CONTATOS (notify_client_contact_change)
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
    v_diffs TEXT[] := '{}';
BEGIN
    SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
    IF cl.org_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_title := 'Novo Contato Adicionado';
        v_message := 'Novo contato cadastrado para ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                     '👤 ' || NEW.name || chr(10) ||
                     '📞 ' || coalesce(NEW.phone_mobile, NEW.phone_fixed, 'Sem telefone') || ' | ✉️ ' || coalesce(NEW.email, 'Sem e-mail');
    ELSIF TG_OP = 'UPDATE' THEN
        -- VERIFICAÇÃO ESTRITA: Se nada relevante mudou, IGNORE e retorne NEW sem notificar!
        IF (OLD.name IS NOT DISTINCT FROM NEW.name) AND
           (OLD.email IS NOT DISTINCT FROM NEW.email) AND
           (OLD.phone_mobile IS NOT DISTINCT FROM NEW.phone_mobile) AND
           (OLD.phone_fixed IS NOT DISTINCT FROM NEW.phone_fixed) AND
           (OLD.is_main IS NOT DISTINCT FROM NEW.is_main) THEN
            RETURN NEW;
        END IF;

        IF OLD.name IS DISTINCT FROM NEW.name THEN
            v_diffs := array_append(v_diffs, '👤 Nome: ' || coalesce(OLD.name, 'Não inf.') || ' ➡️ ' || coalesce(NEW.name, 'Não inf.'));
        END IF;
        IF OLD.phone_mobile IS DISTINCT FROM NEW.phone_mobile THEN
            v_diffs := array_append(v_diffs, '📱 Celular: ' || coalesce(OLD.phone_mobile, 'Não inf.') || ' ➡️ ' || coalesce(NEW.phone_mobile, 'Não inf.'));
        END IF;
        IF OLD.phone_fixed IS DISTINCT FROM NEW.phone_fixed THEN
            v_diffs := array_append(v_diffs, '☎️ Fixo: ' || coalesce(OLD.phone_fixed, 'Não inf.') || ' ➡️ ' || coalesce(NEW.phone_fixed, 'Não inf.'));
        END IF;
        IF OLD.email IS DISTINCT FROM NEW.email THEN
            v_diffs := array_append(v_diffs, '✉️ E-mail: ' || coalesce(OLD.email, 'Não inf.') || ' ➡️ ' || coalesce(NEW.email, 'Não inf.'));
        END IF;
        IF OLD.is_main IS DISTINCT FROM NEW.is_main THEN
            v_diffs := array_append(v_diffs, '⭐ Contato Principal: ' || case when NEW.is_main then 'Sim' else 'Não' end);
        END IF;

        IF array_length(v_diffs, 1) IS NULL OR array_length(v_diffs, 1) = 0 THEN
            RETURN NEW;
        END IF;

        v_title := 'Contato Atualizado';
        v_message := 'O contato "' || NEW.name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foi atualizado:' || chr(10) ||
                     array_to_string(v_diffs, chr(10));
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

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_client_contact_change ON public.client_contacts;
CREATE TRIGGER trg_notify_client_contact_change
AFTER INSERT OR UPDATE ON public.client_contacts
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_contact_change();

-- ============================================================================
-- 3. RENOVAÇÃO / ALTERAÇÃO DE CERTIFICADO DIGITAL (client_certificates)
-- ============================================================================
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
        -- Se validade, modelo e signatário não mudaram, não notificar
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
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                v_title, 
                v_message, 
                'certificate_renewed', 
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

DROP TRIGGER IF EXISTS trg_notify_client_certificate_change ON public.client_certificates;
CREATE TRIGGER trg_notify_client_certificate_change
AFTER UPDATE ON public.client_certificates
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_certificate_change();

-- ============================================================================
-- 4. RENOVAÇÃO / ALTERAÇÃO DE LICENÇA OU ALVARÁ (client_licenses)
-- ============================================================================
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
        -- Se vencimento, nome e número não mudaram, ignorar
        IF (OLD.expiry_date IS NOT DISTINCT FROM NEW.expiry_date) AND
           (OLD.license_name IS NOT DISTINCT FROM NEW.license_name) AND
           (OLD.license_number IS NOT DISTINCT FROM NEW.license_number) THEN
            RETURN NEW;
        END IF;

        SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
        IF cl.org_id IS NULL THEN
            RETURN NEW;
        END IF;

        IF OLD.expiry_date IS DISTINCT FROM NEW.expiry_date THEN
            IF OLD.expiry_date IS NULL THEN
                v_title := 'Vencimento de Licença Definido';
                v_message := 'O vencimento da licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foi definido para ' || to_char(NEW.expiry_date, 'DD/MM/YYYY') || '.';
            ELSIF NEW.expiry_date > OLD.expiry_date THEN
                v_title := 'Licença / Alvará Renovado';
                v_message := 'A licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foi renovada com sucesso.' || chr(10) ||
                             '📅 Vencimento anterior: ' || to_char(OLD.expiry_date, 'DD/MM/YYYY') || chr(10) ||
                             '📅 Novo vencimento: ' || to_char(NEW.expiry_date, 'DD/MM/YYYY');
            ELSE
                v_title := 'Vencimento de Licença Alterado';
                v_message := 'O vencimento da licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foi alterado de ' || to_char(OLD.expiry_date, 'DD/MM/YYYY') || ' para ' || to_char(NEW.expiry_date, 'DD/MM/YYYY') || '.';
            END IF;
        ELSE
            v_title := 'Licença / Alvará Atualizado';
            v_message := 'Dados da licença "' || NEW.license_name || '" de ' || coalesce(cl.company_name, cl.trade_name) || ' foram atualizados.';
        END IF;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                v_title, 
                v_message, 
                'license_renewed', 
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

DROP TRIGGER IF EXISTS trg_notify_client_license_change ON public.client_licenses;
CREATE TRIGGER trg_notify_client_license_change
AFTER UPDATE ON public.client_licenses
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_license_change();

-- ============================================================================
-- 5. ATUALIZAÇÃO DA FUNÇÃO PERIÓDICA: check_daily_expirations()
--    Inclui Certificados Vencidos e Licenças Vencidas
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
    -- C. LICENÇAS E ALVARÁS EXPIRANDO (Até 30 dias para vencer)
    -- ------------------------------------------------------------------------
    FOR t IN 
        SELECT l.id, l.license_name, l.expiry_date, c.company_name, c.trade_name, c.org_id, l.client_id
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
        WHERE c.expires_at IS NOT NULL 
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
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
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
        WHERE l.expiry_date IS NOT NULL 
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
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    'Licença / Alvará Vencido', 
                    'A licença "' || t.license_name || '" do cliente ' || coalesce(t.company_name, t.trade_name) || ' venceu em ' || to_char(t.expiry_date, 'DD/MM/YYYY') || ' e encontra-se expirada.', 
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
