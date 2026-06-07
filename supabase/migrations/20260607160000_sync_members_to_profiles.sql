-- 1. Atualizar a função handle_new_user() para incluir client_ids no perfil inicial
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_org_id uuid;
  v_client_id uuid;
  v_client_ids uuid[];
  v_member_record RECORD;
BEGIN
  -- Verificar se este email existe na tabela members (Case-insensitive)
  SELECT * INTO v_member_record FROM public.members WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;
  
  IF FOUND THEN
    -- É um membro convidado. A role dele deve vir da tabela members, com fallback para 'operacional'
    v_role := COALESCE(v_member_record.role, 'operacional');
    v_org_id := v_member_record.org_id;
    v_client_id := v_member_record.client_id; -- Pega o client_id do convite
    v_client_ids := v_member_record.client_ids; -- Pega os client_ids do convite
  ELSE
    -- Novo cadastro direto pelo app (Novo Escritório/Gestor principal)
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestor');
    v_org_id := NEW.id; -- Ele é o dono da organização
    v_client_id := NULL;
    v_client_ids := '{}';
  END IF;

  INSERT INTO public.profiles (id, full_name, role, org_id, client_id, client_ids)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_org_id,
    v_client_id,
    v_client_ids
  );

  RETURN NEW;
END;
$function$;

-- 2. Criar a função de trigger para sincronização de members -> profiles
CREATE OR REPLACE FUNCTION public.sync_member_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscar o ID do usuário no auth.users correspondente ao email do membro
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;
  
  -- Se o usuário existir, propaga as alterações para o profile correspondente
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      client_ids = NEW.client_ids,
      client_id = NEW.client_id,
      role = NEW.role
    WHERE id = v_user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Criar a Trigger associada na tabela members
DROP TRIGGER IF EXISTS tr_sync_member_to_profile ON public.members;
CREATE TRIGGER tr_sync_member_to_profile
AFTER INSERT OR UPDATE OF client_ids, client_id, role, email ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.sync_member_to_profile();

-- 4. Sincronização retroativa imediata dos dados atuais
UPDATE public.profiles p
SET 
  client_ids = m.client_ids,
  client_id = COALESCE(p.client_id, m.client_id)
FROM public.members m
JOIN auth.users u ON LOWER(m.email) = LOWER(u.email)
WHERE p.id = u.id;
