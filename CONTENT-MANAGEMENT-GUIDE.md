# Content Management Feature - Implementation Guide

## 🎉 What's New?

Admins can now customize **ALL** content on the wishlist website without touching code!

### Editable Elements:
1. **Landing Page**
   - Page title
   - Welcome text
   - Emoji decorations
   - 2 images
   - Section titles

2. **Email Templates**
   - Gifter confirmation email (subject, message, signature)
   - Parent notification email (subject, message, signature)
   - Support for dynamic placeholders

## 📋 Step 1: Run the SQL Migration

**Copy and run this SQL in your Supabase SQL Editor:**

The file is located at: `supabase-migration-add-content-settings.sql`

This will:
- Add all necessary fields to the `settings` table
- Populate them with your current default values
- Keep existing content unchanged

## 🎨 Step 2: Access Content Management

### For Admins:
1. Go to `/admin` and log in
2. You'll see **3 buttons** in the header:
   - 🎁 **Neues Geschenk hinzufügen** - Add items (existing)
   - ✏️ **Inhalte bearbeiten** - NEW! Manage page content
   - ⚙️ **E-Mail-Einstellungen** - Email settings (existing)
   - 🚪 **Abmelden** - Logout

3. Click **"Inhalte bearbeiten"** to open the Content Management Panel

## 🖊️ What Can Admins Edit?

### Tab 1: Seiten-Inhalt (Page Content)
- **📝 Seiten-Titel**: The main page heading
- **😊 Deko-Emojis**: Emoji decorations (space-separated)
- **💬 Willkommenstext**: Welcome paragraph
- **🖼️ Bilder**: Two image URLs with live preview
- **🎁 Section titles**: "Verfügbare Items" and "Bereits reserviert"

### Tab 2: E-Mail-Vorlagen (Email Templates)
- **✉️ Gifter Email** (Green section):
  - Subject line
  - Main message
  - Signature

- **📬 Parent Email** (Purple section):
  - Subject line
  - Main message
  - Closing text

## 🔧 Placeholders in Email Templates

Use these in email templates (they auto-replace when emails are sent):

| Placeholder | Replaces With | Example |
|-------------|---------------|---------|
| `{item_name}` | Item name | "Strampler" |
| `{item_size}` | Item size | "56" |
| `{item_color}` | Item color | "Blau" |
| `{reserved_by}` | Email address | "anna@example.com" |

### Example Email Subject:
```
Bestätigung: {item_name} reserviert
```
Becomes:
```
Bestätigung: Strampler reserviert
```

### Example Email Message:
```
Vielen Dank, dass du <strong>{item_name}</strong> in Größe {item_size} reserviert hast!
```
Becomes:
```
Vielen Dank, dass du <strong>Strampler</strong> in Größe 56 reserviert hast!
```

## 📸 Image Management

### Option 1: Local Images (Current)
- Place images in `/public/images/`
- Use path: `/images/your-image.jpg`

### Option 2: External URLs
- Upload to Google Drive, Dropbox, etc.
- Make publicly accessible
- Copy the direct image URL
- Paste into the image URL field

### Image Requirements:
- Recommended size: 800x600px or larger
- Format: JPG, PNG, WebP
- Aspect ratio: Any (will be cropped to fit)

## ✅ Features

### Live Preview
- Image previews show immediately as you type URLs
- Emoji preview shows how they'll appear
- Changes save to database instantly

### Default Values
- All fields pre-filled with current text
- Changing nothing = keeps everything as-is
- Can always reset by copying from defaults

### Validation
- Required field checks
- Email format validation
- Error messages in German

### Persistence
- All changes saved to Supabase
- Instantly visible on public page
- Works across all devices

## 🚀 User Experience

### For Admins:
1. Login to `/admin`
2. Click "Inhalte bearbeiten"
3. Make changes in either tab
4. Click "Änderungen speichern"
5. See changes live on public page!

### For Public Users:
- See updated content immediately
- No cache issues
- Smooth experience

## 🔒 Security

- Only authenticated admins can edit
- Public page only reads (no writes)
- Settings stored securely in Supabase
- Row-level security enabled

## 💡 Tips

1. **Test in Preview**: Check image URLs load before saving
2. **Use Placeholders**: Makes emails dynamic and personal
3. **Keep Backups**: Save your best texts elsewhere
4. **Short & Sweet**: Keep welcome text under 200 characters
5. **Emoji Spacing**: Separate emojis with spaces for best display

## 📊 What Changed in the Code?

### Files Created:
- ✅ `src/components/ContentManagementPanel.tsx` - New admin UI
- ✅ `supabase-migration-add-content-settings.sql` - Database migration

### Files Modified:
- ✅ `src/lib/types.ts` - Added ContentSettings interface
- ✅ `src/components/AdminPanel.tsx` - Added "Inhalte bearbeiten" button
- ✅ `src/components/Wishlist.tsx` - Fetches dynamic content
- ✅ `src/app/api/reserve/route.ts` - Uses dynamic email templates

### Database Changes:
- 13 new fields in `settings` table
- All with sensible defaults
- Indexed for performance

## 🆘 Troubleshooting

### Images not showing?
- Check URL is publicly accessible
- Try opening URL in incognito browser
- Use `/images/...` for local files

### Changes not appearing?
- Hard refresh the page (Ctrl+F5)
- Check browser console for errors
- Verify save was successful (toast message)

### Emails not using templates?
- Check templates are saved in Content Management
- Verify placeholders use correct syntax `{item_name}`
- Check browser console logs

## 🎯 Next Steps

1. ✅ Run the SQL migration
2. ✅ Login to admin panel
3. ✅ Test content editing
4. ✅ Reserve a test item to check emails
5. ✅ Customize to your liking!

---

**Everything is ready! Just run the SQL and start customizing! 🚀**

