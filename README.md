# 🍼 Baby-Wunschlisten-App

Eine moderne Wunschlisten-App für Ihr Baby, gebaut mit Next.js 14, Supabase, Resend und Vercel.

## ✨ Features

- **Öffentliche Wunschliste**: Schenkende können die Wunschliste einsehen und Items reservieren
- **Admin-Bereich**: Passwortgeschützter Bereich für Eltern zum Verwalten der Wunschliste
- **Item-Verwaltung**: Items mit Name, Größe, Farbe, Website und Notizen hinzufügen/bearbeiten
- **Reservierungssystem**: Schenkende können Items reservieren und erhalten Bestätigungs-E-Mails
- **E-Mail-Benachrichtigungen**: Automatische E-Mails an Schenkende und Eltern bei Reservierungen
- **Responsive Design**: Moderne, benutzerfreundliche Oberfläche für alle Geräte
- **Vollständig konfiguriert**: Supabase, Resend und Vercel sind eingerichtet! 🚀

## 🚀 Installation

### 1. Repository klonen
```bash
git clone <your-repo-url>
cd wunschliste-baby
```

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren
Kopieren Sie `env.example` zu `.env.local` und füllen Sie die Werte aus:

```bash
cp env.example .env.local
```

Bearbeiten Sie `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Admin Password
ADMIN_PASSWORD=baby25
```

### 4. Supabase einrichten

1. Erstellen Sie ein Projekt auf [supabase.com](https://supabase.com)
2. Gehen Sie zu SQL Editor
3. Führen Sie den Inhalt von `supabase-setup.sql` aus
4. Kopieren Sie die URL und den anon key in Ihre `.env.local`

### 5. Resend einrichten

1. Erstellen Sie ein Konto auf [resend.com](https://resend.com)
2. Erstellen Sie einen API-Key
3. Kopieren Sie den API-Key in Ihre `.env.local`
4. Aktualisieren Sie die E-Mail-Adressen in `src/app/api/reserve/route.ts`

### 6. Entwicklungsserver starten
```bash
npm run dev
```

Die App ist jetzt unter [http://localhost:3000](http://localhost:3000) verfügbar.

## 📱 Verwendung

### Öffentliche Wunschliste
- Besuchen Sie die Hauptseite der App
- Schenkende können alle Items einsehen
- Klicken Sie auf "Reservieren" um ein Item zu reservieren
- Geben Sie Ihre E-Mail-Adresse ein
- Sie erhalten eine Bestätigungs-E-Mail

### Admin-Bereich
- Klicken Sie auf "Admin" in der Navigation
- Geben Sie das Passwort ein: `baby25`
- Fügen Sie neue Items hinzu
- Bearbeiten oder löschen Sie bestehende Items
- Markieren Sie Items als reserviert/frei

## 🏗️ Technologie-Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Datenbank**: Supabase (PostgreSQL)
- **E-Mail**: Resend
- **Deployment**: Vercel
- **Authentifizierung**: Passwort-basierte Admin-Authentifizierung

## 📁 Projektstruktur

```
src/
├── app/
│   ├── api/reserve/     # API-Route für Reservierungen
│   ├── admin/           # Admin-Seite
│   ├── globals.css      # Globale Styles
│   ├── layout.tsx       # Root Layout
│   └── page.tsx         # Hauptseite
├── components/
│   ├── ui/              # shadcn/ui Komponenten
│   ├── AdminPanel.tsx   # Admin-Verwaltung
│   ├── AddItemDialog.tsx # Item hinzufügen/bearbeiten
│   ├── Header.tsx       # Navigation
│   ├── LoginForm.tsx    # Admin-Login
│   ├── ReserveDialog.tsx # Reservierungs-Dialog
│   └── Wishlist.tsx     # Wunschlisten-Anzeige
└── lib/
    ├── supabase.ts      # Supabase-Konfiguration
    ├── resend.ts        # Resend-Konfiguration
    └── types.ts         # TypeScript-Typen
```

## 🚀 Deployment auf Vercel

1. Verbinden Sie Ihr Repository mit Vercel
2. Fügen Sie alle Umgebungsvariablen in Vercel hinzu
3. Deployen Sie die App

## 🔧 Anpassungen

### Admin-Passwort ändern
Ändern Sie den Wert von `ADMIN_PASSWORD` in `.env.local` und aktualisieren Sie den Code in `src/app/admin/page.tsx`.

### E-Mail-Templates anpassen
Bearbeiten Sie die E-Mail-Templates in `src/app/api/reserve/route.ts`.

### Styling anpassen
Bearbeiten Sie die Tailwind-Klassen in den Komponenten oder passen Sie `src/app/globals.css` an.

## 📞 Support

Bei Fragen oder Problemen erstellen Sie ein Issue im Repository oder kontaktieren Sie uns.

## 📄 Lizenz

Dieses Projekt ist für den persönlichen Gebrauch bestimmt.
