-- Adiciona colunas de atribuição de atendente e status de suporte na tabela chat_channels
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS support_status VARCHAR(50) DEFAULT 'pending';

-- Adiciona coluna para marcar se uma mensagem é gerada pelo sistema (checkpoint)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
