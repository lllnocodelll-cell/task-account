-- 1. Criar a tabela de agendamentos por modelo
CREATE TABLE IF NOT EXISTS public.chat_message_template_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.chat_message_templates(id) ON DELETE CASCADE NOT NULL,
    trigger_type TEXT NOT NULL, -- 'day_of_month' ou 'days_before_due'
    trigger_value INTEGER NOT NULL, -- Ex: dia 5 ou 3 dias antes
    trigger_time TIME DEFAULT '09:00:00'::TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.chat_message_template_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para chat_message_template_schedules
DROP POLICY IF EXISTS "Permitir leitura de schedules por membros da org" ON public.chat_message_template_schedules;
CREATE POLICY "Permitir leitura de schedules por membros da org" ON public.chat_message_template_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_message_templates t
            WHERE t.id = template_id
            AND t.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

DROP POLICY IF EXISTS "Permitir inserção de schedules por gestores da org" ON public.chat_message_template_schedules;
CREATE POLICY "Permitir inserção de schedules por gestores da org" ON public.chat_message_template_schedules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_message_templates t
            WHERE t.id = template_id
            AND t.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

DROP POLICY IF EXISTS "Permitir atualização de schedules por gestores da org" ON public.chat_message_template_schedules;
CREATE POLICY "Permitir atualização de schedules por gestores da org" ON public.chat_message_template_schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.chat_message_templates t
            WHERE t.id = template_id
            AND t.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

DROP POLICY IF EXISTS "Permitir exclusão de schedules por gestores da org" ON public.chat_message_template_schedules;
CREATE POLICY "Permitir exclusão de schedules por gestores da org" ON public.chat_message_template_schedules
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.chat_message_templates t
            WHERE t.id = template_id
            AND t.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

-- 2. Adicionar coluna schedule_id na tabela chat_message_template_dispatches se não existir
ALTER TABLE public.chat_message_template_dispatches
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.chat_message_template_schedules(id) ON DELETE SET NULL;

-- 3. Migrar agendamentos legados de chat_message_templates para chat_message_template_schedules
INSERT INTO public.chat_message_template_schedules (template_id, trigger_type, trigger_value, trigger_time)
SELECT id, trigger_type, trigger_value, COALESCE(trigger_time, '09:00:00'::TIME)
FROM public.chat_message_templates
WHERE is_automated = true
  AND trigger_type IS NOT NULL
  AND trigger_type != 'manual'
  AND trigger_value IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.chat_message_template_schedules s WHERE s.template_id = chat_message_templates.id
  );

-- 4. Atualizar a função PL/pgSQL para processar múltiplos agendamentos por modelo
CREATE OR REPLACE FUNCTION public.process_automated_chat_templates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now_local TIMESTAMP;
    v_hour_int INTEGER;
    v_day_int INTEGER;
    v_comp TEXT;
    t RECORD;
    c RECORD;
    v_regime TEXT;
    v_profile_id UUID;
    v_profile_name TEXT;
    v_channel_id UUID;
    v_sector_id UUID;
    v_sector_name TEXT;
    v_task_name TEXT;
    v_task_due_date DATE;
    v_msg_text TEXT;
    v_due_str TEXT;
    v_member_record RECORD;
    v_member_contact_name TEXT;
    v_allowed_client BOOLEAN;
BEGIN
    -- Ajustar o horário corrente para a timezone de Brasília (UTC-3)
    v_now_local := timezone('America/Sao_Paulo', now());
    v_hour_int := EXTRACT(HOUR FROM v_now_local);
    v_day_int := EXTRACT(DAY FROM v_now_local);
    v_comp := to_char(v_now_local, 'YYYY-MM');

    -- Iterar sobre os agendamentos cadastrados onde o modelo tem is_automated = true e o horário corrente coincide
    FOR t IN 
        SELECT 
            s.id AS schedule_id,
            s.trigger_type,
            s.trigger_value,
            s.trigger_time,
            tmpl.*
        FROM public.chat_message_template_schedules s
        JOIN public.chat_message_templates tmpl ON tmpl.id = s.template_id
        WHERE tmpl.is_automated = true
        AND EXTRACT(HOUR FROM s.trigger_time) = v_hour_int
    LOOP
        
        -- Descobrir o primeiro setor vinculado ao template para associação ao canal
        IF t.target_sectors IS NOT NULL AND array_length(t.target_sectors, 1) > 0 THEN
            v_sector_id := t.target_sectors[1];
            SELECT name INTO v_sector_name FROM public.sectors WHERE id = v_sector_id;
        ELSE
            v_sector_id := NULL;
            v_sector_name := 'Geral';
        END IF;

        -- Buscar o nome da tarefa de referência, se houver
        IF t.reference_task_type_id IS NOT NULL THEN
            SELECT name INTO v_task_name FROM public.task_types WHERE id = t.reference_task_type_id;
        ELSE
            v_task_name := NULL;
        END IF;

        -- Iterar por todos os clientes ativos pertencentes à organização do template
        FOR c IN 
            SELECT id, company_name, trade_name, admin_partner_name FROM public.clients 
            WHERE org_id = t.org_id 
            AND status = 'Ativo'
        LOOP
            v_allowed_client := true;

            -- A. Filtro por clientes específicos (se configurado, ignora filtros genéricos)
            IF t.target_client_ids IS NOT NULL AND array_length(t.target_client_ids, 1) > 0 THEN
                IF NOT (c.id = ANY(t.target_client_ids)) THEN
                    v_allowed_client := false;
                END IF;
            ELSE
                -- B. Filtro por regimes tributários
                IF t.target_tax_regimes IS NOT NULL AND array_length(t.target_tax_regimes, 1) > 0 THEN
                    SELECT regime INTO v_regime FROM public.client_tax_regime_history 
                    WHERE client_id = c.id AND end_date IS NULL LIMIT 1;

                    IF v_regime IS NULL OR NOT (v_regime = ANY(t.target_tax_regimes)) THEN
                        v_allowed_client := false;
                    END IF;
                END IF;

                -- C. Filtro por setores atendidos
                IF v_allowed_client AND t.target_sectors IS NOT NULL AND array_length(t.target_sectors, 1) > 0 THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM public.members 
                        WHERE org_id = t.org_id 
                        AND sector_id = ANY(t.target_sectors) 
                        AND (client_id = c.id OR c.id = ANY(client_ids))
                    ) THEN
                        v_allowed_client := false;
                    END IF;
                END IF;
            END IF;

            -- D. Filtro por regras de agendamento e tarefa vinculada
            IF v_allowed_client THEN
                IF t.trigger_type = 'day_of_month' THEN
                    -- Verificar se o dia atual do mês confere
                    IF v_day_int != t.trigger_value THEN
                        v_allowed_client := false;
                    END IF;
                ELSIF t.trigger_type = 'days_before_due' THEN
                    -- Verificar se existe uma tarefa ativa vinculada vencendo em X dias
                    IF v_task_name IS NOT NULL THEN
                        SELECT due_date INTO v_task_due_date FROM public.tasks 
                        WHERE client_id = c.id 
                        AND task_name = v_task_name
                        AND due_date = (v_now_local::date + t.trigger_value)
                        LIMIT 1;

                        IF v_task_due_date IS NULL THEN
                            v_allowed_client := false;
                        END IF;
                    ELSE
                        v_allowed_client := false;
                    END IF;
                END IF;
            END IF;

            -- E. Evitar reenvio do mesmo agendamento para a mesma empresa na mesma competência
            IF v_allowed_client THEN
                IF EXISTS (
                    SELECT 1 FROM public.chat_message_template_dispatches 
                    WHERE template_id = t.id 
                    AND client_id = c.id 
                    AND competence = v_comp
                    AND schedule_id = t.schedule_id
                ) THEN
                    v_allowed_client := false;
                END IF;
            END IF;

            -- F. Se aprovado, realizar o disparo da mensagem no chat
            IF v_allowed_client THEN
                -- Identificar o perfil emissor da organização
                SELECT id, full_name INTO v_profile_id, v_profile_name 
                FROM public.profiles 
                WHERE org_id = t.org_id AND role = 'gestor' 
                ORDER BY created_at ASC LIMIT 1;

                IF v_profile_id IS NULL THEN
                    SELECT id, full_name INTO v_profile_id, v_profile_name 
                    FROM public.profiles 
                    WHERE org_id = t.org_id LIMIT 1;
                END IF;

                -- Obter responsável direto se houver
                SELECT first_name, last_name INTO v_member_record
                FROM public.members 
                WHERE org_id = t.org_id 
                AND (client_id = c.id OR c.id = ANY(client_ids))
                LIMIT 1;

                IF v_member_record.first_name IS NOT NULL THEN
                    v_member_contact_name := v_member_record.first_name || ' ' || COALESCE(v_member_record.last_name, '');
                ELSE
                    v_member_contact_name := 'Atendimento';
                END IF;

                -- Localizar ou criar o canal de suporte com o cliente
                SELECT id INTO v_channel_id FROM public.chat_channels 
                WHERE name ILIKE '%' || c.company_name || '%' 
                LIMIT 1;

                IF v_channel_id IS NULL THEN
                    INSERT INTO public.chat_channels (name, type, status, support_status, sector_id, created_by)
                    VALUES (c.company_name, 'support', 'open', 'em_atendimento', v_sector_id, v_profile_id)
                    RETURNING id INTO v_channel_id;

                    IF v_profile_id IS NOT NULL THEN
                        INSERT INTO public.chat_channel_members (channel_id, user_id, role)
                        VALUES (v_channel_id, v_profile_id, 'admin')
                        ON CONFLICT DO NOTHING;
                    END IF;
                END IF;

                -- Substituir placeholders na mensagem
                v_msg_text := t.content;
                v_msg_text := replace(v_msg_text, '{nome_cliente}', COALESCE(c.trade_name, c.company_name));
                v_msg_text := replace(v_msg_text, '{razao_social}', c.company_name);
                v_msg_text := replace(v_msg_text, '{socio_admin}', COALESCE(c.admin_partner_name, 'Cliente'));
                v_msg_text := replace(v_msg_text, '{responsavel}', v_member_contact_name);
                v_msg_text := replace(v_msg_text, '{setor}', v_sector_name);
                v_msg_text := replace(v_msg_text, '{competencia}', v_comp);

                IF v_task_name IS NOT NULL THEN
                    v_msg_text := replace(v_msg_text, '{nome_tarefa}', v_task_name);
                END IF;

                IF v_task_due_date IS NOT NULL THEN
                    v_due_str := to_char(v_task_due_date, 'DD/MM/YYYY');
                    v_msg_text := replace(v_msg_text, '{vencimento_padrao}', v_due_str);
                    v_msg_text := replace(v_msg_text, '{vencimento_tarefa}', v_due_str);
                ELSE
                    v_msg_text := replace(v_msg_text, '{vencimento_padrao}', 'Conforme calendário fiscal');
                    v_msg_text := replace(v_msg_text, '{vencimento_tarefa}', 'Conforme calendário fiscal');
                END IF;

                -- Se houver header_image_url no template, prefixar como markdown
                IF t.header_image_url IS NOT NULL AND trim(t.header_image_url) != '' THEN
                    v_msg_text := '![](' || trim(t.header_image_url) || ')' || E'\n\n' || v_msg_text;
                END IF;

                -- Inserir a mensagem no chat_messages
                INSERT INTO public.chat_messages (
                    channel_id, 
                    sender_id, 
                    text, 
                    is_me, 
                    is_system, 
                    status
                ) VALUES (
                    v_channel_id, 
                    COALESCE(v_profile_id, gen_random_uuid()), 
                    v_msg_text, 
                    true, 
                    false, 
                    'sent'
                );

                -- Registrar o disparo na tabela chat_message_template_dispatches
                INSERT INTO public.chat_message_template_dispatches (
                    template_id, 
                    client_id, 
                    competence,
                    schedule_id
                ) VALUES (
                    t.id, 
                    c.id, 
                    v_comp,
                    t.schedule_id
                );

            END IF;

        END LOOP;

    END LOOP;
END;
$$;
