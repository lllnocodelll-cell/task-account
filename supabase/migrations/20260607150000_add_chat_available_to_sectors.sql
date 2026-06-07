-- Migração para adicionar controle de visibilidade do setor no chat
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS chat_available BOOLEAN DEFAULT true NOT NULL;
