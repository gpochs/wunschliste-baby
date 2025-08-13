-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item TEXT NOT NULL,
  size TEXT,
  color TEXT,
  website TEXT,
  notes TEXT,
  reserved BOOLEAN DEFAULT FALSE,
  reserved_by TEXT,
  reserved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wishlist_items_created_at ON wishlist_items(created_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_reserved ON wishlist_items(reserved);
CREATE INDEX IF NOT EXISTS idx_reservations_item_id ON reservations(item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to wishlist_items
CREATE POLICY "Public can view wishlist items" ON wishlist_items
  FOR SELECT USING (true);

-- Create policies for authenticated users to manage items (you can restrict this further)
CREATE POLICY "Authenticated users can manage items" ON wishlist_items
  FOR ALL USING (true);

-- Create policies for reservations
CREATE POLICY "Public can create reservations" ON reservations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view reservations" ON reservations
  FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- App settings (stores notification emails)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  parent_email_1 TEXT,
  parent_email_2 TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple RLS for demo: allow read/write (adjust for production)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public can read settings'
  ) THEN
    CREATE POLICY "public can read settings" ON settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public can upsert settings'
  ) THEN
    CREATE POLICY "public can upsert settings" ON settings FOR INSERT WITH CHECK (true);
    CREATE POLICY "public can update settings" ON settings FOR UPDATE USING (true);
  END IF;
END $$;

-- Ensure one row exists
INSERT INTO settings (id, parent_email_1, parent_email_2)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert some sample data (optional)
INSERT INTO wishlist_items (item, size, color, notes) VALUES
  ('Strampler', '56', 'Blau', 'Für den Sommer geeignet'),
  ('Spielzeug-Rassel', '', 'Bunt', 'Aus Holz, ungiftig'),
  ('Bodys', '62', 'Rosa', '5er Pack, verschiedene Farben'),
  ('Decke', '', 'Hellblau', 'Warm und kuschelig'),
  ('Buch: "Gute Nacht"', '', '', 'Geschichten zum Einschlafen')
ON CONFLICT DO NOTHING;
