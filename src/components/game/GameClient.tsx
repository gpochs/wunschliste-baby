'use client'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

// Dynamischer Import der Game-Komponente (Client-seitig)
const CityStroller = dynamic(() => import('./CityStroller'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-24">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500"></div>
      <span className="ml-4 text-xl text-gray-600">Lade das Spiel... 🎮</span>
    </div>
  )
})

export default function GameClient() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-3 mb-4">
          <span className="text-4xl">🎮</span>
          <span className="text-4xl">🚗</span>
          <span className="text-4xl">👶</span>
          <span className="text-4xl">🏙️</span>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-4">
          City Stroller
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed mb-6">
          Bringe den Kinderwagen sicher durch die Stadt! 🚗 
          Bewege dich mit den Pfeiltasten oder WASD und vermeide den Verkehr.
        </p>
        
        <div className="flex justify-center items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Wunschliste
            </Button>
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-full">
            <Gamepad2 className="h-4 w-4" />
            <span>Steuerung: Pfeiltasten oder WASD</span>
          </div>
        </div>
      </div>

      {/* Game Component */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <CityStroller />
      </div>

      {/* Footer Info */}
      <div className="text-center mt-8 text-sm text-gray-600">
        <p>🎯 Ziel: Erreiche das gelbe Zielgebiet ohne mit dem Verkehr zu kollidieren!</p>
        <p className="mt-1">💡 Tipp: Nutze die Straßen und freien Flächen für deinen Weg.</p>
      </div>
    </div>
  )
}
