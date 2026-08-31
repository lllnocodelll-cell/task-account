-- Migration: Criar RPC admin_delete_member para exclusão definitiva de membros, profiles e auth.users
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
  v_member_email text;
  v_user_id uuid;
BEGIN
  -- 1. Validar se o chamador autenticado é um gestor
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'gestor' THEN
    RAISE EXCEPTION 'Apenas gestores têm permissão para excluir membros e revogar acessos.';
  END IF;

  -- 2. Obter o e-mail do membro
  SELECT email INTO v_member_email FROM public.members WHERE id = p_member_id;
  IF v_member_email IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado.';
  END IF;

  v_member_email := LOWER(TRIM(v_member_email));

  -- 3. Localizar se existe conta em auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_member_email LIMIT 1;

  -- 4. Excluir o registro de members
  DELETE FROM public.members WHERE id = p_member_id;

  -- 5. Se existir usuário em auth.users, excluir a conta para revogar o login definitivamente
  IF v_user_id IS NOT NULL THEN
    -- Excluir de profiles e auth.users (garantindo que não seja o próprio gestor chamador)
    IF v_user_id != auth.uid() THEN
      BEGIN
        DELETE FROM public.profiles WHERE id = v_user_id;
      EXCEPTION WHEN OTHERS THEN
        -- Se houver foreign key impedindo delete de profiles (ex: logs históricos), mantemos profile mas excluímos de auth.users
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
