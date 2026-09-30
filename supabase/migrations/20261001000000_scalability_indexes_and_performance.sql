-- Migration: Escalabilidade e Índices de Alta Performance (Fase 1)
-- Focado em aceleração de queries multi-tenant, eliminação de Sequential Scans
-- e otimização de junções em tasks, workflows, anexos e documentos.

-- 1. TAREFAS (tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_org_competence ON public.tasks(org_id, competence);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON public.tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_org_client ON public.tasks(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_created_at_desc ON public.tasks(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- 2. CHECKLISTS DE TAREFAS (task_workflows)
CREATE INDEX IF NOT EXISTS idx_task_workflows_task_id ON public.task_workflows(task_id);
CREATE INDEX IF NOT EXISTS idx_task_workflows_task_mandatory ON public.task_workflows(task_id, is_mandatory);

-- 3. ANEXOS DE TAREFAS (task_attachments)
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

-- 4. CLIENTES (clients)
CREATE INDEX IF NOT EXISTS idx_clients_org_status ON public.clients(org_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_org_segment ON public.clients(org_id, segment);
CREATE INDEX IF NOT EXISTS idx_clients_org_created_at_desc ON public.clients(org_id, created_at DESC);

-- 5. DOCUMENTOS DO CLIENTE (client_documents)
CREATE INDEX IF NOT EXISTS idx_client_docs_org_id ON public.client_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_client_docs_client_id ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_docs_client_status ON public.client_documents(client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_docs_org_comp ON public.client_documents(org_id, competence_month);
CREATE INDEX IF NOT EXISTS idx_client_docs_org_sector ON public.client_documents(org_id, sector_id);

-- 6. LOGS DE AUDITORIA DE DOCUMENTOS (client_document_logs)
CREATE INDEX IF NOT EXISTS idx_client_doc_logs_doc_id ON public.client_document_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_client_doc_logs_doc_user ON public.client_document_logs(document_id, user_id);

-- 7. PERFIS E MEMBROS (profiles / members)
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON public.profiles(org_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
