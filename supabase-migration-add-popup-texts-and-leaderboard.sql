-- Migration: Add popup dialog texts and leaderboard table
-- Run this in your Supabase SQL Editor

-- ============================================
-- PART 1: Add popup dialog text fields
-- ============================================
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_title TEXT DEFAULT 'Geschenk reservieren';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_welcome_text TEXT DEFAULT 'Hallo du Liebe:r! 🥰 Reserviere dieses tolle Geschenk für unser Baby!';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_gift_label TEXT DEFAULT 'Geschenk';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_email_label TEXT DEFAULT 'Deine E-Mail-Adresse *';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_confirmation_text TEXT DEFAULT 'Du bekommst eine Bestätigung per E-Mail! 🎉';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_cancel_button TEXT DEFAULT 'Abbrechen';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_reserve_button TEXT DEFAULT 'Reservieren';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS popup_success_message TEXT DEFAULT '🎉 Yay! Das Geschenk ist jetzt für dich reserviert! Du bekommst gleich eine Bestätigung per E-Mail! 💕';

-- ============================================
-- PART 2: Create leaderboard table
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  time_seconds DECIMAL(10,3) NOT NULL,
  date_iso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_time_seconds ON leaderboard(time_seconds);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard(created_at);

-- Enable RLS
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: Create leaderboard policies
-- ============================================
DROP POLICY IF EXISTS "public can read leaderboard" ON leaderboard;
CREATE POLICY "public can read leaderboard" 
  ON leaderboard 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "public can insert leaderboard" ON leaderboard;
CREATE POLICY "public can insert leaderboard" 
  ON leaderboard 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "public can delete leaderboard" ON leaderboard;
CREATE POLICY "public can delete leaderboard" 
  ON leaderboard 
  FOR DELETE 
  USING (true);

-- ============================================
-- PART 4: Create RPC function for clearing leaderboard
-- ============================================
CREATE OR REPLACE FUNCTION leaderboard_clear()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM leaderboard;
END;
$$;

-- ============================================
-- PART 5: Update existing settings row
-- ============================================
UPDATE settings 
SET 
  popup_title = COALESCE(popup_title, 'Geschenk reservieren'),
  popup_welcome_text = COALESCE(popup_welcome_text, 'Hallo du Liebe:r! 🥰 Reserviere dieses tolle Geschenk für unser Baby!'),
  popup_gift_label = COALESCE(popup_gift_label, 'Geschenk'),
  popup_email_label = COALESCE(popup_email_label, 'Deine E-Mail-Adresse *'),
  popup_confirmation_text = COALESCE(popup_confirmation_text, 'Du bekommst eine Bestätigung per E-Mail! 🎉'),
  popup_cancel_button = COALESCE(popup_cancel_button, 'Abbrechen'),
  popup_reserve_button = COALESCE(popup_reserve_button, 'Reservieren'),
  popup_success_message = COALESCE(popup_success_message, '🎉 Yay! Das Geschenk ist jetzt für dich reserviert! Du bekommst gleich eine Bestätigung per E-Mail! 💕')
WHERE id = 1;

-- ============================================
-- PART 6: Add column comments
-- ============================================
COMMENT ON COLUMN settings.popup_title IS 'Title for the reservation popup dialog';
COMMENT ON COLUMN settings.popup_welcome_text IS 'Welcome message in the reservation popup';
COMMENT ON COLUMN settings.popup_gift_label IS 'Label for the gift field in popup';
COMMENT ON COLUMN settings.popup_email_label IS 'Label for the email field in popup';
COMMENT ON COLUMN settings.popup_confirmation_text IS 'Confirmation text shown in popup';
COMMENT ON COLUMN settings.popup_cancel_button IS 'Text for cancel button';
COMMENT ON COLUMN settings.popup_reserve_button IS 'Text for reserve button';
COMMENT ON COLUMN settings.popup_success_message IS 'Success message after reservation';
