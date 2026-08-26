-- Adicionar coluna is_private na tabela chat_channels
ALTER TABLE chat_channels 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Adicionar coluna is_private na tabela chat_messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Index para performance em consultas filtrando privacidade
CREATE INDEX IF NOT EXISTS idx_chat_channels_is_private ON chat_channels(is_private);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_private ON chat_messages(is_private);
