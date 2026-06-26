-- Atualizar a função PL/pgSQL para processamento de templates automáticos incluindo suporte aos novos placeholders
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
    v_regime_label TEXT;
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
    v_due_day INTEGER;
    v_default_due_str TEXT;
BEGIN
    -- Ajustar o horário corrente para a timezone de Brasília (UTC-3)
    v_now_local := timezone('America/Sao_Paulo', now());
    v_hour_int := EXTRACT(HOUR FROM v_now_local);
    v_day_int := EXTRACT(DAY FROM v_now_local);
    v_comp := to_char(v_now_local - interval '1 month', 'YYYY-MM');

    -- Iterar sobre os templates que possuem disparo automático ativo e que correspondam ao horário corrente
    FOR t IN 
        SELECT * FROM public.chat_message_templates 
        WHERE is_automated = true
        AND EXTRACT(HOUR FROM trigger_time) = v_hour_int
    LOOP
        
        -- Descobrir o primeiro setor vinculado ao template para associação ao canal
        IF t.target_sectors IS NOT NULL AND array_length(t.target_sectors, 1) > 0 THEN
            v_sector_id := t.target_sectors[1];
            SELECT name INTO v_sector_name FROM public.sectors WHERE id = v_sector_id;
        ELSE
            v_sector_id := NULL;
            v_sector_name := 'Geral';
        END IF;

        -- Buscar o nome e dia de vencimento da tarefa de referência, se houver
        IF t.reference_task_type_id IS NOT NULL THEN
            SELECT name, due_day INTO v_task_name, v_due_day FROM public.task_types WHERE id = t.reference_task_type_id;
        ELSE
            v_task_name := NULL;
            v_due_day := NULL;
        END IF;

        -- Iterar por todos os clientes ativos pertencentes à organização do template (buscando também document e novos placeholders)
        FOR c IN 
            SELECT id, company_name, trade_name, admin_partner_name, document, code, city, state, segment FROM public.clients 
            WHERE org_id = t.org_id 
            AND status = 'Ativo'
        LOOP
            v_allowed_client := true;

            -- A. Filtro por clientes específicos (se configurado, limita a estes clientes)
            IF t.target_client_ids IS NOT NULL AND array_length(t.target_client_ids, 1) > 0 THEN
                IF NOT (c.id = ANY(t.target_client_ids)) THEN
                    v_allowed_client := false;
                END IF;
            END IF;

            -- [Filtros de Regimes Tributários e Setores foram removidos da lógica ativa por solicitação do usuário]

            -- B. Filtro por regras de agendamento e tarefa vinculada
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

            -- C. Evitar reenvio do mesmo template na mesma competência de mês
            IF v_allowed_client THEN
                IF EXISTS (
                    SELECT 1 FROM public.chat_message_template_dispatches 
                    WHERE template_id = t.id 
                    AND client_id = c.id 
                    AND competence = v_comp
                ) THEN
                    v_allowed_client := false;
                END IF;
            END IF;

            -- Se o cliente for elegível, processar o disparo
            IF v_allowed_client THEN
                
                -- 1. Localizar a primeira conta de login do cliente
                SELECT id, full_name INTO v_profile_id, v_profile_name FROM public.profiles 
                WHERE (client_id = c.id OR c.id = ANY(client_ids)) 
                AND role = 'cliente' 
                LIMIT 1;

                IF v_profile_id IS NOT NULL THEN
                    
                    -- Tentar obter dados do membro (nome do contato do convite)
                    SELECT first_name, last_name INTO v_member_record FROM public.members
                    WHERE (client_id = c.id OR c.id = ANY(client_ids))
                    AND role = 'cliente'
                    LIMIT 1;

                    IF FOUND THEN
                        v_member_contact_name := v_member_record.first_name || ' ' || coalesce(v_member_record.last_name, '');
                    ELSE
                        v_member_contact_name := coalesce(v_profile_name, coalesce(c.admin_partner_name, c.company_name));
                    END IF;

                    -- Obter o regime tributário atual
                    SELECT regime INTO v_regime 
                    FROM public.client_tax_regime_history 
                    WHERE client_id = c.id AND end_date IS NULL 
                    LIMIT 1;

                    IF v_regime = 'simples' THEN v_regime_label := 'Simples Nacional';
                    ELSIF v_regime = 'simples_iva' THEN v_regime_label := 'Simples IVA Dual';
                    ELSIF v_regime = 'presumido' THEN v_regime_label := 'Lucro Presumido';
                    ELSIF v_regime = 'presumido_imune' THEN v_regime_label := 'Presumido Imune-Isento';
                    ELSIF v_regime = 'real_trimestral' THEN v_regime_label := 'Lucro Real Trimestral';
                    ELSIF v_regime = 'real_anual' THEN v_regime_label := 'Lucro Real Anual';
                    ELSIF v_regime = 'real_imune' THEN v_regime_label := 'Lucro Real Imune-Isento';
                    ELSIF v_regime = 'arbitrado' THEN v_regime_label := 'Lucro Arbitrado';
                    ELSIF v_regime = 'mei' THEN v_regime_label := 'Microempreendedor (MEI)';
                    ELSE v_regime_label := 'Não Definido';
                    END IF;

                    -- 2. Resolver placeholders no texto
                    v_msg_text := t.content;
                    v_msg_text := replace(v_msg_text, '{nome_contato}', v_member_contact_name);
                    v_msg_text := replace(v_msg_text, '{razao_social}', c.company_name);
                    v_msg_text := replace(v_msg_text, '{nome_fantasia}', coalesce(c.trade_name, c.company_name));
                    v_msg_text := replace(v_msg_text, '{mes_competencia}', to_char(v_now_local - interval '1 month', 'MM/YYYY'));
                    v_msg_text := replace(v_msg_text, '{cnpj_empresa}', coalesce(c.document, 'Não Informado'));
                    v_msg_text := replace(v_msg_text, '{regime_tributario}', v_regime_label);
                    v_msg_text := replace(v_msg_text, '{link_portal}', 'https://portal.taskaccount.com.br');
                    v_msg_text := replace(v_msg_text, '{codigo_cliente}', coalesce(c.code, 'Não Informado'));
                    v_msg_text := replace(v_msg_text, '{cidade_empresa}', coalesce(c.city, 'Não Informado'));
                    v_msg_text := replace(v_msg_text, '{estado_empresa}', coalesce(c.state, 'Não Informado'));
                    v_msg_text := replace(v_msg_text, '{segmento_empresa}', coalesce(c.segment, 'Não Informado'));

                    -- Calcular e resolver vencimento padrão com base no Tipo de Tarefa de Referência
                    v_default_due_str := to_char(make_date(EXTRACT(YEAR FROM v_now_local)::integer, EXTRACT(MONTH FROM v_now_local)::integer, coalesce(v_due_day, 20)), 'DD/MM/YYYY');
                    v_msg_text := replace(v_msg_text, '{vencimento_padrao}', v_default_due_str);
                    v_msg_text := replace(v_msg_text, '{vencimento_competencia}', v_default_due_str);

                    -- Placeholders específicos de tarefas
                    IF v_task_name IS NOT NULL THEN
                        v_msg_text := replace(v_msg_text, '{nome_tarefa}', v_task_name);
                        
                        -- Se for por vencimento, já temos a v_task_due_date, senão busca do banco
                        IF v_task_due_date IS NULL THEN
                            SELECT due_date INTO v_task_due_date FROM public.tasks 
                            WHERE client_id = c.id 
                            AND task_name = v_task_name
                            ORDER BY due_date DESC 
                            LIMIT 1;
                        END IF;

                        IF v_task_due_date IS NOT NULL THEN
                            v_due_str := to_char(v_task_due_date, 'DD/MM/YYYY');
                        ELSE
                            v_due_str := 'Data limite';
                        END IF;
                        v_msg_text := replace(v_msg_text, '{vencimento_tarefa}', v_due_str);
                    ELSE
                        v_msg_text := replace(v_msg_text, '{nome_tarefa}', 'Obrigação Fiscal');
                        v_msg_text := replace(v_msg_text, '{vencimento_tarefa}', 'Data limite');
                    END IF;

                    -- 3. Localizar ou criar o canal de suporte
                    v_channel_id := NULL;
                    
                    SELECT ch.id INTO v_channel_id 
                    FROM public.chat_channels ch 
                    JOIN public.chat_channel_members chm ON ch.id = chm.channel_id 
                    WHERE chm.user_id = v_profile_id 
                    AND ch.type = 'support' 
                    AND (v_sector_id IS NULL OR ch.sector_id = v_sector_id)
                    LIMIT 1;

                    IF v_channel_id IS NULL AND v_sector_id IS NULL THEN
                        -- Pega qualquer canal de suporte ativo do cliente
                        SELECT ch.id INTO v_channel_id 
                        FROM public.chat_channels ch 
                        JOIN public.chat_channel_members chm ON ch.id = chm.channel_id 
                        WHERE chm.user_id = v_profile_id 
                        AND ch.type = 'support' 
                        LIMIT 1;
                    END IF;

                    -- Se o canal ainda for nulo, cria um novo
                    IF v_channel_id IS NULL THEN
                        INSERT INTO public.chat_channels (name, type, created_by, status, support_status, sector_id, is_notification)
                        VALUES (
                            'Atendimento - ' || v_member_contact_name || ' (' || v_sector_name || ')',
                            'support',
                            t.created_by,
                            'open',
                            'pending',
                            v_sector_id,
                            true
                        )
                        RETURNING id INTO v_channel_id;

                        -- Vincular cliente como membro e operador como admin
                        INSERT INTO public.chat_channel_members (channel_id, user_id, role)
                        VALUES 
                            (v_channel_id, v_profile_id, 'member'),
                            (v_channel_id, t.created_by, 'admin');
                    END IF;

                    -- 4. Inserir a mensagem de chat
                    INSERT INTO public.chat_messages (channel_id, sender_id, text, status)
                    VALUES (v_channel_id, t.created_by, v_msg_text, 'sent');

                    -- 5. Registrar o log de envio para controle de concorrência e reenvios
                    INSERT INTO public.chat_message_template_dispatches (template_id, client_id, competence)
                    VALUES (t.id, c.id, v_comp);

                END IF;

            END IF;
        END LOOP;
    END LOOP;
END;
$$;
