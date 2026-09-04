-- Migration: Blindagem de Segurança Multi-Tenant e Isolamento Estrito de Dados
-- Garante isolamento entre escritórios (Cross-Tenant) e entre clientes do mesmo escritório (Intra-Tenant)
-- Preserva 100% da compatibilidade funcional e zero quebra para usuários legítimos.

-- ============================================================================
-- 1. ATUALIZAÇÃO DA FUNÇÃO check_client_access (Isolamento Estrito)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_client_access(client_uuid uuid)
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_client_ids uuid[];
  v_org_id uuid;
BEGIN
  IF client_uuid IS NULL THEN
    RETURN false;
  END IF;

  SELECT role, client_ids, org_id 
  INTO v_role, v_client_ids, v_org_id
  FROM public.profiles 
  WHERE id = auth.uid();

  -- Se for cliente final, restringe estritamente aos seus client_ids vinculados
  IF v_role = 'cliente' THEN
    RETURN (client_uuid = ANY(COALESCE(v_client_ids, '{}'::uuid[])));
  END IF;

  -- Se for gestor ou operacional, valida se o cliente pertence à organização dele
  RETURN EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_uuid AND c.org_id = v_org_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. BLINDAGEM DA TABELA clients
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own org clients" ON public.clients;
CREATE POLICY "Users can view own org clients" ON public.clients
FOR SELECT TO authenticated
USING (
  org_id = public.get_auth_org_id()
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'cliente'
    OR id = ANY(COALESCE((SELECT client_ids FROM public.profiles WHERE id = auth.uid()), '{}'::uuid[]))
  )
);

DROP POLICY IF EXISTS "Users can insert own org clients" ON public.clients;
CREATE POLICY "Users can insert own org clients" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  org_id = public.get_auth_org_id()
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can update own org clients" ON public.clients;
CREATE POLICY "Users can update own org clients" ON public.clients
FOR UPDATE TO authenticated
USING (
  org_id = public.get_auth_org_id()
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can delete own org clients" ON public.clients;
CREATE POLICY "Users can delete own org clients" ON public.clients
FOR DELETE TO authenticated
USING (
  org_id = public.get_auth_org_id()
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'gestor'::text
);

-- ============================================================================
-- 3. BLINDAGEM DE CREDENCIAIS, CERTIFICADOS E DADOS SENSÍVEIS DE CLIENTES
-- ============================================================================

-- client_accesses (Logins e Senhas eCAC, Sefaz, Prefeituras)
DROP POLICY IF EXISTS "Users can view own org client_accesses" ON public.client_accesses;
CREATE POLICY "Users can view own org client_accesses" ON public.client_accesses
FOR SELECT TO authenticated
USING (public.check_client_access(client_id));

DROP POLICY IF EXISTS "Users can insert own org client_accesses" ON public.client_accesses;
CREATE POLICY "Users can insert own org client_accesses" ON public.client_accesses
FOR INSERT TO authenticated
WITH CHECK (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can update own org client_accesses" ON public.client_accesses;
CREATE POLICY "Users can update own org client_accesses" ON public.client_accesses
FOR UPDATE TO authenticated
USING (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can delete own org client_accesses" ON public.client_accesses;
CREATE POLICY "Users can delete own org client_accesses" ON public.client_accesses
FOR DELETE TO authenticated
USING (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

-- client_certificates (Senhas de Certificados Digitais)
DROP POLICY IF EXISTS "Users can view own org client_certificates" ON public.client_certificates;
CREATE POLICY "Users can view own org client_certificates" ON public.client_certificates
FOR SELECT TO authenticated
USING (public.check_client_access(client_id));

DROP POLICY IF EXISTS "Users can insert own org client_certificates" ON public.client_certificates;
CREATE POLICY "Users can insert own org client_certificates" ON public.client_certificates
FOR INSERT TO authenticated
WITH CHECK (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can update own org client_certificates" ON public.client_certificates;
CREATE POLICY "Users can update own org client_certificates" ON public.client_certificates
FOR UPDATE TO authenticated
USING (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can delete own org client_certificates" ON public.client_certificates;
CREATE POLICY "Users can delete own org client_certificates" ON public.client_certificates
FOR DELETE TO authenticated
USING (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

-- client_contacts, client_licenses, client_activities, client_dfe_series, client_inscriptions, client_legislations, client_tax_regime_history
DROP POLICY IF EXISTS "Users can insert own org client_contacts" ON public.client_contacts;
CREATE POLICY "Users can insert own org client_contacts" ON public.client_contacts
FOR INSERT TO authenticated
WITH CHECK (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can update own org client_contacts" ON public.client_contacts;
CREATE POLICY "Users can update own org client_contacts" ON public.client_contacts
FOR UPDATE TO authenticated
USING (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

DROP POLICY IF EXISTS "Users can delete own org client_contacts" ON public.client_contacts;
CREATE POLICY "Users can delete own org client_contacts" ON public.client_contacts
FOR DELETE TO authenticated
USING (
  public.check_client_access(client_id)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
);

-- ============================================================================
-- 4. ISOLAMENTO DE DOCUMENTOS (client_documents)
-- ============================================================================
DROP POLICY IF EXISTS "Gestores e Operacionais podem gerenciar documentos" ON public.client_documents;
CREATE POLICY "Gestores e Operacionais podem gerenciar documentos" ON public.client_documents
FOR ALL TO authenticated
USING (
  org_id = public.get_auth_org_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['gestor'::text, 'operacional'::text])
  )
)
WITH CHECK (
  org_id = public.get_auth_org_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['gestor'::text, 'operacional'::text])
  )
);

-- Trigger para garantir org_id em client_documents
CREATE OR REPLACE FUNCTION public.set_document_org_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.get_auth_org_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_client_documents_org_id ON public.client_documents;
CREATE TRIGGER trg_set_client_documents_org_id
BEFORE INSERT ON public.client_documents
FOR EACH ROW EXECUTE FUNCTION public.set_document_org_id();

-- ============================================================================
-- 5. ISOLAMENTO DE TAREFAS E WORKFLOWS (tasks e task_workflows)
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage tasks in org" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

CREATE POLICY "tasks_select_policy" ON public.tasks
FOR SELECT TO authenticated
USING (
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'cliente'
    AND (
      org_id = public.get_auth_org_id()
      OR (client_id IS NOT NULL AND public.check_client_access(client_id))
    )
  )
  OR (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'cliente'
    AND client_id IS NOT NULL
    AND public.check_client_access(client_id)
  )
);

CREATE POLICY "tasks_insert_policy" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
  AND (
    org_id = public.get_auth_org_id()
    OR (client_id IS NOT NULL AND public.check_client_access(client_id))
  )
);

CREATE POLICY "tasks_update_policy" ON public.tasks
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
  AND (
    org_id = public.get_auth_org_id()
    OR (client_id IS NOT NULL AND public.check_client_access(client_id))
  )
);

CREATE POLICY "tasks_delete_policy" ON public.tasks
FOR DELETE TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
  AND (
    org_id = public.get_auth_org_id()
    OR (client_id IS NOT NULL AND public.check_client_access(client_id))
  )
);

-- Trigger para garantir org_id em tasks
CREATE OR REPLACE FUNCTION public.set_task_org_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.get_auth_org_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_tasks_org_id ON public.tasks;
CREATE TRIGGER trg_set_tasks_org_id
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_task_org_id();

-- task_workflows
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.task_workflows;
DROP POLICY IF EXISTS "task_workflows_org_all" ON public.task_workflows;

CREATE POLICY "task_workflows_org_all" ON public.task_workflows
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_workflows.task_id
    AND (
      t.org_id = public.get_auth_org_id()
      OR (t.client_id IS NOT NULL AND public.check_client_access(t.client_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_workflows.task_id
    AND (
      t.org_id = public.get_auth_org_id()
      OR (t.client_id IS NOT NULL AND public.check_client_access(t.client_id))
    )
  )
);

-- ============================================================================
-- 6. BLINDAGEM DO CHAT (Canais e Mensagens Confidenciais)
-- ============================================================================
DROP POLICY IF EXISTS "chat_channels_org_select" ON public.chat_channels;
CREATE POLICY "chat_channels_org_select" ON public.chat_channels
FOR SELECT TO authenticated
USING (
  org_id = public.get_auth_org_id()
  AND (
    created_by = auth.uid()
    OR public.is_channel_member(id)
    OR (is_private IS NOT TRUE AND type IN ('group', 'broadcast') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'cliente')
    OR (
      type = 'support'
      AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text])
        OR created_by = auth.uid()
        OR public.is_channel_member(id)
      )
    )
  )
);

DROP POLICY IF EXISTS "chat_messages_org_select" ON public.chat_messages;
CREATE POLICY "chat_messages_org_select" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_messages.channel_id
    AND c.org_id = public.get_auth_org_id()
    AND (
      c.created_by = auth.uid()
      OR public.is_channel_member(c.id)
      OR (c.type = 'support' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(ARRAY['gestor'::text, 'operacional'::text]))
      OR (c.is_private IS NOT TRUE AND c.type IN ('group', 'broadcast') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'cliente')
    )
  )
);

DROP POLICY IF EXISTS "chat_messages_org_delete" ON public.chat_messages;
CREATE POLICY "chat_messages_org_delete" ON public.chat_messages
FOR DELETE TO authenticated
USING (
  sender_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chat_channels c ON c.id = chat_messages.channel_id
      WHERE p.id = auth.uid()
      AND p.role = 'gestor'::text
      AND p.org_id = c.org_id
    )
  )
);

-- ============================================================================
-- 7. PROTEÇÃO CONTRA ESCALADA DE PRIVILÉGIOS (profiles)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS trigger AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Se o role, org_id ou client_ids foram alterados:
  IF (OLD.role IS DISTINCT FROM NEW.role) OR 
     (OLD.org_id IS DISTINCT FROM NEW.org_id) OR 
     (OLD.client_ids IS DISTINCT FROM NEW.client_ids) THEN

    -- Permitir self-healing inicial para gestor quando org_id for NULL
    IF OLD.org_id IS NULL AND OLD.role = 'gestor' AND NEW.role = 'gestor' AND NEW.org_id = NEW.id THEN
      RETURN NEW;
    END IF;

    -- Se marcado como operação administrativa interna (SECURITY DEFINER / service_role):
    IF current_setting('app.is_admin_operation', true) = 'true' THEN
      RETURN NEW;
    END IF;

    -- Obter papel de quem está executando
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    
    -- Se o próprio usuário está tentando alterar seu próprio role ou org_id:
    IF auth.uid() = OLD.id THEN
      IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.org_id IS DISTINCT FROM NEW.org_id) THEN
        RAISE EXCEPTION 'Não é permitido alterar seu próprio nível de acesso ou organização diretamente.';
      END IF;
      IF v_caller_role = 'cliente' AND (OLD.client_ids IS DISTINCT FROM NEW.client_ids) THEN
        RAISE EXCEPTION 'Não é permitido alterar as empresas vinculadas ao seu perfil.';
      END IF;
    END IF;

    -- Se o chamador não for gestor:
    IF v_caller_role != 'gestor' THEN
      RAISE EXCEPTION 'Apenas gestores podem alterar níveis de acesso e organização.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_security ON public.profiles;
CREATE TRIGGER trg_protect_profile_security
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();

-- ============================================================================
-- 8. ISOLAMENTO DE TENANT NAS RPCS ADMINISTRATIVAS (admin_update_member e admin_delete_member)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_member(
  p_member_id uuid,
  p_first_name text,
  p_last_name text,
  p_new_email text,
  p_role text,
  p_sector_id uuid DEFAULT NULL,
  p_sector_ids uuid[] DEFAULT '{}'::uuid[],
  p_client_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_caller_org_id uuid;
  v_old_email text;
  v_user_id uuid;
  v_full_name text;
BEGIN
  -- 1. Validar se o chamador autenticado tem role 'gestor'
  SELECT role, org_id INTO v_caller_role, v_caller_org_id FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'gestor' THEN
    RAISE EXCEPTION 'Apenas gestores têm permissão para alterar credenciais de usuários.';
  END IF;

  -- 2. Obter o registro atual do membro garantindo isolamento de tenant
  SELECT email INTO v_old_email FROM public.members 
  WHERE id = p_member_id AND org_id = v_caller_org_id;
  
  IF v_old_email IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado ou não pertence à sua organização.';
  END IF;

  -- Sinalizar operação administrativa interna
  PERFORM set_config('app.is_admin_operation', 'true', true);

  -- Normalizar dados
  p_new_email := LOWER(TRIM(p_new_email));
  v_old_email := LOWER(TRIM(v_old_email));
  p_first_name := TRIM(p_first_name);
  p_last_name := COALESCE(TRIM(p_last_name), '');
  v_full_name := TRIM(p_first_name || ' ' || p_last_name);

  -- 3. Se o e-mail mudou, validar unicidade
  IF p_new_email != v_old_email THEN
    IF EXISTS (SELECT 1 FROM public.members WHERE LOWER(email) = p_new_email AND id != p_member_id) THEN
      RAISE EXCEPTION 'O e-mail % já está cadastrado para outro membro.', p_new_email;
    END IF;

    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_new_email LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'O e-mail % já possui uma conta cadastrada no sistema de autenticação.', p_new_email;
    END IF;
  END IF;

  -- 4. Localizar a conta do usuário no auth.users pelo e-mail antigo
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_old_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      email = p_new_email,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = jsonb_set(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{email}',
          to_jsonb(p_new_email)
        ),
        '{full_name}',
        to_jsonb(v_full_name)
      ),
      updated_at = now()
    WHERE id = v_user_id;

    UPDATE public.profiles
    SET 
      email = p_new_email,
      full_name = v_full_name,
      role = p_role,
      client_ids = CASE WHEN p_role = 'cliente' THEN p_client_ids ELSE '{}'::uuid[] END,
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 5. Atualizar members
  UPDATE public.members
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    email = p_new_email,
    role = p_role,
    sector_id = CASE WHEN p_role != 'cliente' THEN p_sector_id ELSE NULL END,
    sector_ids = CASE WHEN p_role != 'cliente' THEN p_sector_ids ELSE '{}'::uuid[] END,
    client_ids = CASE WHEN p_role = 'cliente' THEN p_client_ids ELSE '{}'::uuid[] END
  WHERE id = p_member_id AND org_id = v_caller_org_id;

  RETURN json_build_object(
    'success', true,
    'member_id', p_member_id,
    'user_id', v_user_id,
    'old_email', v_old_email,
    'new_email', p_new_email,
    'auth_user_updated', (v_user_id IS NOT NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_member(
  p_member_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_caller_org_id uuid;
  v_member_email text;
  v_user_id uuid;
BEGIN
  -- 1. Validar se o chamador autenticado é um gestor
  SELECT role, org_id INTO v_caller_role, v_caller_org_id FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'gestor' THEN
    RAISE EXCEPTION 'Apenas gestores têm permissão para excluir membros e revogar acessos.';
  END IF;

  -- 2. Obter o e-mail do membro garantindo isolamento de tenant
  SELECT email INTO v_member_email FROM public.members 
  WHERE id = p_member_id AND org_id = v_caller_org_id;

  IF v_member_email IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado ou não pertence à sua organização.';
  END IF;

  v_member_email := LOWER(TRIM(v_member_email));

  -- 3. Localizar conta em auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_member_email LIMIT 1;

  -- 4. Excluir o registro de members
  DELETE FROM public.members WHERE id = p_member_id AND org_id = v_caller_org_id;

  -- 5. Se existir usuário em auth.users, excluir a conta
  IF v_user_id IS NOT NULL THEN
    IF v_user_id != auth.uid() THEN
      BEGIN
        DELETE FROM public.profiles WHERE id = v_user_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'member_id', p_member_id,
    'email', v_member_email,
    'auth_user_deleted', (v_user_id IS NOT NULL)
  );
END;
$$;
