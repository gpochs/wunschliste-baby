'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Baby, Settings } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-800 hover:text-pink-600 transition-colors">
          <Baby className="h-8 w-8 text-pink-500" />
          Baby-Wunschliste
        </Link>
        
        <Link href="/admin">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Admin
          </Button>
        </Link>
      </div>
    </header>
  )
}
