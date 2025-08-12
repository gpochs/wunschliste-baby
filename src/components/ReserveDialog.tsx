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
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein')
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
    } catch (error) {
      console.error('Error reserving item:', error)
      toast.error('Fehler bei der Reservierung. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Item reservieren</DialogTitle>
          <DialogDescription>
            Geben Sie Ihre E-Mail-Adresse ein, um dieses Item zu reservieren.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item">Item</Label>
            <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
              {item.item}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Ihre E-Mail-Adresse *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre.email@beispiel.de"
              required
            />
            <p className="text-xs text-gray-500">
              Sie erhalten eine Bestätigung per E-Mail und wir werden über Ihre Reservierung informiert.
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              {loading ? 'Wird reserviert...' : 'Reservieren'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
