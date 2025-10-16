# Migration Guide: Adding Item Reordering

This guide explains how to add the position field to your existing database to enable item reordering in the admin panel.

## For Existing Databases

If you've already set up your database using `supabase-setup.sql`, you need to run the migration script to add the `position` field:

### Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to your project at [supabase.com](https://supabase.com)
   - Go to the SQL Editor

2. **Run the migration script**
   - Open the file `supabase-migration-add-position.sql`
   - Copy the entire contents
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **What the migration does:**
   - Adds a `position` column to the `wishlist_items` table
   - Automatically assigns positions to existing items based on their creation date (oldest items get position 1, 2, 3, etc.)
   - Creates an index for better performance
   - Sets the position field as required with a default value

## For New Installations

If you're setting up the database for the first time:

1. **Simply run the main setup file**
   - Use `supabase-setup.sql`
   - The `position` field is already included in the table definition
   - No migration needed!

## Features Added

### Admin Panel
- **Up/Down arrows** next to each item
- Move items up or down in the display order
- Changes are reflected immediately
- Position is preserved across reserved/unreserved states

### Public Wishlist
- Items now display in the custom order set by admins
- Previously ordered by creation date (newest first)
- Now ordered by position (lowest number first)

## Troubleshooting

### If migration fails:
1. Check if the `position` column already exists:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'wishlist_items' AND column_name = 'position';
   ```

2. If it exists but has NULL values, update them:
   ```sql
   WITH ranked AS (
     SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
     FROM wishlist_items
   )
   UPDATE wishlist_items
   SET position = ranked.row_num
   FROM ranked
   WHERE wishlist_items.id = ranked.id
     AND wishlist_items.position IS NULL;
   ```

3. Make sure the field is NOT NULL:
   ```sql
   ALTER TABLE wishlist_items ALTER COLUMN position SET NOT NULL;
   ```

## Notes

- The position field is automatically managed when adding new items
- When you add a new item, it gets the highest position + 1
- Editing an item doesn't change its position
- The up/down arrows let you manually adjust the order
- Position changes are instant and persist in the database

