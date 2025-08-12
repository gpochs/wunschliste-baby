'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WishlistItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { Plus, LogOut, Trash2, Edit, Heart } from 'lucide-react'
import AddItemDialog from './AddItemDialog'
import { toast } from 'sonner'

interface AdminPanelProps {
  onLogout: () => void
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)

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
      toast.error('Fehler beim Laden der Items')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (itemData: Omit<WishlistItem, 'id' | 'created_at' | 'updated_at' | 'reserved' | 'reserved_by' | 'reserved_at'>) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .insert([{
          ...itemData,
          reserved: false
        }])

      if (error) throw error

      toast.success('Item erfolgreich hinzugefügt!')
      setShowAddDialog(false)
      fetchItems()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Fehler beim Hinzufügen des Items')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Möchten Sie dieses Item wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Item erfolgreich gelöscht!')
      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Fehler beim Löschen des Items')
    }
  }

  const handleToggleReserved = async (item: WishlistItem) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update({
          reserved: !item.reserved,
          reserved_by: !item.reserved ? 'Admin' : null,
          reserved_at: !item.reserved ? new Date().toISOString() : null
        })
        .eq('id', item.id)

      if (error) throw error

      toast.success(`Item ${!item.reserved ? 'reserviert' : 'freigegeben'}!`)
      fetchItems()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Fehler beim Aktualisieren des Items')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">👶 Admin-Bereich</h1>
          <p className="text-gray-600">Verwalten Sie Ihre Baby-Wunschliste</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Item hinzufügen
          </Button>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card key={item.id} className={`${item.reserved ? 'opacity-75' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{item.item}</span>
                {item.reserved && (
                  <Heart className="h-5 w-5 text-red-500 fill-current" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.size && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Größe:</span> {item.size}
                </div>
              )}
              {item.color && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Farbe:</span> {item.color}
                </div>
              )}
              {item.website && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Website:</span> 
                  <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    Link öffnen
                  </a>
                </div>
              )}
              {item.notes && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Notizen:</span> {item.notes}
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleReserved(item)}
                  className="flex-1"
                >
                  {item.reserved ? 'Freigeben' : 'Reservieren'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingItem(item)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎁</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Noch keine Items</h3>
          <p className="text-gray-500">Fügen Sie Ihr erstes Item zur Wunschliste hinzu!</p>
        </div>
      )}

      {showAddDialog && (
        <AddItemDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={handleAddItem}
        />
      )}

      {editingItem && (
        <AddItemDialog
          open={!!editingItem}
          onOpenChange={() => setEditingItem(null)}
          onAdd={handleAddItem}
          editingItem={editingItem}
        />
      )}
    </div>
  )
}
