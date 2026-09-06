-- ============================================================================
-- Migration: Atualizar triggers de Regime Tributário e Legislação para
-- associar a tarefa mais recente do cliente no link de notificação
-- ============================================================================

-- 1. ALTERAÇÃO DE REGIME TRIBUTÁRIO (client_tax_regime_changed)
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
    v_task_id UUID;
    v_link TEXT;
    v_related_id UUID;
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

            -- Buscar a tarefa mais recente vinculada a este cliente para direcionar aos "Dados da Tarefa"
            SELECT id INTO v_task_id
            FROM public.tasks
            WHERE client_id = NEW.client_id
            ORDER BY competence DESC, created_at DESC
            LIMIT 1;

            IF v_task_id IS NOT NULL THEN
                v_link := '/tasks?id=' || v_task_id;
                v_related_id := v_task_id;
            ELSE
                v_link := '/clients?id=' || NEW.client_id;
                v_related_id := NEW.client_id;
            END IF;

            FOR gestor IN 
                SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
            LOOP
                INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
                VALUES (
                    gestor.id, 
                    'Regime Tributário Alterado', 
                    v_message, 
                    'client_tax_regime_changed', 
                    v_link,
                    v_related_id,
                    false,
                    now()
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 2. NOVA LEGISLAÇÃO VINCULADA (client_legislation_added)
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
    v_task_id UUID;
    v_link TEXT;
    v_related_id UUID;
BEGIN
    SELECT org_id, company_name, trade_name INTO cl FROM public.clients WHERE id = NEW.client_id;
    IF cl.org_id IS NOT NULL THEN
        v_message := 'Nova legislação vinculada ao cliente ' || coalesce(cl.company_name, cl.trade_name) || '.' || chr(10) ||
                     '📜 ' || NEW.description ||
                     case when (NEW.status is not null and NEW.status != '') then chr(10) || '⚖️ Status: ' || NEW.status else '' end;

        -- Buscar a tarefa mais recente vinculada a este cliente para direcionar aos "Dados da Tarefa"
        SELECT id INTO v_task_id
        FROM public.tasks
        WHERE client_id = NEW.client_id
        ORDER BY competence DESC, created_at DESC
        LIMIT 1;

        IF v_task_id IS NOT NULL THEN
            v_link := '/tasks?id=' || v_task_id;
            v_related_id := v_task_id;
        ELSE
            v_link := '/clients?id=' || NEW.client_id;
            v_related_id := NEW.client_id;
        END IF;

        FOR gestor IN 
            SELECT id FROM public.profiles WHERE org_id = cl.org_id AND role = 'gestor'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_id, read, created_at)
            VALUES (
                gestor.id, 
                'Nova Legislação Vinculada', 
                v_message, 
                'client_legislation_added', 
                v_link,
                v_related_id,
                false,
                now()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;
