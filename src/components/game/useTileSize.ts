'use client'

import { useState, useEffect } from 'react'

export function useTileSize() {
  const [tileSize, setTileSize] = useState(24) // Default mobile

  useEffect(() => {
    const updateTileSize = () => {
      const width = window.innerWidth
      
      if (width >= 1024) {
        setTileSize(34) // Desktop
      } else if (width >= 768) {
        setTileSize(28) // Tablet
      } else {
        setTileSize(24) // Mobile
      }
    }

    // Initial setzen
    updateTileSize()

    // Event listener für Resize
    window.addEventListener('resize', updateTileSize)

    // Cleanup
    return () => window.removeEventListener('resize', updateTileSize)
  }, [])

  return tileSize
}
