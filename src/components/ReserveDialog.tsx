'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WishlistItem } from '@/lib/types'
import { toast } from 'sonner'

interface ReserveDialogProps {
  item: WishlistItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function ReserveDialog({ item, open, onOpenChange, onSuccess }: ReserveDialogProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      toast.error('Bitte gib eine gültige E-Mail-Adresse ein! 💌')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          email: email,
        }),
      })

      if (!response.ok) {
        throw new Error('Reservierung fehlgeschlagen')
      }

      onSuccess()
      toast.success('🎉 Yay! Das Geschenk ist jetzt für dich reserviert! Du bekommst gleich eine Bestätigung per E-Mail! 💕')
    } catch (error) {
      console.error('Error reserving item:', error)
      toast.error('Ups! Da ist etwas schiefgegangen. Versuche es nochmal! 🥺')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-blue-50 to-violet-50 border-2 border-blue-200">
        <DialogHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-3">
            <span className="text-3xl">🎁</span>
            <span className="text-3xl">💝</span>
            <span className="text-3xl">✨</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-violet-800">
            Geschenk reservieren
          </DialogTitle>
          <DialogDescription className="text-gray-700 text-base">
            Hallo du Liebe! 🥰 Reserviere dieses tolle Geschenk für unser Baby!
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="item" className="text-gray-700 font-medium">
              <span className="text-purple-600">🎯</span> Geschenk
            </Label>
            <div className="text-lg text-gray-800 p-4 bg-gradient-to-r from-blue-100 to-violet-100 rounded-lg border border-blue-200 font-medium">
              {item.item}
            </div>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="email" className="text-gray-700 font-medium">
              <span className="text-blue-600">💌</span> Deine E-Mail-Adresse *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine.email@beispiel.de"
              required
              className="border-2 border-blue-200 focus:border-violet-500 focus:ring-violet-500 text-lg p-3"
            />
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <span className="text-blue-600">💡</span> Du bekommst eine Bestätigung per E-Mail und wir werden über deine Reservierung informiert! 🎉
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Wird reserviert...
                </>
              ) : (
                <>
                  <span className="text-lg">🎁</span>
                  Reservieren
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
