'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WishlistItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { ExternalLink, Gift, Heart } from 'lucide-react'
import ReserveDialog from './ReserveDialog'
import { toast } from 'sonner'

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
  const [showReserveDialog, setShowReserveDialog] = useState(false)

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
      toast.error('Fehler beim Laden der Wunschliste')
    } finally {
      setLoading(false)
    }
  }

  const handleReserve = (item: WishlistItem) => {
    if (item.reserved) {
      toast.info('Dieses Item ist bereits reserviert')
      return
    }
    setSelectedItem(item)
    setShowReserveDialog(true)
  }

  const handleReservationSuccess = () => {
    setShowReserveDialog(false)
    setSelectedItem(null)
    fetchItems() // Refresh the list
    toast.success('Item erfolgreich reserviert! Sie erhalten eine Bestätigung per E-Mail.')
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Noch keine Wünsche</h3>
        <p className="text-gray-500">Die Wunschliste wird bald mit tollen Geschenken gefüllt!</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card key={item.id} className={`transition-all hover:shadow-lg ${item.reserved ? 'opacity-75' : ''}`}>
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
              {item.notes && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Notizen:</span> {item.notes}
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                {item.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(item.website, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                )}
                
                <Button
                  onClick={() => handleReserve(item)}
                  disabled={item.reserved}
                  className={`flex-1 ${item.reserved ? 'bg-gray-300' : 'bg-pink-500 hover:bg-pink-600'}`}
                >
                  {item.reserved ? 'Reserviert' : 'Reservieren'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showReserveDialog && selectedItem && (
        <ReserveDialog
          item={selectedItem}
          open={showReserveDialog}
          onOpenChange={setShowReserveDialog}
          onSuccess={handleReservationSuccess}
        />
      )}
    </>
  )
}
