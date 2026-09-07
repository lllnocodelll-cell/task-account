-- Migration: 20260907172000_add_certificate_and_license_updated_to_notifications_type_check.sql
-- Adiciona os tipos 'certificate_updated' e 'license_updated' à constraint notifications_type_check.
-- Isso corrige o erro onde a atualização de certificados ou licenças (não-renovação) disparava a trigger notify_client_certificate_change ou notify_client_license_change com tipo não permitido, causando rollback na transação.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'info'::text, 
    'success'::text, 
    'warning'::text, 
    'alert'::text, 
    'task_assigned'::text, 
    'task_concluded'::text, 
    'task_alert'::text, 
    'task_alert_critical'::text, 
    'new_tutorial'::text, 
    'task_due_soon'::text, 
    'task_overdue'::text,
    'license_expiring'::text,
    'license_expired'::text,
    'license_renewed'::text,
    'license_updated'::text,
    'certificate_expired'::text,
    'certificate_renewed'::text,
    'certificate_updated'::text,
    'client_created'::text,
    'task_reassigned'::text,
    'client_tax_regime_changed'::text,
    'client_legislation_added'::text,
    'client_contact_updated'::text,
    'client_address_changed'::text
  ])
);
