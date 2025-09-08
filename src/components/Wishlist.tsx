'use client'

import { useState, useEffect } from 'react'
import { WishlistItem } from '@/lib/types'
import { getItemImageUrl } from '@/lib/itemImage'
import { supabase } from '@/lib/supabase'
import ReserveDialog from './ReserveDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Gift, CheckCircle, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching items:', error)
        return
      }

      setItems(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReservationSuccess = () => {
    fetchItems()
    setDialogOpen(false)
    setSelectedItem(null)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedItem(null)
  }

  const openReserveDialog = (item: WishlistItem) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  const availableItems = items.filter(item => !item.reserved)
  const reservedItems = items.filter(item => item.reserved)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-500"></div>
        <span className="ml-4 text-lg text-gray-600">Lade deine Wunschliste... ✨</span>
      </div>
    )
  }

  const renderItem = (item: WishlistItem, isReserved: boolean = false) => (
    <Card key={item.id} className={`mb-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
      isReserved 
        ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200' 
        : 'bg-gradient-to-r from-blue-50 to-violet-50 border-blue-200'
    }`}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="w-full sm:w-40 sm:flex-shrink-0">
            <img
              src={getItemImageUrl(item.item, item.website, item.image_url)}
              alt={item.item}
              loading="lazy"
              className="w-full h-28 object-cover rounded-md border"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className={`text-xl font-bold ${
                isReserved ? 'text-gray-700' : 'text-violet-800'
              }`}>
                {item.item}
              </h3>
              {isReserved ? (
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
                  <span className="font-medium">Link:</span>{' '}
                  <a 
                    href={item.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-medium"
                  >
                    Website öffnen <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
              {item.notes && (
                <p className="flex items-center gap-2">
                  <span className="text-purple-600">💭</span>
                  <span className="font-medium">Notizen:</span> {item.notes}
                </p>
              )}
              {isReserved && item.reserved_by && (
                <p className="text-violet-800 font-medium bg-violet-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
                  <span>🎉</span>
                  Reserviert von: {item.reserved_by}
                </p>
              )}
            </div>
          </div>
          
          {!isReserved && (
            <Button
              onClick={() => openReserveDialog(item)}
              className={`ml-6 px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                'bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700'
              }`}
            >
              <Gift className="h-5 w-5 mr-2" />
              Reservieren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 min-h-screen">
      <div className="text-center mb-12">
        <div className="flex justify-center items-center gap-3 mb-4">
          <span className="text-4xl">👶</span>
          <span className="text-4xl">🍼</span>
          <span className="text-4xl">🦄</span>
          <span className="text-4xl">⭐</span>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Unsere Baby-Wunschliste
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
          Hallo du Liebe:r! 🥰 Wähle ein Item aus und reserviere es mit deiner E-Mail-Adresse. 
          Vielen Dank, dass du uns bei der Vorbereitung auf unser kleines Wunder unterstützen möchtest! 💕
        </p>
      </div>

      {/* Bilder unter Titel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <img src="/images/hochzeit.jpg" alt="Hochzeit" className="w-full h-64 object-cover rounded-xl border" />
        <img src="/images/baby-14-08.jpg" alt="Baby 14.08" className="w-full h-64 object-cover rounded-xl border" />
      </div>

      {/* Verfügbare Items */}
      <div className="mb-16">
          <CardHeader className="px-0 pb-6">
          <CardTitle className="text-3xl font-bold text-indigo-700 flex items-center justify-center gap-3">
            <Gift className="h-8 w-8" />
            <span>Verfügbare Items</span>
            <span className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-xl font-bold">
              {availableItems.length}
            </span>
          </CardTitle>
        </CardHeader>
        
        {availableItems.length === 0 ? (
          <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-violet-700 mb-2">Alle Geschenke sind reserviert!</h3>
              <p className="text-violet-600 text-lg">Du bist die Beste/der Beste! Vielen Dank für deine Unterstützung! 💖</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {availableItems.map(item => renderItem(item, false))}
          </div>
        )}
      </div>

      {/* City Stroller inline zwischen den Listen */}
      <div className="mb-16">
        <Card className="bg-white border-2 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-indigo-700 flex items-center gap-3">
              <Gamepad2 className="h-7 w-7" /> City Stroller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border">
              <iframe title="City Stroller" src="/game" className="w-full h-[680px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservierte Items */}
      {reservedItems.length > 0 && (
        <div className="mb-16">
          <CardHeader className="px-0 pb-6">
            <CardTitle className="text-3xl font-bold text-gray-700 flex items-center justify-center gap-3">
              <CheckCircle className="h-8 w-8" />
              <span>Bereits reserviert</span>
              <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-xl font-bold">
                {reservedItems.length}
              </span>
            </CardTitle>
          </CardHeader>
          
          <div className="space-y-6">
            {reservedItems.map(item => renderItem(item, true))}
          </div>
        </div>
      )}


      {selectedItem && (
        <ReserveDialog
          item={selectedItem}
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSuccess={handleReservationSuccess}
        />
      )}
    </div>
  )
}
