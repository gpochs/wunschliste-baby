'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTileSize } from './useTileSize'
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Settings
} from 'lucide-react'

// Tile-Typen
enum TileType {
  EMPTY = 'EMPTY',
  ROAD = 'ROAD',
  WALL = 'WALL',
  TREE = 'TREE',
  GOAL = 'GOAL',
  DECOR = 'DECOR'
}

// Fahrzeug-Typen
interface Vehicle {
  type: 'car' | 'moto' | 'scooter' | 'bike'
  speed: number
  path: { x: number; y: number }[]
  t: number
  currentPathIndex: number
}

// Spiel-Status
type GameStatus = 'playing' | 'win' | 'fail'

// Stroller-Position
interface Position {
  x: number
  y: number
}

const GRID_SIZE = 20
const START_POSITION: Position = { x: 1, y: 1 }
const GOAL_POSITION = { x: 16, y: 15 }

export default function CityStroller() {
  const tileSize = useTileSize()
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const [strollerPos, setStrollerPos] = useState<Position>(START_POSITION)
  const [cityMap, setCityMap] = useState<TileType[][]>([])
  // Fahrzeuge im Ref für Performance
  const [trafficDensity, setTrafficDensity] = useState(100)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  
  const vehiclesRef = useRef<Vehicle[]>([])
  const animationFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // Stadt generieren
  const buildCityMap = useCallback((): TileType[][] => {
    const map: TileType[][] = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(TileType.EMPTY)
    )

    // Außenmauer
    for (let i = 0; i < GRID_SIZE; i++) {
      map[0][i] = TileType.WALL
      map[GRID_SIZE - 1][i] = TileType.WALL
      map[i][0] = TileType.WALL
      map[i][GRID_SIZE - 1] = TileType.WALL
    }

    // Straßennetz (Stadt-Gitter + Loops)
    const horizontalRows = [3, 6, 9, 12, GRID_SIZE - 4]
    const verticalCols = [3, 6, 9, 12, GRID_SIZE - 4]
    // Horizontale Straßen
    horizontalRows.forEach((row) => {
      for (let x = 2; x < GRID_SIZE - 2; x++) {
        map[row][x] = TileType.ROAD
      }
    })
    // Vertikale Straßen
    verticalCols.forEach((col) => {
      for (let y = 2; y < GRID_SIZE - 2; y++) {
        map[y][col] = TileType.ROAD
      }
    })

    // Ziel (2x2)
    map[GOAL_POSITION.y][GOAL_POSITION.x] = TileType.GOAL
    map[GOAL_POSITION.y][GOAL_POSITION.x + 1] = TileType.GOAL
    map[GOAL_POSITION.y + 1][GOAL_POSITION.x] = TileType.GOAL
    map[GOAL_POSITION.y + 1][GOAL_POSITION.x + 1] = TileType.GOAL

    // Start-Position freigeben
    map[START_POSITION.y][START_POSITION.x] = TileType.EMPTY

    // Landmarken hinzufügen (Gebäude/Hochhäuser/Schule)
    const landmarks = [
      { x: 5, y: 5, type: TileType.WALL },
      { x: 7, y: 7, type: TileType.WALL },
      { x: 12, y: 5, type: TileType.WALL },
      { x: 14, y: 7, type: TileType.WALL },
      { x: 8, y: 12, type: TileType.WALL },
      { x: 11, y: 12, type: TileType.WALL },
      { x: 9, y: 10, type: TileType.WALL },
      { x: 4, y: 12, type: TileType.WALL },
      { x: 15, y: 10, type: TileType.WALL }
    ]

    landmarks.forEach(landmark => {
      if (map[landmark.y] && map[landmark.y][landmark.x] === TileType.EMPTY) {
        map[landmark.y][landmark.x] = landmark.type
      }
    })

    // Wald (3 Tiles)
    const forestPositions = [
      { x: 4, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 9 }
    ]
    
    forestPositions.forEach(pos => {
      if (map[pos.y] && map[pos.y][pos.x] === TileType.EMPTY) {
        map[pos.y][pos.x] = TileType.TREE
      }
    })

    // Dekorationen (Ampeln, Sehenswürdigkeiten – nicht blockierend)
    const decorPositions = [
      { x: 3, y: 3 },
      { x: 6, y: 6 },
      { x: 9, y: 9 },
      { x: 12, y: 12 },
      { x: 3, y: GRID_SIZE - 4 },
      { x: GRID_SIZE - 4, y: 3 },
      { x: 9, y: 3 },
      { x: 12, y: GRID_SIZE - 4 }
    ]
    
    decorPositions.forEach(pos => {
      if (map[pos.y] && map[pos.y][pos.x] === TileType.EMPTY) {
        map[pos.y][pos.x] = TileType.DECOR
      }
    })

    return map
  }, [])

  // Rechteckige Loop-Pfade aus dem Straßennetz erzeugen
  const buildLoopPaths = useCallback((): { x: number; y: number }[][] => {
    const loops: { x: number; y: number }[][] = []
    const rings = [
      { top: 3, left: 3, right: GRID_SIZE - 4, bottom: GRID_SIZE - 4 },
      { top: 6, left: 6, right: GRID_SIZE - 7, bottom: GRID_SIZE - 7 },
      { top: 9, left: 3, right: GRID_SIZE - 4, bottom: 12 }
    ]
    for (const r of rings) {
      const path: { x: number; y: number }[] = []
      for (let x = r.left; x <= r.right; x++) path.push({ x, y: r.top })
      for (let y = r.top + 1; y <= r.bottom; y++) path.push({ x: r.right, y })
      for (let x = r.right - 1; x >= r.left; x--) path.push({ x, y: r.bottom })
      for (let y = r.bottom - 1; y > r.top; y--) path.push({ x: r.left, y })
      // Nur Pfade, die komplett auf ROAD liegen
      if (path.every(p => cityMap[p.y]?.[p.x] === TileType.ROAD)) {
        loops.push(path)
      }
    }
    return loops
  }, [cityMap])

  // Fahrzeuge initialisieren (fest definierte Anzahl, auf Loops)
  const initializeVehicles = useCallback(() => {
    const density = trafficDensity / 100
    const counts = {
      car: Math.max(0, Math.round(3 * density)),
      moto: Math.max(0, Math.round(2 * density)),
      scooter: Math.max(0, Math.round(2 * density)),
      bike: Math.max(0, Math.round(2 * density))
    }

    const loopPaths = buildLoopPaths()
    const allVehicles: Vehicle[] = []
    const types: Vehicle['type'][] = ['car', 'moto', 'scooter', 'bike']

    types.forEach((type) => {
      const count = counts[type]
      for (let i = 0; i < count; i++) {
        const path = loopPaths[(i + Math.floor(Math.random() * loopPaths.length)) % Math.max(1, loopPaths.length)] || []
        if (path.length > 0) {
          const speed = type === 'car' ? 4 : type === 'moto' ? 3 : 2
          allVehicles.push({ type, speed, path, t: Math.random() * path.length, currentPathIndex: 0 })
        }
      }
    })

    vehiclesRef.current = allVehicles
  }, [buildLoopPaths, trafficDensity])

  // Spiel neu starten
  const restartGame = () => {
    setGameStatus('playing')
    setStrollerPos(START_POSITION)
    setCityMap(buildCityMap())
    vehiclesRef.current = []
    
    // Kurz warten, dann Fahrzeuge initialisieren
    setTimeout(() => {
      initializeVehicles()
    }, 100)
  }

  // Bewegung des Strollers
  const moveStroller = useCallback((dx: number, dy: number) => {
    if (gameStatus !== 'playing') return

    const newX = strollerPos.x + dx
    const newY = strollerPos.y + dy

    // Grenzen prüfen
    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) return

    // Kollision mit Wänden oder Bäumen prüfen
    if (cityMap[newY] && cityMap[newY][newX] === TileType.WALL) return
    if (cityMap[newY] && cityMap[newY][newX] === TileType.TREE) return

    // Neue Position setzen
    setStrollerPos({ x: newX, y: newY })

    // Ziel erreicht?
    if (cityMap[newY] && cityMap[newY][newX] === TileType.GOAL) {
      setGameStatus('win')
    }
  }, [strollerPos, cityMap, gameStatus])

  // Tastatur-Steuerung
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'playing') return

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          moveStroller(0, -1)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          moveStroller(0, 1)
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          moveStroller(-1, 0)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          moveStroller(1, 0)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveStroller, gameStatus])

  // Spiel-Loop
  useEffect(() => {
    if (gameStatus !== 'playing') return

    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000
      lastTimeRef.current = currentTime

      // Fahrzeuge bewegen
      vehiclesRef.current.forEach(vehicle => {
        vehicle.t += vehicle.speed * deltaTime * (reducedMotion ? 0.5 : 1)
        
        if (vehicle.t >= vehicle.path.length) {
          vehicle.t = 0
        }

        // Kollision mit Stroller prüfen
        const currentIndex = Math.floor(vehicle.t)
        if (currentIndex < vehicle.path.length) {
          const vehiclePos = vehicle.path[currentIndex]
          if (vehiclePos.x === strollerPos.x && vehiclePos.y === strollerPos.y) {
            setGameStatus('fail')
            return
          }
        }
      })

      if (gameStatus === 'playing') {
        animationFrameRef.current = requestAnimationFrame(gameLoop)
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameStatus, strollerPos, reducedMotion])

  // Stadt beim ersten Laden generieren
  useEffect(() => {
    const newMap = buildCityMap()
    setCityMap(newMap)
  }, [buildCityMap])

  // Fahrzeuge initialisieren, wenn Stadt geladen ist
  useEffect(() => {
    if (cityMap.length > 0) {
      initializeVehicles()
    }
  }, [cityMap, initializeVehicles])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Tile rendern
  const renderTile = (x: number, y: number) => {
    const tileType = cityMap[y]?.[x] || TileType.EMPTY
    const isStrollerHere = x === strollerPos.x && y === strollerPos.y
    const isVehicleHere = vehiclesRef.current.some(vehicle => {
      const currentIndex = Math.floor(vehicle.t)
      if (currentIndex < vehicle.path.length) {
        const vehiclePos = vehicle.path[currentIndex]
        return vehiclePos.x === x && vehiclePos.y === y
      }
      return false
    })

    let tileClass = ''
    let tileContent: React.ReactNode = ''

    switch (tileType) {
      case TileType.ROAD:
        tileClass = 'bg-neutral-300 border border-neutral-400'
        tileContent = null
        break
      case TileType.WALL:
        tileClass = 'bg-neutral-800 border border-neutral-900 shadow-inner'
        tileContent = '🏠'
        break
      case TileType.TREE:
        tileClass = 'bg-green-700 border border-green-800'
        tileContent = '🌳'
        break
      case TileType.GOAL:
        tileClass = 'bg-amber-300 border border-amber-500 shadow-lg'
        tileContent = '🏠'
        break
      case TileType.DECOR:
        tileClass = 'bg-blue-200 border border-blue-300'
        tileContent = '🚦'
        break
      default:
        tileClass = 'bg-neutral-100 border border-neutral-200'
        break
    }

    return (
      <div
        key={`${x}-${y}`}
        className={`${tileClass} flex items-center justify-center text-xs transition-all duration-200 ${
          isStrollerHere ? 'ring-4 ring-blue-500 ring-opacity-75' : ''
        }`}
        style={{
          width: tileSize,
          height: tileSize,
          minWidth: tileSize,
          minHeight: tileSize,
          backgroundImage: tileType === TileType.ROAD ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 6px, transparent 6px, transparent 12px)' : undefined,
          backgroundSize: tileType === TileType.ROAD ? '100% 2px' : undefined,
          backgroundPosition: tileType === TileType.ROAD ? 'center' : undefined,
          backgroundRepeat: tileType === TileType.ROAD ? 'repeat-x' : undefined
        }}
        aria-label={`Tile bei Position ${x}, ${y}: ${tileType.toLowerCase()}`}
      >
        {isStrollerHere ? (
          <svg
            aria-label="Kinderwagen"
            viewBox="0 0 24 24"
            width={Math.round(tileSize * 0.8)}
            height={Math.round(tileSize * 0.8)}
          >
            <circle cx="7" cy="19" r="2" fill="#1e3a8a" />
            <circle cx="17" cy="19" r="2" fill="#1e3a8a" />
            <rect x="6" y="11" width="10" height="4" rx="2" fill="#3b82f6" />
            <path d="M6 11 Q10 3 18 8" fill="#60a5fa" />
          </svg>
        ) : isVehicleHere ? (
          <div className="text-sm" aria-label="Fahrzeug">🚗</div>
        ) : (
          tileContent
        )}
      </div>
    )
  }

  // Legende
  const renderLegend = () => (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      <Badge variant="outline" className="bg-neutral-100">
        🛣️ Straße
      </Badge>
      <Badge variant="outline" className="bg-neutral-100">
        ⬜ Frei
      </Badge>
      <Badge variant="outline" className="bg-neutral-100">
        🏠 Gebäude
      </Badge>
      <Badge variant="outline" className="bg-neutral-100">
        🌳 Wald
      </Badge>
      <Badge variant="outline" className="bg-amber-100 text-amber-800">
        🎯 Ziel
      </Badge>
      <Badge variant="outline" className="bg-blue-100 text-blue-800">
        🏛️ Sehenswürdigkeit
      </Badge>
    </div>
  )

  // Spiel-Status anzeigen
  const renderGameStatus = () => {
    if (gameStatus === 'win') {
      return (
        <div className="absolute inset-0 bg-violet-600/90 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4">Gewonnen!</h2>
            <p className="text-xl mb-6">Du hast den Kinderwagen sicher ans Ziel gebracht!</p>
            <Button onClick={restartGame} size="lg" className="bg-white text-violet-700 hover:bg-gray-100">
              <RotateCcw className="h-5 w-5 mr-2" />
              Nochmal spielen
            </Button>
          </div>
        </div>
      )
    }

    if (gameStatus === 'fail') {
      return (
        <div className="absolute inset-0 bg-red-500/90 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-3xl font-bold mb-4">Kollision!</h2>
            <p className="text-xl mb-6">Der Kinderwagen ist mit dem Verkehr kollidiert.</p>
            <Button onClick={restartGame} size="lg" className="bg-white text-red-600 hover:bg-gray-100">
              <RotateCcw className="h-5 w-5 mr-2" />
              Nochmal versuchen
            </Button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="relative">
      {/* Header mit Steuerung */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 border-b border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-800">City Stroller</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
            className="border-violet-300 text-violet-700 hover:bg-violet-100"
          >
            <Settings className="h-4 w-4 mr-2" />
            Optionen
          </Button>
        </div>

        {/* Optionen-Panel */}
        {showOptions && (
          <div className="bg-white rounded-lg p-4 shadow-md border border-indigo-200 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verkehrsdichte: {trafficDensity}%
                </label>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="30"
                  value={trafficDensity}
                  onChange={(e) => {
                    setTrafficDensity(Number(e.target.value))
                    setTimeout(initializeVehicles, 100)
                  }}
                  className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>40%</span>
                  <span>70%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    className="rounded border-gray-300 text-violet-700 focus:ring-violet-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Animationsarm</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Reduziert Geschwindigkeiten</p>
              </div>
            </div>
          </div>
        )}

        {renderLegend()}
      </div>

      {/* Spiel-Grid */}
      <div className="relative bg-white p-4">
        <div
          className="grid gap-0 mx-auto border-2 border-gray-300 rounded-lg overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${tileSize}px)`,
            width: GRID_SIZE * tileSize,
            height: GRID_SIZE * tileSize
          }}
          aria-label="Stadt-Labyrinth"
        >
          {Array.from({ length: GRID_SIZE }, (_, y) =>
            Array.from({ length: GRID_SIZE }, (_, x) => renderTile(x, y))
          )}
        </div>

        {renderGameStatus()}
      </div>

      {/* Mobile Steuerung */}
      <div className="bg-gray-50 p-4 border-t border-gray-200 sm:hidden">
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => moveStroller(0, -1)}
            disabled={gameStatus !== 'playing'}
            className="w-16 h-16"
            aria-label="Nach oben bewegen"
          >
            <ChevronUp className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex justify-center items-center space-x-4 mt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => moveStroller(-1, 0)}
            disabled={gameStatus !== 'playing'}
            className="w-16 h-16"
            aria-label="Nach links bewegen"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => moveStroller(1, 0)}
            disabled={gameStatus !== 'playing'}
            className="w-16 h-16"
            aria-label="Nach rechts bewegen"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex justify-center items-center space-x-4 mt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => moveStroller(0, 1)}
            disabled={gameStatus !== 'playing'}
            className="w-16 h-16"
            aria-label="Nach unten bewegen"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
