-- Migration: Atualização em cascata do nome do membro em tasks.responsible e tasks.responsibles
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
  v_old_email text;
  v_old_first_name text;
  v_old_last_name text;
  v_old_full_name text;
  v_new_full_name text;
  v_user_id uuid;
BEGIN
  -- 1. Validar se o chamador autenticado tem role 'gestor'
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'gestor' THEN
    RAISE EXCEPTION 'Apenas gestores têm permissão para alterar credenciais de usuários.';
  END IF;

  -- 2. Obter o registro atual do membro
  SELECT email, first_name, last_name 
  INTO v_old_email, v_old_first_name, v_old_last_name 
  FROM public.members 
  WHERE id = p_member_id;

  IF v_old_email IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado.';
  END IF;

  -- Normalizar dados
  p_new_email := LOWER(TRIM(p_new_email));
  v_old_email := LOWER(TRIM(v_old_email));
  p_first_name := TRIM(p_first_name);
  p_last_name := COALESCE(TRIM(p_last_name), '');
  v_old_first_name := COALESCE(TRIM(v_old_first_name), '');
  v_old_last_name := COALESCE(TRIM(v_old_last_name), '');
  
  v_old_full_name := TRIM(v_old_first_name || ' ' || v_old_last_name);
  v_new_full_name := TRIM(p_first_name || ' ' || p_last_name);

  -- 3. Se o e-mail mudou, validar unicidade
  IF p_new_email != v_old_email THEN
    IF EXISTS (SELECT 1 FROM public.members WHERE LOWER(email) = p_new_email AND id != p_member_id) THEN
      RAISE EXCEPTION 'O e-mail % já está cadastrado para outro membro.', p_new_email;
    END IF;

    -- Verificar se já existe outra conta no auth.users com esse novo e-mail
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_new_email LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'O e-mail % já possui uma conta cadastrada no sistema de autenticação.', p_new_email;
    END IF;
  END IF;

  -- 4. Localizar a conta do usuário no auth.users pelo e-mail antigo ou novo
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_old_email OR LOWER(email) = p_new_email LIMIT 1;

  -- Se encontrou o usuário no auth.users, atualiza auth.users e profiles
  IF v_user_id IS NOT NULL THEN
    -- Atualiza auth.users
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
        to_jsonb(v_new_full_name)
      ),
      updated_at = now()
    WHERE id = v_user_id;

    -- Atualiza public.profiles
    UPDATE public.profiles
    SET 
      email = p_new_email,
      full_name = v_new_full_name,
      role = p_role,
      client_ids = CASE WHEN p_role = 'cliente' THEN p_client_ids ELSE '{}'::uuid[] END,
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 5. Atualiza a tabela public.members
  UPDATE public.members
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    email = p_new_email,
    role = p_role,
    sector_id = CASE WHEN p_role != 'cliente' THEN p_sector_id ELSE NULL END,
    sector_ids = CASE WHEN p_role != 'cliente' THEN p_sector_ids ELSE '{}'::uuid[] END,
    client_ids = CASE WHEN p_role = 'cliente' THEN p_client_ids ELSE '{}'::uuid[] END
  WHERE id = p_member_id;

  -- 6. Propagação em Cascata: se o nome mudou, atualizar tarefas vinculadas
  IF v_old_full_name != '' AND v_old_full_name != v_new_full_name THEN
    -- a) Tarefas onde o membro é o responsável principal (pelo nome completo ou primeiro nome antigo)
    UPDATE public.tasks
    SET responsible = v_new_full_name
    WHERE responsible = v_old_full_name 
       OR (v_old_first_name != '' AND responsible = v_old_first_name);

    -- b) Tarefas em grupo onde o membro está no array responsibles (pelo nome completo)
    UPDATE public.tasks
    SET responsibles = array_replace(responsibles, v_old_full_name, v_new_full_name)
    WHERE v_old_full_name = ANY(responsibles);

    -- c) Tarefas em grupo com apenas o primeiro nome
    IF v_old_first_name != '' AND v_old_first_name != v_old_full_name THEN
      UPDATE public.tasks
      SET responsibles = array_replace(responsibles, v_old_first_name, v_new_full_name)
      WHERE v_old_first_name = ANY(responsibles);
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'member_id', p_member_id,
    'user_id', v_user_id,
    'old_name', v_old_full_name,
    'new_name', v_new_full_name,
    'old_email', v_old_email,
    'new_email', p_new_email,
    'auth_user_updated', (v_user_id IS NOT NULL)
  );
END;
$$;
