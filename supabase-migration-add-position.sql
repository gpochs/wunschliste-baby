-- Migration: Add position field to wishlist_items
-- Run this in your Supabase SQL Editor after running supabase-setup.sql

-- Add position column (nullable initially)
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS position INTEGER;

-- Set positions for existing items based on created_at (oldest = highest position)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM wishlist_items
)
UPDATE wishlist_items
SET position = ranked.row_num
FROM ranked
WHERE wishlist_items.id = ranked.id
  AND wishlist_items.position IS NULL;

-- Make position NOT NULL with a default
ALTER TABLE wishlist_items ALTER COLUMN position SET NOT NULL;
ALTER TABLE wishlist_items ALTER COLUMN position SET DEFAULT 1;

-- Create index for better performance on position ordering
CREATE INDEX IF NOT EXISTS idx_wishlist_items_position ON wishlist_items(position);

-- Add comment
COMMENT ON COLUMN wishlist_items.position IS 'Display order position (lower number = displayed first)';

