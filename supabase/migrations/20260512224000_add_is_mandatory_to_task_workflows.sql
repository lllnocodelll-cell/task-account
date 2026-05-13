-- Add is_mandatory column to task_workflows
ALTER TABLE public.task_workflows ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT false;
