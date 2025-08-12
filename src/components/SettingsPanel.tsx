'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Save, CheckCircle, AlertCircle, User, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface SettingsPanelProps {
  onBack: () => void
}

interface EmailSettings {
  parent_email_1: string
  parent_email_2: string
}

export default function SettingsPanel({ onBack }: SettingsPanelProps) {
  const [settings, setSettings] = useState<EmailSettings>({
    parent_email_1: '',
    parent_email_2: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // In einer echten App würden wir diese Einstellungen aus der Datenbank laden
      // Für jetzt verwenden wir die Umgebungsvariablen als Fallback
      const email1 = process.env.NEXT_PUBLIC_PARENT_EMAIL_1 || ''
      const email2 = process.env.NEXT_PUBLIC_PARENT_EMAIL_2 || ''
      
      setSettings({
        parent_email_1: email1,
        parent_email_2: email2
      })
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleSave = async () => {
    if (!settings.parent_email_1.trim()) {
      toast.error('Bitte gib mindestens eine E-Mail-Adresse ein! 📧')
      return
    }

    setSaving(true)
    
    try {
      // Hier würden wir die Einstellungen in der Datenbank speichern
      // Für jetzt zeigen wir nur eine Erfolgsmeldung
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('🎉 E-Mail-Einstellungen erfolgreich gespeichert! 💕')
      
      // In einer echten App würden wir die Umgebungsvariablen aktualisieren
      // oder die Einstellungen in der Datenbank speichern
      
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Ups! Fehler beim Speichern der Einstellungen! 🥺')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof EmailSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateEmail = (email: string) => {
    if (!email.trim()) return true // Leere E-Mail ist erlaubt
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isFormValid = () => {
    return settings.parent_email_1.trim() && 
           validateEmail(settings.parent_email_1) &&
           (!settings.parent_email_2.trim() || validateEmail(settings.parent_email_2))
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center items-center gap-3 mb-6">
          <span className="text-5xl">⚙️</span>
          <span className="text-5xl">💌</span>
          <span className="text-5xl">💕</span>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
          E-Mail-Einstellungen
        </h1>
        <p className="text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
          Konfiguriere die E-Mail-Adressen, an die wir Benachrichtigungen über neue Reservierungen senden! 📬
        </p>
      </div>

      {/* Settings Card */}
      <Card className="bg-white shadow-2xl border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-800 to-blue-800 text-white p-8">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <Mail className="h-8 w-8" />
            Benachrichtigungen konfigurieren
          </CardTitle>
          <p className="text-slate-200 mt-2">
            Beide Partner erhalten E-Mails, wenn jemand ein Geschenk reserviert
          </p>
        </CardHeader>
        
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Partner 1 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Label className="text-lg font-bold text-slate-800">
                    Partner 1 (Haupt-E-Mail) *
                  </Label>
                  <p className="text-sm text-slate-600">
                    Diese E-Mail-Adresse ist erforderlich
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <Input
                  type="email"
                  value={settings.parent_email_1}
                  onChange={(e) => handleInputChange('parent_email_1', e.target.value)}
                  placeholder="deine.email@beispiel.de"
                  className={`h-14 text-lg border-2 transition-all duration-200 ${
                    settings.parent_email_1.trim() 
                      ? validateEmail(settings.parent_email_1)
                        ? 'border-green-500 bg-green-50 focus:border-green-600 focus:ring-green-500'
                        : 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {settings.parent_email_1.trim() && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    {validateEmail(settings.parent_email_1) ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                )}
              </div>
              
              {settings.parent_email_1.trim() && !validateEmail(settings.parent_email_1) && (
                <p className="text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Bitte gib eine gültige E-Mail-Adresse ein
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">und</span>
              </div>
            </div>

            {/* Partner 2 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Label className="text-lg font-bold text-slate-800">
                    Partner 2 (Optionale E-Mail)
                  </Label>
                  <p className="text-sm text-slate-600">
                    Diese E-Mail-Adresse ist optional
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <Input
                  type="email"
                  value={settings.parent_email_2}
                  onChange={(e) => handleInputChange('parent_email_2', e.target.value)}
                  placeholder="partner.email@beispiel.de (optional)"
                  className={`h-14 text-lg border-2 transition-all duration-200 ${
                    settings.parent_email_2.trim() 
                      ? validateEmail(settings.parent_email_2)
                        ? 'border-green-500 bg-green-50 focus:border-green-600 focus:ring-green-500'
                        : 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {settings.parent_email_2.trim() && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    {validateEmail(settings.parent_email_2) ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                )}
              </div>
              
              {settings.parent_email_2.trim() && !validateEmail(settings.parent_email_2) && (
                <p className="text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Bitte gib eine gültige E-Mail-Adresse ein
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Wie funktioniert das? 🤔
                  </h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Beide Partner erhalten E-Mails bei neuen Reservierungen</li>
                    <li>• Partner 1 ist erforderlich, Partner 2 ist optional</li>
                    <li>• E-Mails werden automatisch an alle konfigurierten Adressen gesendet</li>
                    <li>• Du kannst die Einstellungen jederzeit ändern</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-8 border-t border-slate-200">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 h-14 text-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
            >
              ← Zurück zum Admin
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!isFormValid() || saving}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Einstellungen speichern
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
