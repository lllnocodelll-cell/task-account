-- Migration: Adicionar coluna annexes à tabela client_tax_regime_history
ALTER TABLE public.client_tax_regime_history 
ADD COLUMN IF NOT EXISTS annexes text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.client_tax_regime_history.annexes IS 'Lista de anexos do Simples Nacional vinculados a este enquadramento (ex: Anexo I, Anexo III)';
