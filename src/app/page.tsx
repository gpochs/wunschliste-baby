import { Suspense } from 'react'
import Wishlist from '@/components/Wishlist'
import Header from '@/components/Header'
import { Toaster } from '@/components/ui/sonner'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🍼 Unsere Baby-Wunschliste 🍼
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Vielen Dank, dass Sie uns bei der Vorbereitung auf unser kleines Wunder unterstützen möchten! 
            Wählen Sie ein Geschenk aus der Liste aus und wir werden Ihnen eine Bestätigung per E-Mail senden.
          </p>
        </div>
        
        <Suspense fallback={
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          </div>
        }>
          <Wishlist />
        </Suspense>
      </main>
      <Toaster />
    </div>
  )
}
