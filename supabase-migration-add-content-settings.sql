-- Migration: Add content management fields to settings table
-- Run this in your Supabase SQL Editor

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  parent_email_1 TEXT,
  parent_email_2 TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings (allow public read/write for demo - adjust for production)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'public can read settings'
  ) THEN
    CREATE POLICY "public can read settings" ON settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'public can insert settings'
  ) THEN
    CREATE POLICY "public can insert settings" ON settings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'public can update settings'
  ) THEN
    CREATE POLICY "public can update settings" ON settings FOR UPDATE USING (true);
  END IF;
END $$;

-- Ensure one settings row exists
INSERT INTO settings (id, parent_email_1, parent_email_2)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Add content fields to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS landing_page_title TEXT DEFAULT 'Unsere Baby-Wunschliste';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS landing_page_welcome_text TEXT DEFAULT 'Hallo du Liebe:r! 🥰 Wähle ein Item aus und reserviere es mit deiner E-Mail-Adresse. Vielen Dank, dass du uns bei der Vorbereitung auf unser kleines Wunder unterstützen möchtest! 💕';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS landing_page_emojis TEXT DEFAULT '👶🍼🦄⭐';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS landing_page_image_1_url TEXT DEFAULT '/images/Hochzeit_JG-68.jpg';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS landing_page_image_2_url TEXT DEFAULT '/images/Baby 14.08.png';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS section_available_title TEXT DEFAULT 'Verfügbare Items';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS section_reserved_title TEXT DEFAULT 'Bereits reserviert';

-- Email template fields for gifter (person who reserves)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_gifter_subject TEXT DEFAULT 'Bestätigung: {item_name} reserviert';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_gifter_message TEXT DEFAULT 'Vielen Dank, dass du <strong>{item_name}</strong> aus unserer Baby-Wunschliste reserviert hast.';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_gifter_signature TEXT DEFAULT 'Vielen Dank für deine Unterstützung!<br>Herzliche Grüße<br>Deine Baby-Eltern';

-- Email template fields for parents (notification)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_parent_subject TEXT DEFAULT 'Neue Reservierung: {item_name}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_parent_message TEXT DEFAULT 'Jemand hat ein Item aus eurer Baby-Wunschliste reserviert:';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_parent_signature TEXT DEFAULT 'Das Item wurde automatisch als reserviert markiert.';

-- Update existing row with default values (if exists)
UPDATE settings 
SET 
  landing_page_title = COALESCE(landing_page_title, 'Unsere Baby-Wunschliste'),
  landing_page_welcome_text = COALESCE(landing_page_welcome_text, 'Hallo du Liebe:r! 🥰 Wähle ein Item aus und reserviere es mit deiner E-Mail-Adresse. Vielen Dank, dass du uns bei der Vorbereitung auf unser kleines Wunder unterstützen möchtest! 💕'),
  landing_page_emojis = COALESCE(landing_page_emojis, '👶🍼🦄⭐'),
  landing_page_image_1_url = COALESCE(landing_page_image_1_url, '/images/Hochzeit_JG-68.jpg'),
  landing_page_image_2_url = COALESCE(landing_page_image_2_url, '/images/Baby 14.08.png'),
  section_available_title = COALESCE(section_available_title, 'Verfügbare Items'),
  section_reserved_title = COALESCE(section_reserved_title, 'Bereits reserviert'),
  email_gifter_subject = COALESCE(email_gifter_subject, 'Bestätigung: {item_name} reserviert'),
  email_gifter_message = COALESCE(email_gifter_message, 'Vielen Dank, dass du <strong>{item_name}</strong> aus unserer Baby-Wunschliste reserviert hast.'),
  email_gifter_signature = COALESCE(email_gifter_signature, 'Vielen Dank für deine Unterstützung!<br>Herzliche Grüße<br>Deine Baby-Eltern'),
  email_parent_subject = COALESCE(email_parent_subject, 'Neue Reservierung: {item_name}'),
  email_parent_message = COALESCE(email_parent_message, 'Jemand hat ein Item aus eurer Baby-Wunschliste reserviert:'),
  email_parent_signature = COALESCE(email_parent_signature, 'Das Item wurde automatisch als reserviert markiert.')
WHERE id = 1;

-- Add comment
COMMENT ON COLUMN settings.landing_page_title IS 'Editable title for the landing page';
COMMENT ON COLUMN settings.landing_page_welcome_text IS 'Editable welcome message on the landing page';
COMMENT ON COLUMN settings.landing_page_emojis IS 'Editable emoji decorations';
COMMENT ON COLUMN settings.landing_page_image_1_url IS 'URL for first landing page image';
COMMENT ON COLUMN settings.landing_page_image_2_url IS 'URL for second landing page image';
COMMENT ON COLUMN settings.email_gifter_subject IS 'Email subject for gifter confirmation (supports {item_name}, {item_size}, {item_color})';
COMMENT ON COLUMN settings.email_gifter_message IS 'Email message for gifter confirmation (supports placeholders and HTML)';
COMMENT ON COLUMN settings.email_parent_subject IS 'Email subject for parent notification (supports placeholders)';

