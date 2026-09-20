-- Migration: Otimização de Performance e Índices do Chat
-- 1. Índice composto para paginação e busca ágil de mensagens por canal e data
-- 2. Índices em chat_reactions para acelerar busca e joins
-- 3. Função RPC para contagem de reações não lidas sem necessidade de download de IDs no cliente

-- ============================================================================
-- 1. ÍNDICE COMPOSTO EM chat_messages
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created_desc 
ON public.chat_messages (channel_id, created_at DESC);

-- ============================================================================
-- 2. ÍNDICES EM chat_reactions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_created 
ON public.chat_reactions (message_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_created_at 
ON public.chat_reactions (created_at);

-- ============================================================================
-- 3. FUNÇÃO RPC get_channel_unread_reactions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_channel_unread_reactions(
    p_channel_id uuid,
    p_last_read timestamptz,
    p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.chat_reactions r
  JOIN public.chat_messages m ON m.id = r.message_id
  WHERE m.channel_id = p_channel_id
    AND r.created_at > p_last_read
    AND (p_user_id IS NULL OR r.user_id != p_user_id);
$$;

-- Conceder permissão de execução aos usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_channel_unread_reactions(uuid, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_unread_reactions(uuid, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_channel_unread_reactions(uuid, timestamptz, uuid) TO service_role;
