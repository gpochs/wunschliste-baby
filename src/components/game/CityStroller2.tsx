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

enum TileType {
  EMPTY = 'EMPTY',
  ROAD = 'ROAD',
  WALL = 'WALL',
  TREE = 'TREE',
  GOAL = 'GOAL',
  DECOR = 'DECOR'
}

interface GridPoint { x: number; y: number }

interface Vehicle {
  type: 'car' | 'moto' | 'scooter' | 'bike' | 'truck' | 'ambulance' | 'bus' | 'taxi' | 'police'
  speedTilesPerSecond: number
  path: GridPoint[]
  t: number
}

type GameStatus = 'playing' | 'win' | 'fail'

const GRID_SIZE = 20
// Start unten links (innen) auf der Perimeterstraße
const START: GridPoint = { x: 2, y: GRID_SIZE - 2 }
// Ziel weiter nach links verschoben (4 Felder): oben rechts-nah, ~9 vom linken Rand
const GOAL: GridPoint = { x: GRID_SIZE - 9, y: 5 }

export default function CityStroller2() {
  const tileSize = useTileSize()
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const [stroller, setStroller] = useState<GridPoint>(START)
  const [city, setCity] = useState<TileType[][]>([])
  const [showOptions, setShowOptions] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [playerName, setPlayerName] = useState('')
  const [leaderboard, setLeaderboard] = useState<{ name: string; timeSeconds: number; dateIso: string }[]>([])
  const [saveState, setSaveState] = useState<'idle'|'saving'|'done'|'error'>('idle')

  const vehiclesRef = useRef<Vehicle[]>([])
  const rafRef = useRef<number>(0)
  const lastTsRef = useRef<number>(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const poiIconByKeyRef = useRef<Record<string, string>>({})
  const decorIconByKeyRef = useRef<Record<string, string>>({})

  const formatTime = (secs: number) => {
    const mm = Math.floor(secs / 60)
    const ss = Math.floor(secs % 60)
    const ms = Math.floor((secs - Math.floor(secs)) * 1000)
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  }

  const buildCity = useCallback((): TileType[][] => {
    const m: TileType[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(TileType.EMPTY))
    // Außenmauer
    for (let i = 0; i < GRID_SIZE; i++) {
      m[0][i] = TileType.WALL
      m[GRID_SIZE - 1][i] = TileType.WALL
      m[i][0] = TileType.WALL
      m[i][GRID_SIZE - 1] = TileType.WALL
    }

    // Enges orthogonales Straßennetz
    const rows = [2,4,6,8,10,12,14,16]
    const cols = [2,4,6,8,10,12,14,16]
    rows.forEach(r => { for (let x = 1; x < GRID_SIZE - 1; x++) m[r][x] = TileType.ROAD })
    cols.forEach(c => { for (let y = 1; y < GRID_SIZE - 1; y++) m[y][c] = TileType.ROAD })

    // Perimeter-Ringstraße
    for (let i = 1; i < GRID_SIZE - 1; i++) {
      m[1][i] = TileType.ROAD
      m[GRID_SIZE - 2][i] = TileType.ROAD
      m[i][1] = TileType.ROAD
      m[i][GRID_SIZE - 2] = TileType.ROAD
    }

    // Start/Goal
    m[START.y][START.x] = TileType.EMPTY
    m[GOAL.y][GOAL.x] = TileType.GOAL
    m[GOAL.y][GOAL.x+1] = TileType.GOAL
    m[GOAL.y+1][GOAL.x] = TileType.GOAL
    m[GOAL.y+1][GOAL.x+1] = TileType.GOAL

    // Dichte POI Blöcke (keine Randkacheln)
    const blocks: Array<{ x:number; y:number; w:number; h:number; icon:string }>= [
      // Kern-POIs
      { x:5, y:4, w:2, h:2, icon:'🏫' }, // Schule
      { x:12, y:4, w:3, h:3, icon:'🏬' }, // Mall
      { x:10, y:12, w:3, h:2, icon:'🏥' }, // Spital
      { x:6, y:12, w:4, h:3, icon:'🏟️' }, // Stadion
      { x:8, y:6, w:2, h:2, icon:'🍽️' }, // Restaurant
      { x:4, y:6, w:2, h:2, icon:'🏛️' }, // Rathaus
      { x:3, y:10, w:2, h:2, icon:'🏠' },
      { x:15, y:6, w:2, h:2, icon:'🏢' },
      { x:11, y:14, w:3, h:2, icon:'🏨' },
      { x:15, y:14, w:2, h:2, icon:'🏦' },
      { x:13, y:9, w:2, h:2, icon:'🏙️' },
      { x:5, y:8, w:2, h:2, icon:'🏘️' },
      // Erweiterte Stadtvielfalt
      { x:7, y:9, w:2, h:2, icon:'⛪' },
      { x:9, y:7, w:2, h:2, icon:'🏗️' }, // Baustelle
      { x:12, y:7, w:2, h:2, icon:'🏫' }, // zweite Schule
      { x:14, y:10, w:2, h:2, icon:'🛍️' }, // Einkaufszeile
      { x:9, y:11, w:2, h:2, icon:'🏥' }, // Klinik
      { x:6, y:9, w:2, h:2, icon:'🏢' },
      { x:4, y:12, w:2, h:2, icon:'🏣' }, // Postamt
      { x:7, y:14, w:2, h:2, icon:'🏚️' }, // altes Haus
      { x:12, y:13, w:2, h:2, icon:'🏫' },
      { x:8, y:10, w:2, h:2, icon:'🏪' }, // Laden
      { x:6, y:7, w:2, h:2, icon:'🧱' }, // Mauer/Block
    ]
    const poiMap: Record<string,string> = {}
    blocks.forEach(b=>{
      for(let yy=b.y; yy<b.y+b.h; yy++){
        for(let xx=b.x; xx<b.x+b.w; xx++){
          if (m[yy][xx]===TileType.EMPTY) m[yy][xx]=TileType.WALL
          poiMap[`${xx},${yy}`]=b.icon
        }
      }
    })
    poiIconByKeyRef.current = poiMap

    // POIs direkt am inneren Spielrand (an die Perimeterstraße angrenzend)
    const edgePois: Array<{x:number;y:number;icon:string}> = [
      {x:2,y:4,icon:'🏥'},{x:GRID_SIZE-3,y:5,icon:'🏫'},
      {x:4,y:2,icon:'🏛️'},{x:5,y:GRID_SIZE-3,icon:'🏪'},
      {x:GRID_SIZE-3,y:GRID_SIZE-5,icon:'🏬'},{x:GRID_SIZE-5,y:2,icon:'⛪'},
      {x:2,y:GRID_SIZE-4,icon:'🚏'},{x:GRID_SIZE-4,y:2,icon:'🗽'},
      {x:GRID_SIZE-3,y:3,icon:'🏨'},{x:3,y:GRID_SIZE-3,icon:'🏦'}
    ]
    edgePois.forEach(p=>{
      if (m[p.y][p.x]===TileType.EMPTY){
        m[p.y][p.x]=TileType.WALL
        poiMap[`${p.x},${p.y}`]=p.icon
      }
    })

    // Gleichmäßig verteilte Rand-POIs: direkt an die Perimeterstraße angrenzend (eine Kachel entfernt): x=3 / x=GRID_SIZE-4, y=3 / y=GRID_SIZE-4
    const beltIcons = ['🏥','🏫','🏛️','🏦','🏪','🏬','⛪','🏨']
    let bi = 0
    // senkrechte Bänder links/rechts
    for (let y = 3; y <= GRID_SIZE - 4; y += 2) {
      for (const x of [3, GRID_SIZE - 4]) {
        // nicht Start-/Ziel-Kacheln überschreiben
        const inGoal = (x === GOAL.x || x === GOAL.x + 1) && (y === GOAL.y || y === GOAL.y + 1)
        const isStart = x === START.x && y === START.y
        if (!inGoal && !isStart && m[y][x] === TileType.EMPTY) {
          m[y][x] = TileType.WALL
          poiMap[`${x},${y}`] = beltIcons[bi % beltIcons.length]
          bi++
        }
      }
    }
    // waagerechte Bänder oben/unten
    for (let x = 3; x <= GRID_SIZE - 4; x += 2) {
      for (const y of [3, GRID_SIZE - 4]) {
        const inGoal = (x === GOAL.x || x === GOAL.x + 1) && (y === GOAL.y || y === GOAL.y + 1)
        const isStart = x === START.x && y === START.y
        if (!inGoal && !isStart && m[y][x] === TileType.EMPTY) {
          m[y][x] = TileType.WALL
          poiMap[`${x},${y}`] = beltIcons[bi % beltIcons.length]
          bi++
        }
      }
    }

    // Wälder (Cluster)
    const forests = [ [ {x:16,y:6},{x:16,y:7},{x:15,y:7} ], [ {x:7,y:15},{x:8,y:15},{x:7,y:14} ] ]
    forests.flat().forEach(p=>{ if (m[p.y][p.x]===TileType.EMPTY) m[p.y][p.x]=TileType.TREE })

    // Deko (Ampeln/Plaza… blockierend laut Vorgabe)
    const decorSpots: GridPoint[] = [
      {x:6,y:6},{x:9,y:9},{x:12,y:12},{x:5,y:13},{x:14,y:5},{x:9,y:6},{x:12,y:9},{x:7,y:3},
      {x:3,y:8},{x:8,y:3},{x:10,y:8},{x:11,y:6},{x:13,y:11},{x:6,y:11},{x:4,y:9},{x:15,y:11}
    ]
    const decorIcons = ['🚦','⛲','🅿️','☕','🍔','🚏','🎡','🚌','🚦','🌉','🚲','🏞️','🧋','🍟','🧁','🎠']
    const decorMap: Record<string,string> = {}
    decorSpots.forEach((p,i)=>{
      if (m[p.y][p.x]===TileType.EMPTY) {
        m[p.y][p.x]=TileType.DECOR
        decorMap[`${p.x},${p.y}`]=decorIcons[i%decorIcons.length]
      }
    })
    decorIconByKeyRef.current = decorMap

    // Zusätzliche Hindernisse nahe am Rand (ohne die Perimeterstraße zu blockieren)
    const edgeBand: GridPoint[] = [
      {x:3,y:2},{x:16,y:3},{x:3,y:GRID_SIZE-3},{x:GRID_SIZE-3,y:16},
      {x:5,y:2},{x:2,y:5},{x:GRID_SIZE-3,y:5},{x:5,y:GRID_SIZE-3}
    ]
    edgeBand.forEach(p=>{ if (m[p.y][p.x]===TileType.EMPTY) m[p.y][p.x]=TileType.DECOR })

    return m
  }, [])

  const buildLoops = useCallback((m: TileType[][]): GridPoint[][] => {
    const loops: GridPoint[][] = []
    const pushRect = (t:number,l:number,r:number,b:number)=>{
      const path: GridPoint[] = []
      for(let x=l;x<=r;x++) path.push({x,y:t})
      for(let y=t+1;y<=b;y++) path.push({x:r,y})
      for(let x=r-1;x>=l;x--) path.push({x,y:b})
      for(let y=b-1;y>t;y--) path.push({x:l,y})
      if (path.every(p=>m[p.y]?.[p.x]===TileType.ROAD)) loops.push(path)
    }
    // Perimeter + viele innere Rechtecke
    const frames = [
      {t:1,l:1,r:GRID_SIZE-2,b:GRID_SIZE-2},
      {t:2,l:2,r:GRID_SIZE-3,b:GRID_SIZE-3},
      {t:3,l:3,r:GRID_SIZE-4,b:GRID_SIZE-4},
      {t:4,l:4,r:GRID_SIZE-5,b:GRID_SIZE-5},
      {t:6,l:6,r:GRID_SIZE-7,b:GRID_SIZE-7},
      {t:8,l:8,r:GRID_SIZE-9,b:GRID_SIZE-9},
    ]
    frames.forEach(f=>pushRect(f.t,f.l,f.r,f.b))

    // Zusätzlich: alle kleinen Rechtecke zwischen benachbarten Straßenreihen/-spalten
    const rows = [2,4,6,8,10,12,14,16]
    const cols = [2,4,6,8,10,12,14,16]
    for (let ri=0; ri<rows.length-1; ri++) {
      for (let ci=0; ci<cols.length-1; ci++) {
        const top = rows[ri]
        const bottom = rows[ri+1]
        const left = cols[ci]
        const right = cols[ci+1]
        // nur Rechtecke, die mindestens 2x2 groß sind
        if (bottom-top>=2 && right-left>=2) pushRect(top,left,right,bottom)
      }
    }

    // Lange Band-Loops: untere Stadthälfte (erzwingt Verkehr unten)
    pushRect(12, 2, GRID_SIZE-3, 16)
    pushRect(14, 2, GRID_SIZE-3, 16)

    // Vertikale Band-Loops für rechten/linken Sektor
    pushRect(2, 12, 14, GRID_SIZE-3)
    pushRect(2, GRID_SIZE-5, GRID_SIZE-3, GRID_SIZE-3)
    return loops
  },[])

  const initializeVehicles = useCallback((m: TileType[][])=>{
    const loops = buildLoops(m)
    const perimeter = loops[0] || []
    const all: Vehicle[] = []
    const add = (type: Vehicle['type'], path: GridPoint[], speed: number)=>{
      if (path.length===0) return
      all.push({ type, speedTilesPerSecond: speed, path, t: Math.random()*path.length })
    }
    // Hohe Dichte und Vielfalt – gleichmäßiger verteilt über Loops
    const L = Math.max(loops.length, 1)
    // zunächst eine Runde: pro Loop 1 Auto (bis zu gewünschter Anzahl)
    let carsToPlace = 20
		for (let k=0; k<L && carsToPlace>0; k++) { add('car', loops[k]||perimeter, 1.0); carsToPlace-- }
		for (let i=0; i<carsToPlace; i++) add('car', loops[(i)%L]||perimeter, 1.0)
		for(let i=0;i<12;i++) add('moto', loops[(i+20)%L]||perimeter, 0.9)
		for(let i=0;i<8;i++) add('scooter', loops[(i+18)%L]||perimeter, 0.6)
		for(let i=0;i<8;i++) add('bike', loops[(i+14)%L]||perimeter, 0.6)
		for(let i=0;i<5;i++) add('truck', loops[(i+14)%L]||perimeter, 0.8)
		for(let i=0;i<4;i++) add('ambulance', loops[(i+13)%L]||perimeter, 1.1)
		for(let i=0;i<14;i++) add('bus', loops[(i+12)%L]||perimeter, 0.7)
		for(let i=0;i<12;i++) add('taxi', loops[(i+9)%L]||perimeter, 1.0)
		for(let i=0;i<5;i++) add('police', loops[(i+8)%L]||perimeter, 1.3)
    vehiclesRef.current = all
  },[buildLoops])

  const restart = () => {
    setGameStatus('playing')
    setStroller(START)
    setElapsedSeconds(0)
    const m = buildCity()
    setCity(m)
    initializeVehicles(m)
  }

  useEffect(()=>{ restart() },[restart])

  // Leaderboard
  useEffect(()=>{
    try{ const raw=localStorage.getItem('cityStrollerLeaderboard'); if(raw) setLeaderboard(JSON.parse(raw)) }catch{}
  },[])
  const saveLeaderboard=(entries: typeof leaderboard)=>{
    setLeaderboard(entries)
    try{ localStorage.setItem('cityStrollerLeaderboard', JSON.stringify(entries)) }catch{}
  }
  const handleSaveScore = () => {
    const name = playerName.trim()
    if (!name) return
    try {
      setSaveState('saving')
      const next=[...leaderboard,{name,timeSeconds:elapsedSeconds,dateIso:new Date().toISOString()}]
        .sort((a,b)=>a.timeSeconds-b.timeSeconds)
        .slice(0,10)
      saveLeaderboard(next)
      setSaveState('done')
    } catch {
      setSaveState('error')
    }
  }

  const move = useCallback((dx:number, dy:number)=>{
    if (gameStatus!=='playing') return
    const nx = stroller.x + dx
    const ny = stroller.y + dy
    if (nx<0||nx>=GRID_SIZE||ny<0||ny>=GRID_SIZE) return
    const nextTile = city[ny]?.[nx]
    if (nextTile===TileType.WALL || nextTile===TileType.TREE || nextTile===TileType.DECOR){ setGameStatus('fail'); return }
    setStroller({x:nx,y:ny})
    if (nextTile===TileType.GOAL) setGameStatus('win')
  },[gameStatus, stroller, city])

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if (gameStatus!=='playing') return
      const k=e.key.toLowerCase()
      if(['arrowup','w'].includes(k)){ e.preventDefault(); move(0,-1)}
      else if(['arrowdown','s'].includes(k)){ e.preventDefault(); move(0,1)}
      else if(['arrowleft','a'].includes(k)){ e.preventDefault(); move(-1,0)}
      else if(['arrowright','d'].includes(k)){ e.preventDefault(); move(1,0)}
    }
    window.addEventListener('keydown', onKey)
    return ()=>window.removeEventListener('keydown', onKey)
  },[move, gameStatus])

  // Loop
  useEffect(()=>{
    if (gameStatus!=='playing') return
    const loop=(ts:number)=>{
      if (!lastTsRef.current) lastTsRef.current=ts
      const dt=(ts-lastTsRef.current)/1000
      lastTsRef.current=ts
      setElapsedSeconds(prev=>prev+dt)
      // Fahrzeuge animieren
      vehiclesRef.current.forEach(v=>{
        v.t += v.speedTilesPerSecond*dt
        const len=v.path.length
        if (v.t>=len) v.t-=len
        const idx=Math.floor(v.t)
        const pos=v.path[idx]
        if (pos.x===stroller.x && pos.y===stroller.y){ setGameStatus('fail') }
      })
      if (gameStatus==='playing') rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    return ()=>{ if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  },[gameStatus, stroller])

  // Touch
  const onTouchStart=(e:React.TouchEvent)=>{ const t=e.touches[0]; touchStartRef.current={x:t.clientX,y:t.clientY} }
  const onTouchEnd=(e:React.TouchEvent)=>{
    const start=touchStartRef.current; if(!start) return
    const t=e.changedTouches[0]; const dx=t.clientX-start.x; const dy=t.clientY-start.y
    const ax=Math.abs(dx), ay=Math.abs(dy); if (ax<20&&ay<20) return
    if (ax>ay) move(dx>0?1:-1,0); else move(0,dy>0?1:-1)
    touchStartRef.current=null
  }

  const renderTile=(x:number,y:number)=>{
    const t = city[y]?.[x] ?? TileType.EMPTY
    const isStroller = stroller.x===x && stroller.y===y
    const vHere = vehiclesRef.current.some(v=>{
      const idx=Math.floor(v.t); const p=v.path[idx]; return p && p.x===x && p.y===y
    })

    let cls=''
    let content: React.ReactNode=null
    if (t===TileType.ROAD){
      cls='bg-neutral-400 border border-neutral-500'
    } else if (t===TileType.WALL){
      cls='bg-neutral-800 border border-neutral-900 shadow-inner'
      content = poiIconByKeyRef.current[`${x},${y}`] ?? null
    } else if (t===TileType.TREE){
      cls='bg-green-700 border border-green-800'
      content='🌳'
    } else if (t===TileType.GOAL){
      cls='bg-amber-300 border border-amber-500 shadow-lg'
      content='🏡'
    } else if (t===TileType.DECOR){
      cls='bg-blue-200 border border-blue-300'
      content=decorIconByKeyRef.current[`${x},${y}`] ?? '🚦'
    } else {
      cls='bg-neutral-100 border border-neutral-200'
    }

    return (
      <div key={`${x}-${y}`}
        className={`${cls} flex items-center justify-center text-xs ${isStroller?'ring-4 ring-blue-500 ring-opacity-75':''}`}
        style={{
          width: tileSize, height: tileSize, minWidth: tileSize, minHeight: tileSize,
          backgroundImage: t===TileType.ROAD ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 8px)' : undefined,
          backgroundSize: t===TileType.ROAD ? '2px 100%' : undefined,
          backgroundPosition: t===TileType.ROAD ? 'center' : undefined,
          backgroundRepeat: t===TileType.ROAD ? 'repeat-x' : undefined,
        }}
        aria-label={`Tile ${x},${y}`}
      >
        {isStroller ? (
          <svg aria-label="Kinderwagen" viewBox="0 0 24 24" width={Math.round(tileSize*0.8)} height={Math.round(tileSize*0.8)}>
            <circle cx="7" cy="19" r="2" fill="#1e3a8a" />
            <circle cx="17" cy="19" r="2" fill="#1e3a8a" />
            <rect x="6" y="11" width="10" height="4" rx="2" fill="#3b82f6" />
            <path d="M6 11 Q10 3 18 8" fill="#60a5fa" />
          </svg>
        ) : vHere ? (
          (()=>{
            const v = vehiclesRef.current.find(v=>{ const p=v.path[Math.floor(v.t)]; return p&&p.x===x&&p.y===y })
            const icon = v?.type==='truck' ? '🚚'
              : v?.type==='ambulance' ? '🚑'
              : v?.type==='bus' ? '🚌'
              : v?.type==='taxi' ? '🚕'
              : v?.type==='police' ? '🚓'
              : v?.type==='moto' ? '🏍️'
              : v?.type==='scooter' ? '🛴'
              : v?.type==='bike' ? '🚲'
              : '🚗'
            return <div className="text-sm" aria-label="Fahrzeug">{icon}</div>
          })()
        ) : content}
      </div>
    )
  }

  const renderLegend=()=> (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      <Badge variant="outline" className="bg-neutral-100">🛣️ Straße</Badge>
      <Badge variant="outline" className="bg-neutral-100">⬜ Frei</Badge>
      <Badge variant="outline" className="bg-neutral-100">🏠 Gebäude</Badge>
      <Badge variant="outline" className="bg-neutral-100">🌳 Wald</Badge>
      <Badge variant="outline" className="bg-amber-100 text-amber-800">🏡 Ziel</Badge>
      <Badge variant="outline" className="bg-blue-100 text-blue-800">🏛️ Sehenswürdigkeit (blockiert)</Badge>
    </div>
  )

  const canSave = playerName.trim().length>0
  return (
    <div className="relative">
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 border-b border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-indigo-800">City Stroller</h3>
          <Button variant="outline" size="sm" onClick={()=>setShowOptions(s=>!s)} className="border-violet-300 text-violet-700 hover:bg-violet-100">
            <Settings className="h-4 w-4 mr-2" /> Anleitung
          </Button>
        </div>
        <div className="flex items-center justify-center mb-2">
          <span className="text-sm text-gray-700">Zeit: </span>
          <span className="ml-2 font-mono text-indigo-800 text-base" aria-live="polite">{formatTime(elapsedSeconds)}</span>
        </div>
        {showOptions && (
          <div className="bg-white rounded-lg p-4 shadow-md border border-indigo-200 mb-3">
            <p className="text-sm text-gray-600">Nutze Pfeiltasten/WASD oder Swipe. Kollisionen mit 🚗/🏍️/🛴/🚲/🚚, 🏠, 🌳, 🏛️ führen zu Game Over.</p>
          </div>
        )}
        {renderLegend()}
      </div>

      <div className="relative bg-white p-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="grid gap-0 mx-auto border-2 border-gray-300 rounded-lg overflow-hidden"
          style={{
            gridTemplateColumns:`repeat(${GRID_SIZE}, ${tileSize}px)`,
            gridTemplateRows:`repeat(${GRID_SIZE}, ${tileSize}px)`,
            width: GRID_SIZE*tileSize,
            height: GRID_SIZE*tileSize
          }}
          aria-label="Stadt-Labyrinth"
        >
          {Array.from({length:GRID_SIZE},(_,y)=>Array.from({length:GRID_SIZE},(_,x)=>renderTile(x,y)))}
        </div>

        {gameStatus==='win' && (
          <div className="absolute inset-0 bg-violet-600/90 flex items-center justify-center z-10 p-4">
            <div className="text-center text-white max-w-md w-full">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2">Gewonnen!</h2>
              <p className="text-lg mb-4">Zeit: <span className="font-mono">{formatTime(elapsedSeconds)}</span></p>
              <div className="bg-white/10 rounded-lg p-4 text-left mb-4">
                <label htmlFor="name" className="block text-sm mb-2 text-white font-medium">Dein Name (für die Rangliste)</label>
                <input id="name" value={playerName} onChange={(e)=>setPlayerName(e.target.value)} required aria-required="true" className="w-full rounded-md px-3 py-2 text-gray-900 bg-white border-2 border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300" placeholder="z. B. Alex" />
                {!canSave && <p className="mt-2 text-sm text-white font-medium">Bitte Namen eingeben.</p>}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button disabled={!canSave || saveState==='saving' || saveState==='done'} onClick={handleSaveScore} className="bg-white text-violet-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed">{saveState==='done' ? 'Gespeichert ✓' : 'Zur Rangliste speichern'}</Button>
                <Button onClick={restart} className="bg-white text-violet-700 hover:bg-gray-100"><RotateCcw className="h-5 w-5 mr-2"/>Nochmal spielen</Button>
              </div>
              {saveState==='error' && (
                <p className="mt-2 text-sm text-red-100">Konnte nicht speichern. Bitte erneut versuchen.</p>
              )}
            </div>
          </div>
        )}

        {gameStatus==='fail' && (
          <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center z-10 p-4">
            <div className="text-center text-white max-w-md w-full">
              <div className="text-6xl mb-4">💥</div>
              <h2 className="text-3xl font-bold mb-2">Kollision!</h2>
              <p className="text-lg mb-4">Du bist mit einem Hindernis kollidiert.</p>
              <Button onClick={restart} className="bg-white text-red-700 hover:bg-gray-100"><RotateCcw className="h-5 w-5 mr-2"/>Nochmal versuchen</Button>
            </div>
          </div>
        )}
      </div>

      {/* Rangliste */}
      <div className="bg-white border border-gray-200 rounded-lg mt-4 p-4">
        <h4 className="text-base font-semibold text-indigo-800 mb-2">Rangliste – Bestzeiten</h4>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-600">Noch keine Einträge. Spiele und sichere dir den ersten Platz! 🏆</p>
        ) : (
          <ol className="space-y-1">
            {leaderboard.map((entry, idx) => (
              <li key={`${entry.name}-${entry.dateIso}-${idx}`} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  <span className="inline-block w-6 text-right mr-2">{idx + 1}.</span>
                  <span className="font-medium">{entry.name}</span>
                </span>
                <span className="font-mono text-indigo-700">{formatTime(entry.timeSeconds)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Mobile D-Pad */}
      <div className="bg-gray-50 p-4 border-t border-gray-200 sm:hidden">
        <div className="flex justify-center items-center space-x-4">
          <Button variant="outline" size="lg" onClick={()=>move(0,-1)} disabled={gameStatus!=='playing'} className="w-16 h-16" aria-label="Nach oben">
            <ChevronUp className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex justify-center items-center space-x-4 mt-2">
          <Button variant="outline" size="lg" onClick={()=>move(-1,0)} disabled={gameStatus!=='playing'} className="w-16 h-16" aria-label="Nach links">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button variant="outline" size="lg" onClick={()=>move(1,0)} disabled={gameStatus!=='playing'} className="w-16 h-16" aria-label="Nach rechts">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex justify-center items-center space-x-4 mt-2">
          <Button variant="outline" size="lg" onClick={()=>move(0,1)} disabled={gameStatus!=='playing'} className="w-16 h-16" aria-label="Nach unten">
            <ChevronDown className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}


