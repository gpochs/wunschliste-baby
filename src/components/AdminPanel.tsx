'use client'

import { useState, useEffect } from 'react'
import { WishlistItem, LeaderboardEntry } from '@/lib/types'
import { getItemImageUrl } from '@/lib/itemImage'
import { supabase } from '@/lib/supabase'
import AddItemDialog from './AddItemDialog'
import SettingsPanel from './SettingsPanel'
import ContentManagementPanel from './ContentManagementPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Trash2, ExternalLink, Gift, CheckCircle, Plus, LogOut, Settings, ChevronUp, ChevronDown, Type, Trophy, Trash, ArrowLeft } from 'lucide-react'
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
  const [showContentManagement, setShowContentManagement] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  useEffect(() => {
    fetchItems()
    if (showLeaderboard) {
      fetchLeaderboard()
    }
  }, [showLeaderboard])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .order('position', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Ups! Fehler beim Laden der Geschenke! 🥺')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (itemData: Omit<WishlistItem, 'id' | 'created_at' | 'updated_at' | 'reserved' | 'reserved_by' | 'reserved_at' | 'position'>) => {
    try {
      // Get the highest position and add 1
      const { data: maxData } = await supabase
        .from('wishlist_items')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
      
      const maxPosition = maxData?.[0]?.position || 0
      const newPosition = maxPosition + 1

      const { error } = await supabase
        .from('wishlist_items')
        .insert([{ ...itemData, position: newPosition }])

      if (error) throw error

      toast.success('🎉 Yay! Das Geschenk wurde erfolgreich hinzugefügt! 💝')
      setAddDialogOpen(false)
      fetchItems()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Ups! Fehler beim Hinzufügen des Geschenks! 🥺')
    }
  }

  const handleEditItem = async (itemData: Omit<WishlistItem, 'id' | 'created_at' | 'updated_at' | 'reserved' | 'reserved_by' | 'reserved_at' | 'position'>) => {
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

  const moveItemUp = async (item: WishlistItem, allItems: WishlistItem[]) => {
    const currentIndex = allItems.findIndex(i => i.id === item.id)
    if (currentIndex <= 0) return // Already at top
    
    const previousItem = allItems[currentIndex - 1]
    
    try {
      // Swap positions
      const { error: error1 } = await supabase
        .from('wishlist_items')
        .update({ position: previousItem.position })
        .eq('id', item.id)
      
      const { error: error2 } = await supabase
        .from('wishlist_items')
        .update({ position: item.position })
        .eq('id', previousItem.id)

      if (error1 || error2) throw error1 || error2

      toast.success('⬆️ Geschenk nach oben verschoben! ✨')
      fetchItems()
    } catch (error) {
      console.error('Error moving item up:', error)
      toast.error('Ups! Fehler beim Verschieben! 🥺')
    }
  }

  const moveItemDown = async (item: WishlistItem, allItems: WishlistItem[]) => {
    const currentIndex = allItems.findIndex(i => i.id === item.id)
    if (currentIndex >= allItems.length - 1) return // Already at bottom
    
    const nextItem = allItems[currentIndex + 1]
    
    try {
      // Swap positions
      const { error: error1 } = await supabase
        .from('wishlist_items')
        .update({ position: nextItem.position })
        .eq('id', item.id)
      
      const { error: error2 } = await supabase
        .from('wishlist_items')
        .update({ position: item.position })
        .eq('id', nextItem.id)

      if (error1 || error2) throw error1 || error2

      toast.success('⬇️ Geschenk nach unten verschoben! ✨')
      fetchItems()
    } catch (error) {
      console.error('Error moving item down:', error)
      toast.error('Ups! Fehler beim Verschieben! 🥺')
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      const data = await response.json()
      setLeaderboard(data.entries || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      toast.error('Ups! Fehler beim Laden der Rangliste! 🥺')
    }
  }

  const clearLeaderboard = async () => {
    if (!confirm('Möchtest du wirklich alle Einträge der Rangliste löschen? Das kann nicht rückgängig gemacht werden!')) {
      return
    }

    try {
      const response = await fetch('/api/leaderboard', { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to clear leaderboard')
      
      toast.success('🗑️ Rangliste wurde geleert! ✨')
      fetchLeaderboard()
    } catch (error) {
      console.error('Error clearing leaderboard:', error)
      toast.error('Ups! Fehler beim Löschen der Rangliste! 🥺')
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    const milliseconds = Math.floor((seconds % 1) * 1000)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
  }

  const renderItem = (item: WishlistItem, index: number, itemsList: WishlistItem[]) => (
    <Card key={item.id} className={`mb-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
      item.reserved 
        ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200' 
        : 'bg-gradient-to-r from-blue-50 to-violet-50 border-2 border-blue-200'
    }`}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          {/* Reorder buttons on the left */}
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => moveItemUp(item, itemsList)}
              variant="outline"
              size="sm"
              disabled={index === 0}
              className="h-8 w-8 p-0 border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Nach oben"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => moveItemDown(item, itemsList)}
              variant="outline"
              size="sm"
              disabled={index === itemsList.length - 1}
              className="h-8 w-8 p-0 border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Nach unten"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-full sm:w-40 flex-shrink-0">
            <img
              src={getItemImageUrl(item.item, item.website, item.image_url)}
              alt={item.item}
              loading="lazy"
              className="w-full h-40 sm:h-28 object-cover rounded-md border"
            />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-3">
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
                <p className="flex items-center gap-2 break-all">
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
          
          <div className="flex flex-wrap gap-2 sm:ml-4 mt-2 sm:mt-0 w-full sm:w-auto">
            <Button
              onClick={() => toggleReserved(item)}
              variant="outline"
              size="sm"
              className={`${
                item.reserved 
                  ? 'text-violet-700 border-2 border-violet-700 hover:bg-violet-50' 
                  : 'text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
              } w-full sm:w-auto`}
            >
              {item.reserved ? '🔄 Verfügbar machen' : '🎯 Als reserviert markieren'}
            </Button>
            
            <Button
              onClick={() => setEditingItem(item)}
              variant="outline"
              size="sm"
              className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 mr-1" />
              Bearbeiten
            </Button>
            
            <Button
              onClick={() => handleDeleteItem(item.id)}
              variant="outline"
              size="sm"
              className="border-2 border-red-600 text-red-600 hover:bg-red-50 w-full sm:w-auto"
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

  if (showContentManagement) {
    return <ContentManagementPanel onBack={() => setShowContentManagement(false)} />
  }

  if (showLeaderboard) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            Rangliste verwalten
          </h1>
          <Button
            onClick={() => setShowLeaderboard(false)}
            variant="outline"
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zum Admin
          </Button>
        </div>

        <Card className="bg-white shadow-2xl border-0 overflow-hidden mb-6">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <Trophy className="h-7 w-7" />
              Spiel-Rangliste
            </CardTitle>
            <p className="text-amber-100 mt-2">
              Hier siehst du alle Einträge der City Stroller Rangliste. Du kannst die gesamte Rangliste löschen.
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="text-lg font-semibold text-gray-700">
                {leaderboard.length} Einträge gefunden
              </div>
              <Button
                onClick={clearLeaderboard}
                variant="outline"
                className="border-2 border-red-500 text-red-600 hover:bg-red-50"
                disabled={leaderboard.length === 0}
              >
                <Trash className="h-4 w-4 mr-2" />
                Alle löschen
              </Button>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl">Keine Einträge in der Rangliste</p>
                <p className="text-sm mt-2">Spiele das City Stroller Spiel, um Einträge zu erstellen!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      index === 0 
                        ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' 
                        : index < 3 
                        ? 'bg-gradient-to-r from-gray-50 to-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 
                          ? 'bg-yellow-400 text-yellow-900' 
                          : index < 3 
                          ? 'bg-blue-400 text-blue-900'
                          : 'bg-gray-400 text-gray-900'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{entry.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(entry.date_iso).toLocaleDateString('de-DE')} um {new Date(entry.date_iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">
                        {formatTime(entry.time_seconds)}
                      </div>
                      <div className="text-sm text-gray-500">Zeit</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 sm:mb-12">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🛠️ Dein Admin-Bereich
          </h1>
          <p className="text-base sm:text-lg text-gray-700">Verwalte deine Baby-Wunschliste mit Liebe! 💕</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-6 py-3 flex-1 sm:flex-none"
          >
            <Plus className="h-5 w-5 mr-2" />
            Neues Geschenk hinzufügen
          </Button>
          
          <Button
            onClick={() => setShowContentManagement(true)}
            variant="outline"
            className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 flex-1 sm:flex-none"
          >
            <Type className="h-5 w-5 mr-2" />
            Inhalte bearbeiten
          </Button>
          
          <Button
            onClick={() => setShowLeaderboard(true)}
            variant="outline"
            className="border-2 border-amber-600 text-amber-600 hover:bg-amber-50 px-6 py-3 flex-1 sm:flex-none"
          >
            <Trophy className="h-5 w-5 mr-2" />
            Rangliste verwalten
          </Button>
          
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-6 py-3 flex-1 sm:flex-none"
          >
            <Settings className="h-5 w-5 mr-2" />
            E-Mail-Einstellungen
          </Button>
          
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-2 border-gray-400 text-gray-700 hover:bg-gray-50 hover:border-gray-500 px-6 py-3 flex-1 sm:flex-none"
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
            {items.filter(item => !item.reserved).map((item, index, arr) => renderItem(item, index, arr))}
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
            {items.filter(item => item.reserved).map((item, index, arr) => renderItem(item, index, arr))}
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
