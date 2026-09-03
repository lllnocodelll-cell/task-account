-- Atualizar constraints de chave estrangeira para setores
-- Permitir exclusão de setores definindo sector_id como NULL em chat_channels e client_documents
-- preservando histórico de conversas e documentos com segurança e integridade referencial.

ALTER TABLE public.chat_channels
  DROP CONSTRAINT IF EXISTS chat_channels_sector_id_fkey,
  ADD CONSTRAINT chat_channels_sector_id_fkey
    FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE SET NULL;

ALTER TABLE public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_sector_id_fkey,
  ADD CONSTRAINT client_documents_sector_id_fkey
    FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE SET NULL;
