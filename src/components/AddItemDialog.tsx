'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WishlistItem } from '@/lib/types'

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (itemData: Omit<WishlistItem, 'id' | 'created_at' | 'updated_at' | 'reserved' | 'reserved_by' | 'reserved_at'>) => void
  editingItem?: WishlistItem | null
}

export default function AddItemDialog({ open, onOpenChange, onAdd, editingItem }: AddItemDialogProps) {
  const [formData, setFormData] = useState({
    item: '',
    size: '',
    color: '',
    website: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingItem) {
      setFormData({
        item: editingItem.item,
        size: editingItem.size || '',
        color: editingItem.color || '',
        website: editingItem.website || '',
        notes: editingItem.notes || ''
      })
    } else {
      setFormData({
        item: '',
        size: '',
        color: '',
        website: '',
        notes: ''
      })
    }
  }, [editingItem, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.item.trim()) {
      alert('Bitte gib einen Item-Namen ein')
      return
    }

    setLoading(true)
    
    try {
      await onAdd(formData)
      setFormData({
        item: '',
        size: '',
        color: '',
        website: '',
        notes: ''
      })
    } catch (error) {
      console.error('Error adding item:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Item bearbeiten' : 'Neues Item hinzufügen'}
          </DialogTitle>
          <DialogDescription>
            {editingItem ? 'Bearbeite die Details des ausgewählten Items.' : 'Füge ein neues Item zur Wunschliste hinzu.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item">Item-Name *</Label>
            <Input
              id="item"
              value={formData.item}
              onChange={(e) => handleInputChange('item', e.target.value)}
              placeholder="z.B. Strampler, Spielzeug, etc."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="size">Größe</Label>
            <Input
              id="size"
              value={formData.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              placeholder="z.B. 56, 62, 68"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="color">Farbe</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              placeholder="z.B. Blau, Rosa, Neutral"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website/Link</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://www.beispiel.de"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Zusätzliche Informationen oder Wünsche"
              rows={3}
            />
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
              disabled={loading || !formData.item.trim()}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              {loading ? 'Wird gespeichert...' : (editingItem ? 'Aktualisieren' : 'Hinzufügen')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
