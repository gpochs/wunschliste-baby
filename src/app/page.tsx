import { Suspense } from 'react'
import Link from 'next/link'
import Wishlist from '@/components/Wishlist'
import Header from '@/components/Header'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-6">
          <Link href="/game">
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              🎮 Zum Spiel
            </Button>
          </Link>
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
