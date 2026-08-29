-- Add header_image_url to chat_message_templates
ALTER TABLE chat_message_templates 
ADD COLUMN IF NOT EXISTS header_image_url text;
