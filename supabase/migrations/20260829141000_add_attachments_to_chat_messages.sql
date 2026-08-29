-- Add attachments, attachment_url, file_name, file_type to chat_messages and email to profiles
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS attachments jsonb,
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_type text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text;
