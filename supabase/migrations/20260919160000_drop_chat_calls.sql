-- Migration: Remover tabela obsoleta de chamadas chat_calls
-- A funcionalidade de chamadas nativas Daily.co foi descontinuada para focar na excelência do chat e tarefas.

DROP TABLE IF EXISTS public.chat_calls CASCADE;
