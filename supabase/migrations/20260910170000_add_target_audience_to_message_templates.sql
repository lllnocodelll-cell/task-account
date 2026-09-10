-- Adicionar coluna target_audience à tabela chat_message_templates
ALTER TABLE public.chat_message_templates 
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'external' CHECK (target_audience IN ('internal', 'external'));
