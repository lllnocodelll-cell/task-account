-- Adicionar a coluna sector_ids na tabela members como um array de UUIDs
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS sector_ids UUID[] DEFAULT '{}'::uuid[];

-- Migrar os dados existentes: copiar o sector_id único de cada membro para o array sector_ids
UPDATE public.members 
SET sector_ids = ARRAY[sector_id]::uuid[] 
WHERE sector_id IS NOT NULL AND (sector_ids IS NULL OR array_length(sector_ids, 1) IS NULL);
