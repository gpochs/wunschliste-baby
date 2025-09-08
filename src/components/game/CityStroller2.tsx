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
// Ziel: 10 Felder vom rechten Rand, 6 Felder vom oberen Rand (2x2 Zielblock)
const GOAL: GridPoint = { x: GRID_SIZE - 11, y: 6 }

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

    // Realistischere Hierarchie: breite Hauptstraßen (2 Kacheln) als Boulevards
    const arterialRows = [5, 10, 15]
    const arterialCols = [5, 10, 15]
    arterialRows.forEach(r => {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        m[r][x] = TileType.ROAD
        if (r+1 < GRID_SIZE-1) m[r+1][x] = TileType.ROAD
      }
    })
    arterialCols.forEach(c => {
      for (let y = 1; y < GRID_SIZE - 1; y++) {
        m[y][c] = TileType.ROAD
        if (c+1 < GRID_SIZE-1) m[y][c+1] = TileType.ROAD
      }
    })

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

    // Ring-Straßen um das Ziel anlegen (1 Tile Dicke) – für garantierten Verkehr rundherum
    const top = Math.max(1, GOAL.y - 2)
    const bottom = Math.min(GRID_SIZE - 2, GOAL.y + 3)
    const left = Math.max(1, GOAL.x - 2)
    const right = Math.min(GRID_SIZE - 2, GOAL.x + 3)
    for (let x = left; x <= right; x++) {
      if (m[top][x] !== TileType.GOAL) m[top][x] = TileType.ROAD
      if (m[bottom][x] !== TileType.GOAL) m[bottom][x] = TileType.ROAD
    }
    for (let y = top; y <= bottom; y++) {
      if (m[y][left] !== TileType.GOAL) m[y][left] = TileType.ROAD
      if (m[y][right] !== TileType.GOAL) m[y][right] = TileType.ROAD
    }

    // Dichte POI Blöcke (keine Randkacheln) — Ziel: mindestens 15 POIs
    const blocks: Array<{ x:number; y:number; w:number; h:number; icon:string; label?:string }>= [
      // 1 Schule, 2 Mall, 3 Spital, 4 Stadion, 5 Rathaus, 6 Wohnblock, 7 Hochhaus, 8 Kirche,
      { x:5, y:4, w:2, h:2, icon:'🏫' },
      { x:12, y:4, w:3, h:3, icon:'🏬' },
      { x:10, y:12, w:3, h:2, icon:'🏥' },
      { x:6, y:12, w:4, h:3, icon:'🏟️' },
      { x:4, y:6, w:2, h:2, icon:'🏛️' },
      { x:5, y:8, w:2, h:2, icon:'🏘️' },
      { x:15, y:6, w:2, h:2, icon:'🏢' },
      { x:7, y:9, w:2, h:2, icon:'⛪' },
      // 9 Feuerwehr, 10 Museum, 11 Hotel, 12 Bank, 13 Einkaufszeile, 14 Restaurant, 15 Skyline
      { x:7, y:14, w:2, h:2, icon:'🚒' },
      { x:12, y:13, w:2, h:2, icon:'🖼️' },
      { x:11, y:14, w:3, h:2, icon:'🏨' },
      { x:15, y:14, w:2, h:2, icon:'🏦' },
      { x:14, y:10, w:2, h:2, icon:'🛍️' },
      { x:8, y:6, w:2, h:2, icon:'🍽️' },
      { x:13, y:9, w:2, h:2, icon:'🏙️' },
      // 16 KiTa (2x2) mit Label
      { x:9, y:4, w:2, h:2, icon:'🧒', label:'KiTa' },
    ]
    const poiMap: Record<string,string> = {}
    blocks.forEach(b=>{
      for(let yy=b.y; yy<b.y+b.h; yy++){
        for(let xx=b.x; xx<b.x+b.w; xx++){
          if (m[yy][xx]===TileType.EMPTY) m[yy][xx]=TileType.WALL
          // Für KiTa einmalig mit Label beschriften (oben links)
          if (b.label && xx===b.x && yy===b.y) {
            poiMap[`${xx},${yy}`]=`${b.icon} ${b.label}`
          } else {
            poiMap[`${xx},${yy}`]=b.icon
          }
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

    // Gleichmäßig verteilte Rand-POIs & Innen-POIs: Stadtbild (Bahnhof, Museum, Park, Café, Schule, Spital, Wolkenkratzer)
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

    // Wälder (Cluster) / Parks
    const forests = [ [ {x:16,y:6},{x:16,y:7},{x:15,y:7} ], [ {x:7,y:15},{x:8,y:15},{x:7,y:14} ], [ {x:12,y:3},{x:13,y:3},{x:12,y:4} ] ]
    forests.flat().forEach(p=>{ if (m[p.y][p.x]===TileType.EMPTY) m[p.y][p.x]=TileType.TREE })

    // Deko (Ampeln/Plaza… blockierend laut Vorgabe)
    const decorSpots: GridPoint[] = [
      {x:6,y:6},{x:9,y:9},{x:12,y:12},{x:5,y:13},{x:14,y:5},{x:9,y:6},{x:12,y:9},{x:7,y:3},
      {x:3,y:8},{x:8,y:3},{x:10,y:8},{x:11,y:6},{x:13,y:11},{x:6,y:11},{x:4,y:9},{x:15,y:11},
      {x:2,y:10},{x:10,y:2},{x:17,y:10},{x:10,y:17},{x:4,y:4},{x:15,y:9},{x:9,y:15}
    ]
    const decorIcons = ['🚦','⛲','🅿️','☕','🍔','🚏','🎡','🚌','🚦','🌉','🚲','🏞️','🧋','🍟','🧁','🎠','🏟️','🏗️','🏢','🏙️','🌳','🏬','🏘️']
    const decorMap: Record<string,string> = {}
    decorSpots.forEach((p,i)=>{
      if (m[p.y][p.x]===TileType.EMPTY) {
        m[p.y][p.x]=TileType.DECOR
        decorMap[`${p.x},${p.y}`]=decorIcons[i%decorIcons.length]
      }
    })
    decorIconByKeyRef.current = decorMap

    // Straßenringe um Points of Interest (POIs und Deko) anlegen, damit Fahrzeuge rundherum fahren können
    const carveRoadAround = (cx:number, cy:number) => {
      const neighbors: GridPoint[] = [
        {x:cx-1,y:cy},{x:cx+1,y:cy},{x:cx,y:cy-1},{x:cx,y:cy+1},
        {x:cx-1,y:cy-1},{x:cx+1,y:cy-1},{x:cx-1,y:cy+1},{x:cx+1,y:cy+1},
      ]
      neighbors.forEach(p=>{
        if (p.x>0 && p.y>0 && p.x<GRID_SIZE-1 && p.y<GRID_SIZE-1) {
          if (m[p.y][p.x] !== TileType.GOAL) m[p.y][p.x] = TileType.ROAD
        }
      })
    }

    Object.keys(poiMap).forEach(key=>{
      const [sx,sy] = key.split(',').map(Number)
      carveRoadAround(sx, sy)
    })
    Object.keys(decorMap).forEach(key=>{
      const [sx,sy] = key.split(',').map(Number)
      carveRoadAround(sx, sy)
    })

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
    // Perimeter + viele innere Rechtecke (großflächiger)
    const frames = [
      {t:1,l:1,r:GRID_SIZE-2,b:GRID_SIZE-2},
      {t:2,l:2,r:GRID_SIZE-3,b:GRID_SIZE-3},
      {t:3,l:3,r:GRID_SIZE-4,b:GRID_SIZE-4},
      {t:4,l:4,r:GRID_SIZE-5,b:GRID_SIZE-5},
      {t:5,l:5,r:GRID_SIZE-6,b:GRID_SIZE-6},
      {t:6,l:6,r:GRID_SIZE-7,b:GRID_SIZE-7},
      {t:7,l:7,r:GRID_SIZE-8,b:GRID_SIZE-8},
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

    // Lange Band-Loops großflächig
    pushRect(9, 2, GRID_SIZE-3, GRID_SIZE-3)
    pushRect(11, 2, GRID_SIZE-3, GRID_SIZE-3)
    pushRect(13, 2, GRID_SIZE-3, GRID_SIZE-3)
    // Loops rund um das Ziel (engere Ringe), damit Verkehr das Ziel periodisch blockiert
    const gx = GOAL.x, gy = GOAL.y
    const goalFrames = [
      { t: gy-2, l: gx-2, r: gx+3, b: gy+3 },
      { t: gy-3, l: gx-3, r: gx+4, b: gy+4 },
      { t: gy-4, l: gx-4, r: gx+5, b: gy+5 },
    ]
    goalFrames.forEach(f=>pushRect(f.t,f.l,f.r,f.b))

    // Vertikale Band-Loops für rechten/linken Sektor (weit)
    pushRect(2, 10, GRID_SIZE-3, GRID_SIZE-3)
    pushRect(2, 12, GRID_SIZE-3, GRID_SIZE-3)
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
    // Noch mehr Fahrzeuge über großflächige Loops verteilt
    const pick = (i: number) => loops[(i * 5) % Math.max(1, loops.length)] || perimeter
    // leicht reduzierte Anzahl Fahrzeuge
    for (let i = 0; i < 12; i++) add('car', pick(i), 4)
    for (let i = 0; i < 10; i++) add('moto', pick(i + 40), 3)
    for (let i = 0; i < 10; i++) add('scooter', pick(i + 80), 2)
    for (let i = 0; i < 10; i++) add('bike', pick(i + 120), 2)
    // Zusätzlicher Verkehr explizit um das Ziel: kleine Rundkurse
    const nearGoal = [
      { t: GOAL.y-2, l: GOAL.x-2, r: GOAL.x+3, b: GOAL.y+3 },
    ]
    const loopsAround = nearGoal.map(f=>{
      const path: GridPoint[] = []
      for(let x=f.l;x<=f.r;x++) if (m[f.t][x]===TileType.ROAD) path.push({x,y:f.t})
      for(let y=f.t+1;y<=f.b;y++) if (m[y]?.[f.r]===TileType.ROAD) path.push({x:f.r,y})
      for(let x=f.r-1;x>=f.l;x--) if (m[f.b]?.[x]===TileType.ROAD) path.push({x,y:f.b})
      for(let y=f.b-1;y>f.t;y--) if (m[y]?.[f.l]===TileType.ROAD) path.push({x:f.l,y})
      return path
    })
    // Füge dedizierte Ziel-Orbiter hinzu (verschiedene Fahrzeugtypen), die dauerhaft kreisen
    loopsAround.forEach(p=>{
      if(p.length>0){
        all.push({ type:'car', speedTilesPerSecond:4, path:p, t:Math.random()*p.length })
        all.push({ type:'moto', speedTilesPerSecond:3, path:p, t:Math.random()*p.length })
        all.push({ type:'taxi', speedTilesPerSecond:4, path:p, t:Math.random()*p.length })
      }
    })
    vehiclesRef.current = all
  },[buildLoops])

  const restart = useCallback(() => {
    setGameStatus('playing')
    setStroller(START)
    setElapsedSeconds(0)
    setSaveState('idle')
    const m = buildCity()
    setCity(m)
    initializeVehicles(m)
  },[buildCity, initializeVehicles])

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
      content=(
        <div className="text-[10px] font-bold text-amber-900 flex flex-col items-center leading-none select-none">
          <span>🏡</span>
          <span>HOME</span>
        </div>
      )
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
    <div className="relative pb-28 sm:pb-0">
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

      {/* Mobile D-Pad (on-screen arrows) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-50/90 backdrop-blur p-4 border-t border-gray-200 sm:hidden" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
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


