-- Migration: 20260830150000_fix_cron_notification_channel_and_attachments.sql
-- Description: Garantir que disparos automáticos via pg_cron sejam vinculados a canais de notificação (is_notification = true) e que a imagem de cabeçalho seja enviada via anexos estruturados.

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
    v_comp_label TEXT;
    t RECORD;
    c RECORD;
    v_regime TEXT;
    v_regime_label TEXT;
    v_profile_id UUID;
    v_profile_name TEXT;
    v_channel_id UUID;
    v_channel_name TEXT;
    v_sector_id UUID;
    v_sector_name TEXT;
    v_task_name TEXT;
    v_task_due_date DATE;
    v_msg_text TEXT;
    v_due_str TEXT;
    v_member_first_name TEXT;
    v_member_last_name TEXT;
    v_member_contact_name TEXT;
    v_client_first_name TEXT;
    v_client_last_name TEXT;
    v_contact_name TEXT;
    v_client_profile RECORD;
    v_allowed_client BOOLEAN;
    v_has_header BOOLEAN;
    v_due_day INTEGER;
BEGIN
    -- Ajustar o horário corrente para a timezone de Brasília (UTC-3)
    v_now_local := timezone('America/Sao_Paulo', now());
    v_hour_int := EXTRACT(HOUR FROM v_now_local);
    v_day_int := EXTRACT(DAY FROM v_now_local);
    
    -- Ex: 2026-08
    v_comp := to_char(v_now_local, 'YYYY-MM');
    
    -- Ex: 07/2026 (Competência é o mês anterior ao envio)
    v_comp_label := to_char(v_now_local - interval '1 month', 'MM/YYYY');

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
            SELECT id, company_name, trade_name, admin_partner_name, document, code, city, state, segment FROM public.clients 
            WHERE org_id = t.org_id 
            AND status = 'Ativo'
        LOOP
            v_allowed_client := true;

            -- A. Filtro por clientes específicos (se configurado, ignora filtros genéricos)
            IF t.target_client_ids IS NOT NULL AND array_length(t.target_client_ids, 1) > 0 THEN
                IF NOT (c.id = ANY(t.target_client_ids)) THEN
                    v_allowed_client := false;
                END IF;
            END IF;

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
                        AND due_date::date = (v_now_local::date + t.trigger_value)
                        LIMIT 1;

                        IF v_task_due_date IS NULL THEN
                            v_allowed_client := false;
                        END IF;
                    ELSE
                        v_allowed_client := false;
                    END IF;
                END IF;
            END IF;

            -- C. Se aprovado, realizar o disparo para cada perfil do cliente
            IF v_allowed_client THEN
                -- Identificar o perfil emissor da organização (Gestor)
                SELECT id, full_name INTO v_profile_id, v_profile_name 
                FROM public.profiles 
                WHERE org_id = t.org_id AND role = 'gestor' 
                ORDER BY created_at ASC LIMIT 1;

                IF v_profile_id IS NULL THEN
                    SELECT id, full_name INTO v_profile_id, v_profile_name 
                    FROM public.profiles 
                    WHERE org_id = t.org_id LIMIT 1;
                END IF;

                -- Obter responsável direto se houver (para a tag {responsavel})
                SELECT first_name, last_name INTO v_member_first_name, v_member_last_name
                FROM public.members 
                WHERE org_id = t.org_id 
                AND (client_id = c.id OR c.id = ANY(client_ids))
                LIMIT 1;

                IF v_member_first_name IS NOT NULL THEN
                    v_member_contact_name := v_member_first_name || ' ' || COALESCE(v_member_last_name, '');
                ELSE
                    v_member_contact_name := 'Atendimento';
                END IF;

                -- Buscar regime tributário atual
                SELECT regime INTO v_regime FROM public.client_tax_regime_history 
                WHERE client_id = c.id AND end_date IS NULL LIMIT 1;

                v_regime_label := CASE 
                    WHEN v_regime = 'simples' THEN 'Simples Nacional'
                    WHEN v_regime = 'simples_iva' THEN 'Simples Nacional c/ IVA'
                    WHEN v_regime = 'lucro_presumido' THEN 'Lucro Presumido'
                    WHEN v_regime = 'lucro_real' THEN 'Lucro Real'
                    WHEN v_regime = 'real_trimestral' THEN 'Lucro Real Trimestral'
                    ELSE 'Não Definido'
                END;

                -- Loop por todos os perfis de usuários do tipo "cliente" vinculados a esta empresa
                FOR v_client_profile IN 
                    SELECT id, full_name FROM public.profiles 
                    WHERE role = 'cliente' 
                    AND (client_id = c.id OR c.id = ANY(client_ids))
                LOOP
                    -- Obter o nome de contato baseado no perfil
                    SELECT first_name, last_name INTO v_client_first_name, v_client_last_name
                    FROM public.members 
                    WHERE role = 'cliente'
                    AND (client_id = c.id OR c.id = ANY(client_ids))
                    AND (first_name IS NOT NULL AND v_client_profile.full_name LIKE '%' || first_name || '%')
                    LIMIT 1;

                    IF v_client_first_name IS NOT NULL THEN
                        v_contact_name := v_client_first_name || ' ' || COALESCE(v_client_last_name, '');
                    ELSE
                        v_contact_name := COALESCE(v_client_profile.full_name, c.admin_partner_name, c.company_name);
                    END IF;

                    -- Evitar reenvio do mesmo agendamento para o mesmo perfil na mesma competência
                    IF NOT EXISTS (
                        SELECT 1 FROM public.chat_message_template_dispatches 
                        WHERE template_id = t.id 
                        AND client_id = c.id 
                        AND competence = v_comp
                        AND schedule_id = t.schedule_id
                    ) THEN

                        -- Localizar ou criar o canal de NOTIFICAÇÃO exclusivo para este perfil
                        SELECT ch.id INTO v_channel_id FROM public.chat_channels ch
                        JOIN public.chat_channel_members chm ON chm.channel_id = ch.id
                        WHERE ch.is_notification = true
                        AND chm.user_id = v_client_profile.id
                        LIMIT 1;

                        IF v_channel_id IS NULL THEN
                            v_channel_name := 'Atendimento - ' || v_contact_name || ' (' || v_sector_name || ')';

                            INSERT INTO public.chat_channels (name, type, status, support_status, sector_id, created_by, is_notification)
                            VALUES (v_channel_name, 'support', 'open', 'pending', v_sector_id, v_profile_id, true)
                            RETURNING id INTO v_channel_id;

                            -- Vincular membros (cliente + gestor)
                            INSERT INTO public.chat_channel_members (channel_id, user_id, role)
                            VALUES (v_channel_id, v_client_profile.id, 'member')
                            ON CONFLICT DO NOTHING;

                            IF v_profile_id IS NOT NULL THEN
                                INSERT INTO public.chat_channel_members (channel_id, user_id, role)
                                VALUES (v_channel_id, v_profile_id, 'admin')
                                ON CONFLICT DO NOTHING;
                            END IF;
                        END IF;

                        -- Substituir placeholders na mensagem (Paridade com Settings.tsx)
                        v_msg_text := t.content;
                        v_msg_text := replace(v_msg_text, '{nome_contato}', v_contact_name);
                        v_msg_text := replace(v_msg_text, '{razao_social}', c.company_name);
                        v_msg_text := replace(v_msg_text, '{nome_fantasia}', COALESCE(c.trade_name, c.company_name));
                        v_msg_text := replace(v_msg_text, '{mes_competencia}', v_comp_label);
                        v_msg_text := replace(v_msg_text, '{cnpj_empresa}', COALESCE(c.document, 'Não Informado'));
                        v_msg_text := replace(v_msg_text, '{regime_tributario}', v_regime_label);
                        v_msg_text := replace(v_msg_text, '{link_portal}', 'https://portal.taskaccount.com.br');
                        v_msg_text := replace(v_msg_text, '{codigo_cliente}', COALESCE(c.code, 'Não Informado'));
                        v_msg_text := replace(v_msg_text, '{cidade_empresa}', COALESCE(c.city, 'Não Informado'));
                        v_msg_text := replace(v_msg_text, '{estado_empresa}', COALESCE(c.state, 'Não Informado'));
                        v_msg_text := replace(v_msg_text, '{segmento_empresa}', COALESCE(c.segment, 'Não Informado'));
                        v_msg_text := replace(v_msg_text, '{responsavel}', v_member_contact_name);
                        v_msg_text := replace(v_msg_text, '{setor}', v_sector_name);

                        -- Substituir placeholders de tarefa
                        IF v_task_name IS NOT NULL THEN
                            v_msg_text := replace(v_msg_text, '{nome_tarefa}', v_task_name);
                            
                            -- Se houver tarefa correspondente, buscar data de vencimento
                            SELECT due_date INTO v_task_due_date FROM public.tasks 
                            WHERE client_id = c.id AND task_name = v_task_name
                            ORDER BY due_date DESC LIMIT 1;

                            IF v_task_due_date IS NOT NULL THEN
                                v_due_str := to_char(v_task_due_date, 'DD/MM/YYYY');
                                v_msg_text := replace(v_msg_text, '{vencimento_tarefa}', v_due_str);
                            ELSE
                                v_msg_text := replace(v_msg_text, '{vencimento_tarefa}', 'Data limite');
                            END IF;
                        ELSE
                            v_msg_text := replace(v_msg_text, '{nome_tarefa}', 'Obrigação Fiscal');
                            v_msg_text := replace(v_msg_text, '{vencimento_tarefa}', 'Data limite');
                        END IF;

                        -- Vencimento Padrão (Fallback da tarefa de referência)
                        SELECT COALESCE(due_day, 20) INTO v_due_day 
                        FROM public.task_types WHERE id = t.reference_task_type_id;
                        
                        IF v_due_day IS NULL THEN
                            v_due_day := 20;
                        END IF;
                        
                        v_due_str := to_char(make_date(extract(year from v_now_local)::int, extract(month from v_now_local)::int, v_due_day), 'DD/MM/YYYY');

                        v_msg_text := replace(v_msg_text, '{vencimento_padrao}', v_due_str);
                        v_msg_text := replace(v_msg_text, '{vencimento_competencia}', v_due_str);

                        -- Verificar imagem de cabeçalho
                        v_has_header := (t.header_image_url IS NOT NULL AND trim(t.header_image_url) != '');

                        -- Inserir a mensagem no chat_messages com suporte a anexos estruturados
                        INSERT INTO public.chat_messages (
                            channel_id, 
                            sender_id, 
                            text, 
                            is_me, 
                            is_system, 
                            status,
                            attachment_url,
                            file_name,
                            file_type,
                            attachments
                        ) VALUES (
                            v_channel_id, 
                            COALESCE(v_profile_id, gen_random_uuid()), 
                            v_msg_text, 
                            true, 
                            false, 
                            'sent',
                            CASE WHEN v_has_header THEN trim(t.header_image_url) ELSE NULL END,
                            CASE WHEN v_has_header THEN 'Cabeçalho do Modelo' ELSE NULL END,
                            CASE WHEN v_has_header THEN 'image/png' ELSE NULL END,
                            CASE WHEN v_has_header THEN 
                                jsonb_build_array(jsonb_build_object('name', 'Cabeçalho do Modelo', 'url', trim(t.header_image_url), 'type', 'image'))
                            ELSE NULL END
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

            END IF;
        END LOOP;

    END LOOP;
END;
$$;
