-- Migration: Higienização de setores órfãos em members e blindagem de integridade referencial
-- 1. Limpar IDs órfãos de sector_ids em members
UPDATE public.members m
SET sector_ids = ARRAY(
  SELECT unnest(m.sector_ids) INTERSECT SELECT s.id FROM public.sectors s
)
WHERE m.sector_ids IS NOT NULL AND array_length(m.sector_ids, 1) > 0;

-- 2. Garantir que sector_id seja nulo se o setor não existir em sectors
UPDATE public.members
SET sector_id = NULL
WHERE sector_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.sectors WHERE id = members.sector_id);

-- 3. Atualizar a foreign key constraint de members.sector_id para ON DELETE SET NULL
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_sector_id_fkey,
  ADD CONSTRAINT members_sector_id_fkey
    FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE SET NULL;

-- 4. Função e trigger para higienizar members.sector_ids quando um setor for excluído
CREATE OR REPLACE FUNCTION public.handle_sector_deletion_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Remover o setor excluído do array sector_ids de todos os membros
  UPDATE public.members
  SET sector_ids = array_remove(sector_ids, OLD.id)
  WHERE OLD.id = ANY(sector_ids);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_cleanup_deleted_sector_from_members ON public.sectors;
CREATE TRIGGER tr_cleanup_deleted_sector_from_members
  BEFORE DELETE ON public.sectors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sector_deletion_cleanup();

-- 5. Blindagem na RPC admin_update_member para validar p_sector_id
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
  v_valid_sector_id uuid := NULL;
  v_valid_sector_ids uuid[] := '{}'::uuid[];
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

  -- Filtrar apenas setores válidos existentes na organização
  IF p_sector_ids IS NOT NULL AND array_length(p_sector_ids, 1) > 0 THEN
    SELECT COALESCE(ARRAY_AGG(id), '{}'::uuid[]) INTO v_valid_sector_ids
    FROM public.sectors
    WHERE id = ANY(p_sector_ids) AND org_id = v_caller_org_id;
  END IF;

  IF p_sector_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.sectors WHERE id = p_sector_id AND org_id = v_caller_org_id) THEN
    v_valid_sector_id := p_sector_id;
  ELSIF v_valid_sector_ids IS NOT NULL AND array_length(v_valid_sector_ids, 1) > 0 THEN
    v_valid_sector_id := v_valid_sector_ids[1];
  ELSE
    v_valid_sector_id := NULL;
  END IF;

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
    sector_id = CASE WHEN p_role != 'cliente' THEN v_valid_sector_id ELSE NULL END,
    sector_ids = CASE WHEN p_role != 'cliente' THEN COALESCE(v_valid_sector_ids, '{}'::uuid[]) ELSE '{}'::uuid[] END,
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
