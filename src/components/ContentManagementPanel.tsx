'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, ArrowLeft, Image as ImageIcon, Mail, Type } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ContentSettings } from '@/lib/types'

interface ContentManagementPanelProps {
  onBack: () => void
}

const DEFAULT_SETTINGS: ContentSettings = {
  landing_page_title: 'Unsere Baby-Wunschliste',
  landing_page_welcome_text: 'Hallo du Liebe:r! 🥰 Wähle ein Item aus und reserviere es mit deiner E-Mail-Adresse. Vielen Dank, dass du uns bei der Vorbereitung auf unser kleines Wunder unterstützen möchtest! 💕',
  landing_page_emojis: '👶🍼🦄⭐',
  landing_page_image_1_url: '/images/Hochzeit_JG-68.jpg',
  landing_page_image_2_url: '/images/Baby 14.08.png',
  section_available_title: 'Verfügbare Items',
  section_reserved_title: 'Bereits reserviert',
  email_gifter_subject: 'Bestätigung: {item_name} reserviert',
  email_gifter_message: 'Vielen Dank, dass du <strong>{item_name}</strong> aus unserer Baby-Wunschliste reserviert hast.',
  email_gifter_signature: 'Vielen Dank für deine Unterstützung!<br>Herzliche Grüße<br>Deine Baby-Eltern',
  email_parent_subject: 'Neue Reservierung: {item_name}',
  email_parent_message: 'Jemand hat ein Item aus eurer Baby-Wunschliste reserviert:',
  email_parent_signature: 'Das Item wurde automatisch als reserviert markiert.'
}

export default function ContentManagementPanel({ onBack }: ContentManagementPanelProps) {
  const [settings, setSettings] = useState<ContentSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'page' | 'emails'>('page')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      
      if (error) throw error
      
      if (data) {
        setSettings({
          landing_page_title: data.landing_page_title || DEFAULT_SETTINGS.landing_page_title,
          landing_page_welcome_text: data.landing_page_welcome_text || DEFAULT_SETTINGS.landing_page_welcome_text,
          landing_page_emojis: data.landing_page_emojis || DEFAULT_SETTINGS.landing_page_emojis,
          landing_page_image_1_url: data.landing_page_image_1_url || DEFAULT_SETTINGS.landing_page_image_1_url,
          landing_page_image_2_url: data.landing_page_image_2_url || DEFAULT_SETTINGS.landing_page_image_2_url,
          section_available_title: data.section_available_title || DEFAULT_SETTINGS.section_available_title,
          section_reserved_title: data.section_reserved_title || DEFAULT_SETTINGS.section_reserved_title,
          email_gifter_subject: data.email_gifter_subject || DEFAULT_SETTINGS.email_gifter_subject,
          email_gifter_message: data.email_gifter_message || DEFAULT_SETTINGS.email_gifter_message,
          email_gifter_signature: data.email_gifter_signature || DEFAULT_SETTINGS.email_gifter_signature,
          email_parent_subject: data.email_parent_subject || DEFAULT_SETTINGS.email_parent_subject,
          email_parent_message: data.email_parent_message || DEFAULT_SETTINGS.email_parent_message,
          email_parent_signature: data.email_parent_signature || DEFAULT_SETTINGS.email_parent_signature,
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Fehler beim Laden der Einstellungen! 🥺')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert([{
          id: 1,
          ...settings,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' })
      
      if (error) throw error
      
      toast.success('🎉 Inhalte erfolgreich gespeichert! 💝')
      await loadSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Ups! Fehler beim Speichern! 🥺')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ContentSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-500"></div>
        <span className="ml-4 text-lg text-gray-600">Lade Einstellungen... ✨</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex justify-center items-center gap-3 mb-6">
          <span className="text-4xl sm:text-5xl">🎨</span>
          <span className="text-4xl sm:text-5xl">✏️</span>
          <span className="text-4xl sm:text-5xl">💝</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
          Inhalts-Verwaltung
        </h1>
        <p className="text-base sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
          Passe die Texte, Bilder und E-Mails deiner Wunschliste an! 🎨
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 justify-center">
        <Button
          onClick={() => setActiveTab('page')}
          variant={activeTab === 'page' ? 'default' : 'outline'}
          className={activeTab === 'page' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : ''}
        >
          <Type className="h-4 w-4 mr-2" />
          Seiten-Inhalt
        </Button>
        <Button
          onClick={() => setActiveTab('emails')}
          variant={activeTab === 'emails' ? 'default' : 'outline'}
          className={activeTab === 'emails' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : ''}
        >
          <Mail className="h-4 w-4 mr-2" />
          E-Mail-Vorlagen
        </Button>
      </div>

      {/* Content */}
      <Card className="bg-white shadow-2xl border-0 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-slate-800 to-blue-800 text-white p-6 sm:p-8">
          <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-3">
            {activeTab === 'page' ? (
              <>
                <Type className="h-7 w-7 sm:h-8 sm:w-8" />
                Landingpage-Inhalte
              </>
            ) : (
              <>
                <Mail className="h-7 w-7 sm:h-8 sm:w-8" />
                E-Mail-Vorlagen
              </>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8">
          {activeTab === 'page' ? (
            <div className="space-y-8">
              {/* Title */}
              <div className="space-y-3">
                <Label htmlFor="page-title" className="text-lg font-bold text-slate-800">
                  📝 Seiten-Titel
                </Label>
                <Input
                  id="page-title"
                  value={settings.landing_page_title}
                  onChange={(e) => handleInputChange('landing_page_title', e.target.value)}
                  className="text-lg"
                  placeholder="z.B. Unsere Baby-Wunschliste"
                />
              </div>

              {/* Emojis */}
              <div className="space-y-3">
                <Label htmlFor="emojis" className="text-lg font-bold text-slate-800">
                  😊 Deko-Emojis (getrennt durch Leerzeichen)
                </Label>
                <Input
                  id="emojis"
                  value={settings.landing_page_emojis}
                  onChange={(e) => handleInputChange('landing_page_emojis', e.target.value)}
                  className="text-2xl"
                  placeholder="z.B. 👶🍼🦄⭐"
                />
                <p className="text-sm text-gray-600">Vorschau: {settings.landing_page_emojis.split(' ').map((emoji, i) => <span key={i} className="text-3xl mr-2">{emoji}</span>)}</p>
              </div>

              {/* Welcome Text */}
              <div className="space-y-3">
                <Label htmlFor="welcome" className="text-lg font-bold text-slate-800">
                  💬 Willkommenstext
                </Label>
                <Textarea
                  id="welcome"
                  value={settings.landing_page_welcome_text}
                  onChange={(e) => handleInputChange('landing_page_welcome_text', e.target.value)}
                  rows={4}
                  className="text-base"
                  placeholder="Dein Willkommenstext..."
                />
              </div>

              {/* Images */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Bilder
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image 1 */}
                  <div className="space-y-3">
                    <Label htmlFor="img1" className="font-medium">Bild 1 (URL)</Label>
                    <Input
                      id="img1"
                      value={settings.landing_page_image_1_url}
                      onChange={(e) => handleInputChange('landing_page_image_1_url', e.target.value)}
                      placeholder="/images/dein-bild.jpg"
                    />
                    {settings.landing_page_image_1_url && (
                      <img 
                        src={settings.landing_page_image_1_url} 
                        alt="Vorschau Bild 1" 
                        className="w-full h-40 object-cover rounded-lg border"
                        onError={(e) => { e.currentTarget.src = '/globe.svg' }}
                      />
                    )}
                  </div>

                  {/* Image 2 */}
                  <div className="space-y-3">
                    <Label htmlFor="img2" className="font-medium">Bild 2 (URL)</Label>
                    <Input
                      id="img2"
                      value={settings.landing_page_image_2_url}
                      onChange={(e) => handleInputChange('landing_page_image_2_url', e.target.value)}
                      placeholder="/images/dein-bild.jpg"
                    />
                    {settings.landing_page_image_2_url && (
                      <img 
                        src={settings.landing_page_image_2_url} 
                        alt="Vorschau Bild 2" 
                        className="w-full h-40 object-cover rounded-lg border"
                        onError={(e) => { e.currentTarget.src = '/globe.svg' }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="available" className="font-medium">🎁 Titel &quot;Verfügbare Items&quot;</Label>
                  <Input
                    id="available"
                    value={settings.section_available_title}
                    onChange={(e) => handleInputChange('section_available_title', e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="reserved" className="font-medium">✅ Titel &quot;Reservierte Items&quot;</Label>
                  <Input
                    id="reserved"
                    value={settings.section_reserved_title}
                    onChange={(e) => handleInputChange('section_reserved_title', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Placeholder Info */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📌 Verfügbare Platzhalter:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">{'{item_name}'}</code> - Name des Items</li>
                  <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">{'{item_size}'}</code> - Größe des Items</li>
                  <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">{'{item_color}'}</code> - Farbe des Items</li>
                  <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">{'{reserved_by}'}</code> - E-Mail der Person</li>
                  <li>• HTML erlaubt: <code className="bg-blue-100 px-2 py-0.5 rounded">&lt;strong&gt;</code>, <code className="bg-blue-100 px-2 py-0.5 rounded">&lt;br&gt;</code></li>
                </ul>
              </div>

              {/* Gifter Email */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <h3 className="text-xl font-bold text-green-800">✉️ E-Mail an Schenkende (Bestätigung)</h3>
                
                <div className="space-y-3">
                  <Label htmlFor="gifter-subject" className="font-medium">Betreff</Label>
                  <Input
                    id="gifter-subject"
                    value={settings.email_gifter_subject}
                    onChange={(e) => handleInputChange('email_gifter_subject', e.target.value)}
                    placeholder="z.B. Bestätigung: {item_name} reserviert"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="gifter-message" className="font-medium">Hauptnachricht</Label>
                  <Textarea
                    id="gifter-message"
                    value={settings.email_gifter_message}
                    onChange={(e) => handleInputChange('email_gifter_message', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="gifter-signature" className="font-medium">Signatur / Grußformel</Label>
                  <Textarea
                    id="gifter-signature"
                    value={settings.email_gifter_signature}
                    onChange={(e) => handleInputChange('email_gifter_signature', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Parent Email */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                <h3 className="text-xl font-bold text-purple-800">📬 E-Mail an Eltern (Benachrichtigung)</h3>
                
                <div className="space-y-3">
                  <Label htmlFor="parent-subject" className="font-medium">Betreff</Label>
                  <Input
                    id="parent-subject"
                    value={settings.email_parent_subject}
                    onChange={(e) => handleInputChange('email_parent_subject', e.target.value)}
                    placeholder="z.B. Neue Reservierung: {item_name}"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="parent-message" className="font-medium">Hauptnachricht</Label>
                  <Textarea
                    id="parent-message"
                    value={settings.email_parent_message}
                    onChange={(e) => handleInputChange('email_parent_message', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="parent-signature" className="font-medium">Abschlusstext</Label>
                  <Textarea
                    id="parent-signature"
                    value={settings.email_parent_signature}
                    onChange={(e) => handleInputChange('email_parent_signature', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200 mt-8">
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full sm:w-auto h-14 text-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Zurück zum Admin
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:flex-1 h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Änderungen speichern
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

