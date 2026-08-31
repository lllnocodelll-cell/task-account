-- Migration: Isolamento Multi-Tenancy Estrito para o Módulo de Chat
-- Adiciona a coluna org_id e aplica políticas RLS baseadas em get_auth_org_id()

-- 1. Adicionar coluna org_id nas tabelas do chat
ALTER TABLE public.chat_channels 
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS org_id uuid;

ALTER TABLE public.chat_channel_members 
  ADD COLUMN IF NOT EXISTS org_id uuid;

ALTER TABLE public.chat_contacts 
  ADD COLUMN IF NOT EXISTS org_id uuid;

ALTER TABLE public.chat_favorites 
  ADD COLUMN IF NOT EXISTS org_id uuid;

ALTER TABLE public.chat_calls 
  ADD COLUMN IF NOT EXISTS org_id uuid;

ALTER TABLE public.chat_reactions 
  ADD COLUMN IF NOT EXISTS org_id uuid;

-- 2. Preencher retroativamente o org_id em todas as tabelas de chat
-- A partir do criador do canal em profiles
UPDATE public.chat_channels c
SET org_id = COALESCE(p.org_id, c.created_by)
FROM public.profiles p
WHERE c.created_by = p.id AND c.org_id IS NULL;

-- Se ainda houver canal sem org_id, tentar atribuir ao criador
UPDATE public.chat_channels
SET org_id = created_by
WHERE org_id IS NULL;

-- Preencher chat_channel_members
UPDATE public.chat_channel_members m
SET org_id = c.org_id
FROM public.chat_channels c
WHERE m.channel_id = c.id AND m.org_id IS NULL;

-- Preencher chat_messages
UPDATE public.chat_messages msg
SET org_id = c.org_id
FROM public.chat_channels c
WHERE msg.channel_id = c.id AND msg.org_id IS NULL;

-- Preencher chat_contacts, chat_favorites, chat_calls, chat_reactions
UPDATE public.chat_favorites f
SET org_id = c.org_id
FROM public.chat_channels c
WHERE f.channel_id = c.id AND f.org_id IS NULL;

UPDATE public.chat_calls ca
SET org_id = COALESCE(p.org_id, ca.caller_id)
FROM public.profiles p
WHERE ca.caller_id = p.id AND ca.org_id IS NULL;

UPDATE public.chat_reactions r
SET org_id = m.org_id
FROM public.chat_messages m
WHERE r.message_id = m.id AND r.org_id IS NULL;

-- 3. Função Trigger para auto-atribuir org_id em novos inserts
CREATE OR REPLACE FUNCTION public.set_chat_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.get_auth_org_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DROP TRIGGER IF EXISTS trg_set_chat_channels_org_id ON public.chat_channels;
CREATE TRIGGER trg_set_chat_channels_org_id
BEFORE INSERT ON public.chat_channels
FOR EACH ROW EXECUTE FUNCTION public.set_chat_org_id();

DROP TRIGGER IF EXISTS trg_set_chat_messages_org_id ON public.chat_messages;
CREATE TRIGGER trg_set_chat_messages_org_id
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.set_chat_org_id();

DROP TRIGGER IF EXISTS trg_set_chat_channel_members_org_id ON public.chat_channel_members;
CREATE TRIGGER trg_set_chat_channel_members_org_id
BEFORE INSERT ON public.chat_channel_members
FOR EACH ROW EXECUTE FUNCTION public.set_chat_org_id();

-- 4. Recriação das Políticas RLS com Isolamento Estrito por Tenant (org_id)

-- Tabela chat_channels
DROP POLICY IF EXISTS "channels_select" ON public.chat_channels;
DROP POLICY IF EXISTS "channels_update_delete" ON public.chat_channels;
DROP POLICY IF EXISTS "Permitir update em chat_channels para membros e staff" ON public.chat_channels;
DROP POLICY IF EXISTS "Users can create channels" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_org_select" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_org_insert" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_org_update" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_org_delete" ON public.chat_channels;

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_channels_org_select"
ON public.chat_channels
FOR SELECT
TO authenticated
USING (
  (org_id = public.get_auth_org_id())
  AND (
    created_by = auth.uid()
    OR is_channel_member(id)
    OR type = 'support'
    OR (is_private IS NOT TRUE AND type IN ('group', 'broadcast'))
  )
);

CREATE POLICY "chat_channels_org_insert"
ON public.chat_channels
FOR INSERT
TO authenticated
WITH CHECK (
  (org_id = public.get_auth_org_id() OR org_id IS NULL)
  AND (created_by = auth.uid() OR auth.uid() IS NOT NULL)
);

CREATE POLICY "chat_channels_org_update"
ON public.chat_channels
FOR UPDATE
TO authenticated
USING (
  org_id = public.get_auth_org_id()
  AND (
    created_by = auth.uid()
    OR is_channel_member(id)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['gestor'::text, 'operacional'::text])
    )
  )
);

CREATE POLICY "chat_channels_org_delete"
ON public.chat_channels
FOR DELETE
TO authenticated
USING (
  org_id = public.get_auth_org_id()
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gestor'::text
    )
  )
);

-- Tabela chat_channel_members
DROP POLICY IF EXISTS "members_select" ON public.chat_channel_members;
DROP POLICY IF EXISTS "members_management" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_org_all" ON public.chat_channel_members;

ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_channel_members_org_all"
ON public.chat_channel_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND c.org_id = public.get_auth_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND c.org_id = public.get_auth_org_id()
  )
);

-- Tabela chat_messages
DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their channels" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_org_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_org_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_org_update" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_org_delete" ON public.chat_messages;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_org_select"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_messages.channel_id
    AND c.org_id = public.get_auth_org_id()
  )
);

CREATE POLICY "chat_messages_org_insert"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_messages.channel_id
    AND c.org_id = public.get_auth_org_id()
  )
);

CREATE POLICY "chat_messages_org_update"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_messages.channel_id
    AND c.org_id = public.get_auth_org_id()
  )
);

CREATE POLICY "chat_messages_org_delete"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'gestor'::text
  )
);

-- Tabela chat_reactions
DROP POLICY IF EXISTS "Users can view all reactions" ON public.chat_reactions;
DROP POLICY IF EXISTS "Users can insert their own reactions" ON public.chat_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.chat_reactions;

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_reactions_org_select"
ON public.chat_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    JOIN public.chat_channels c ON c.id = m.channel_id
    WHERE m.id = chat_reactions.message_id
    AND c.org_id = public.get_auth_org_id()
  )
);

CREATE POLICY "chat_reactions_org_insert"
ON public.chat_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_messages m
    JOIN public.chat_channels c ON c.id = m.channel_id
    WHERE m.id = chat_reactions.message_id
    AND c.org_id = public.get_auth_org_id()
  )
);

CREATE POLICY "chat_reactions_org_delete"
ON public.chat_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
