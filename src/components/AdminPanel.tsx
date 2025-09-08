'use client'

import { useState, useEffect } from 'react'
import { WishlistItem } from '@/lib/types'
import { getItemImageUrl } from '@/lib/itemImage'
import { supabase } from '@/lib/supabase'
import AddItemDialog from './AddItemDialog'
import SettingsPanel from './SettingsPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Trash2, ExternalLink, Gift, CheckCircle, Plus, LogOut, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface AdminPanelProps {
  onLogout: () => void
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Ups! Fehler beim Laden der Geschenke! 🥺')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (itemData: Omit<WishlistItem, 'id' | 'created_at' | 'updated_at' | 'reserved' | 'reserved_by' | 'reserved_at'>) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .insert([itemData])

      if (error) throw error

      toast.success('🎉 Yay! Das Geschenk wurde erfolgreich hinzugefügt! 💝')
      setAddDialogOpen(false)
      fetchItems()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Ups! Fehler beim Hinzufügen des Geschenks! 🥺')
    }
  }

  const handleEditItem = async (itemData: Omit<WishlistItem, 'id' | 'created_at' | 'updated_at' | 'reserved' | 'reserved_by' | 'reserved_at'>) => {
    if (!editingItem) return

    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update(itemData)
        .eq('id', editingItem.id)

      if (error) throw error

      toast.success('✨ Perfekt! Das Geschenk wurde erfolgreich aktualisiert! 🎁')
      setEditingItem(null)
      fetchItems()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Ups! Fehler beim Aktualisieren des Geschenks! 🥺')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Bist du sicher, dass du dieses Geschenk löschen möchtest? 🗑️')) return

    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('🗑️ Geschenk erfolgreich gelöscht! 👋')
      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Ups! Fehler beim Löschen des Geschenks! 🥺')
    }
  }

  const toggleReserved = async (item: WishlistItem) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update({
          reserved: !item.reserved,
          reserved_by: !item.reserved ? null : item.reserved_by,
          reserved_at: !item.reserved ? null : new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) throw error

      toast.success(`🎯 Geschenk ${!item.reserved ? 'als reserviert markiert' : 'als verfügbar markiert'}! ✨`)
      fetchItems()
    } catch (error) {
      console.error('Error toggling reserved status:', error)
      toast.error('Ups! Fehler beim Ändern des Status! 🥺')
    }
  }

  const renderItem = (item: WishlistItem) => (
    <Card key={item.id} className={`mb-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
      item.reserved 
        ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200' 
        : 'bg-gradient-to-r from-blue-50 to-violet-50 border-2 border-blue-200'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="w-32 sm:w-40 flex-shrink-0">
            <img
              src={getItemImageUrl(item.item, item.website, item.image_url)}
              alt={item.item}
              loading="lazy"
              className="w-full h-24 sm:h-28 object-cover rounded-md border"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className={`text-xl font-bold ${
                item.reserved ? 'text-gray-700' : 'text-violet-800'
              }`}>
                {item.item}
              </h3>
              {item.reserved ? (
                <div className="flex items-center gap-1 text-violet-700">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-sm font-medium">Reserviert</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-blue-600">
                  <Gift className="h-6 w-6" />
                  <span className="text-sm font-medium">Verfügbar</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-gray-700">
              {item.size && (
                <p className="flex items-center gap-2">
                  <span className="text-purple-600">📏</span>
                  <span className="font-medium">Größe:</span> {item.size}
                </p>
              )}
              {item.color && (
                <p className="flex items-center gap-2">
                  <span className="text-blue-600">🎨</span>
                  <span className="font-medium">Farbe:</span> {item.color}
                </p>
              )}
              {item.website && (
                <p className="flex items-center gap-2">
                  <span className="text-violet-600">🔗</span>
                  <span className="font-medium">Website:</span>{' '}
                  <a 
                    href={item.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-medium"
                  >
                    Link öffnen <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
              {item.notes && (
                <p className="flex items-center gap-2">
                  <span className="text-purple-600">💭</span>
                  <span className="font-medium">Notizen:</span> {item.notes}
                </p>
              )}
              {item.reserved && (
                <p className="text-violet-800 font-medium bg-violet-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
                  <span>🎉</span>
                  Geschenk ist reserviert
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 ml-4">
            <Button
              onClick={() => toggleReserved(item)}
              variant="outline"
              size="sm"
              className={`${
                item.reserved 
                  ? 'text-violet-700 border-2 border-violet-700 hover:bg-violet-50' 
                  : 'text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
              }`}
            >
              {item.reserved ? '🔄 Verfügbar machen' : '🎯 Als reserviert markieren'}
            </Button>
            
            <Button
              onClick={() => setEditingItem(item)}
              variant="outline"
              size="sm"
              className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Bearbeiten
            </Button>
            
            <Button
              onClick={() => handleDeleteItem(item.id)}
              variant="outline"
              size="sm"
              className="border-2 border-red-600 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Löschen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (showSettings) {
    return <SettingsPanel onBack={() => setShowSettings(false)} />
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-500"></div>
        <span className="ml-4 text-lg text-gray-600">Lade deine Geschenke... ✨</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 min-h-screen">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🛠️ Dein Admin-Bereich
          </h1>
          <p className="text-lg text-gray-700">Verwalte deine Baby-Wunschliste mit Liebe! 💕</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-6 py-3"
          >
            <Plus className="h-5 w-5 mr-2" />
            Neues Geschenk hinzufügen
          </Button>
          
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-6 py-3"
          >
            <Settings className="h-5 w-5 mr-2" />
            Einstellungen
          </Button>
          
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-2 border-gray-400 text-gray-700 hover:bg-gray-50 hover:border-gray-500 px-6 py-3"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Abmelden
          </Button>
        </div>
      </div>

      <div className="space-y-12">
        {/* Verfügbare Items */}
        <div>
          <CardHeader className="px-0 pb-6">
            <CardTitle className="text-2xl font-bold text-blue-700 flex items-center justify-center gap-3">
              <Gift className="h-7 w-7" />
              <span>Verfügbare Geschenke</span>
              <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-xl font-bold">
                {items.filter(item => !item.reserved).length}
              </span>
            </CardTitle>
          </CardHeader>
          
          <div className="space-y-6">
            {items.filter(item => !item.reserved).map(renderItem)}
          </div>
        </div>

        {/* Reservierte Items */}
        <div>
          <CardHeader className="px-0 pb-6">
            <CardTitle className="text-2xl font-bold text-gray-600 flex items-center justify-center gap-3">
              <CheckCircle className="h-7 w-7" />
              <span>Reservierte Geschenke</span>
              <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-xl font-bold">
                {items.filter(item => item.reserved).length}
              </span>
            </CardTitle>
          </CardHeader>
          
          <div className="space-y-6">
            {items.filter(item => item.reserved).map(renderItem)}
          </div>
        </div>
      </div>

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddItem}
      />

      <AddItemDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onAdd={handleEditItem}
        editingItem={editingItem}
      />
    </div>
  )
}
