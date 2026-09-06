-- Correção do roteamento e vínculos das notificações de Nova Legislação Vinculada e Alteração de Regime
-- Garantir que sempre apontem para a tarefa mais recente e abram os "Dados da Tarefa"

-- 1. Atualizar notificações históricas existentes
WITH latest_tasks AS (
  SELECT DISTINCT ON (client_id) client_id, id as task_id
  FROM public.tasks
  ORDER BY client_id, created_at DESC
)
UPDATE public.notifications n
SET 
  link = '/tasks?id=' || lt.task_id,
  related_entity_id = lt.task_id
FROM latest_tasks lt
WHERE n.type IN ('client_legislation_added', 'client_tax_regime_changed')
  AND (
    n.link LIKE '/clients?id=' || lt.client_id || '%' 
    OR n.related_entity_id = lt.client_id
  );

-- 2. Atualizar trigger function para buscar tarefa por created_at DESC
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
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_task_id IS NOT NULL THEN
            v_link := '/tasks?id=' || v_task_id;
            v_related_id := v_task_id;
        ELSE
            v_link := '/tasks';
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
