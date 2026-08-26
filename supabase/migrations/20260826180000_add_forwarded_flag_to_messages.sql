-- Adicionar coluna is_forwarded na tabela chat_messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false;

-- Index para performance em consultas filtrando mensagens encaminhadas
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_forwarded ON chat_messages(is_forwarded);
