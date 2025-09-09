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
  Settings,
  Trophy
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ENABLE_CITY_STYLING, CITY_STYLING } from '@/city/config'

enum TileType {
  EMPTY = 'EMPTY',
  ROAD = 'ROAD',
  WALL = 'WALL',
  TREE = 'TREE',
  GOAL = 'GOAL',
  DECOR = 'DECOR',
  GRASS = 'GRASS',
  FLOWERBED = 'FLOWERBED',
  PARK_PATH = 'PARK_PATH'
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
  const [showLeaderboardDialog, setShowLeaderboardDialog] = useState(false)

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

    const inBounds = (x:number,y:number)=> x>=0 && y>=0 && x<GRID_SIZE && y<GRID_SIZE
    const randInt=(min:number,max:number)=> Math.floor(Math.random()*(max-min+1))+min

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

    // Dichte POI Blöcke (keine Randkacheln) — Ziel: genau 16 verschiedene POIs inkl. KiTa (2x2)
    const blocks: Array<{ x:number; y:number; w:number; h:number; icon:string; label?:string }>= [
      // KiTa (2x2) mit Label
      { x:9, y:4, w:2, h:2, icon:'🧒', label:'KiTa' },
    ]
    // 15 weitere 1x1-POIs (alle verschieden)
    const anchorPois: Array<{ x:number; y:number; icon:string }> = [
      { x:3,  y:3,  icon:'🏫' }, // Schule
      { x:15, y:3,  icon:'🏥' }, // Spital
      { x:4,  y:6,  icon:'🏛️' }, // Museum/Rathaus
      { x:15, y:6,  icon:'🏦' }, // Bank
      { x:12, y:4,  icon:'🏪' }, // Laden
      { x:7,  y:9,  icon:'⛪' }, // Kirche
      { x:11, y:14, icon:'🏨' }, // Hotel
      { x:15, y:14, icon:'🏢' }, // Büro
      { x:5,  y:8,  icon:'🏬' }, // Warenhaus
      { x:6,  y:12, icon:'🏟️' }, // Stadion
      { x:14, y:10, icon:'🍽️' }, // Restaurant
      { x:8,  y:6,  icon:'🖼️' }, // Galerie
      { x:12, y:13, icon:'🏭' }, // Fabrik
      { x:7,  y:14, icon:'🚒' }, // Feuerwehr
      { x:13, y:9,  icon:'🏙️' }, // Skyline
    ]
    const poiMap: Record<string,string> = {}
    const poiAnchors = new Set<string>()

    // KiTa-Block (2x2) anlegen — Label auf allen 4 Feldern für bessere Sichtbarkeit
    blocks.forEach(b=>{
      for(let yy=b.y; yy<b.y+b.h; yy++){
        for(let xx=b.x; xx<b.x+b.w; xx++){
          if (m[yy] && m[yy][xx] !== TileType.GOAL) m[yy][xx]=TileType.WALL
          if (b.label) {
            poiMap[`${xx},${yy}`]=`${b.icon} ${b.label}`
            poiAnchors.add(`${xx},${yy}`)
          } else {
            poiMap[`${xx},${yy}`]=b.icon
          }
        }
      }
      poiAnchors.add(`${b.x},${b.y}`)
    })

    // 15 weitere 1x1-POIs (alle verschieden)
    anchorPois.forEach(p=>{
      if (m[p.y][p.x] !== TileType.GOAL) {
        m[p.y][p.x] = TileType.WALL
        poiMap[`${p.x},${p.y}`] = p.icon
        poiAnchors.add(`${p.x},${p.y}`)
      }
    })

    // POI-Icons übernehmen
    poiIconByKeyRef.current = poiMap

    // Wälder (Cluster) / Parks
    const forests = [ [ {x:16,y:6},{x:16,y:7},{x:15,y:7} ], [ {x:7,y:15},{x:8,y:15},{x:7,y:14} ], [ {x:12,y:3},{x:13,y:3},{x:12,y:4} ] ]
    forests.flat().forEach(p=>{ if (m[p.y][p.x]===TileType.EMPTY) m[p.y][p.x]=TileType.TREE })

    // Deko (Ampeln/Plaza… blockierend laut Vorgabe) — nur nicht-Gebäude-Icons verwenden
    const decorSpots: GridPoint[] = [
      {x:6,y:6},{x:9,y:9},{x:12,y:12},{x:5,y:13},{x:14,y:5},{x:9,y:6},{x:12,y:9},{x:7,y:3},
      {x:3,y:8},{x:8,y:3},{x:10,y:8},{x:11,y:6},{x:13,y:11},{x:6,y:11},{x:4,y:9},{x:15,y:11},
      {x:2,y:10},{x:10,y:2},{x:17,y:10},{x:10,y:17},{x:4,y:4},{x:15,y:9},{x:9,y:15}
    ]
    const decorIcons = ['🚦','⛲','🅿️','☕','🍔','🚏','🎡','🚌','🌉','🚲','🏞️','🧋','🍟','🧁','🎠','🌳','🚧','🎺','🎨','🪴','🚻','📮','📫']
    const decorMap: Record<string,string> = {}
    decorSpots.forEach((p,i)=>{
      if (m[p.y][p.x]===TileType.EMPTY) {
        m[p.y][p.x]=TileType.DECOR
        decorMap[`${p.x},${p.y}`]=decorIcons[i%decorIcons.length]
      }
    })
    decorIconByKeyRef.current = decorMap

    // Parks und Grünflächen
    if (ENABLE_CITY_STYLING) {
      const total = GRID_SIZE*GRID_SIZE
      const targetGreens = Math.floor((CITY_STYLING.greenspacePercent/100) * total)
      const smallParks = Math.max(0, Math.round((CITY_STYLING.smallParksPer100Tiles/100)*total))
      const bigParks = Math.max(0, Math.round((CITY_STYLING.bigParksPer100Tiles/100)*total))

      const placeGrass=(x:number,y:number)=>{
        if (!inBounds(x,y)) return
        if ([TileType.ROAD, TileType.GOAL, TileType.WALL].includes(m[y][x])) return
        m[y][x] = TileType.GRASS
      }
      const placeFlower=(x:number,y:number)=>{
        if (!inBounds(x,y)) return
        if ([TileType.ROAD, TileType.GOAL, TileType.WALL].includes(m[y][x])) return
        m[y][x] = TileType.FLOWERBED
      }

      // small parks (2x2)
      for (let i=0;i<smallParks;i++){
        const x = randInt(2, GRID_SIZE-4)
        const y = randInt(2, GRID_SIZE-4)
        const coords=[{x,y},{x:x+1,y},{x,y:y+1},{x:x+1,y:y+1}]
        if (coords.every(p=>![TileType.GOAL,TileType.WALL].includes(m[p.y][p.x]))){
          coords.forEach(p=>{ m[p.y][p.x]=TileType.GRASS })
          // simple path cross
          if (inBounds(x,y+1)) m[y+1][x]=TileType.PARK_PATH
          if (inBounds(x+1,y)) m[y][x+1]=TileType.PARK_PATH
        }
      }

      // big parks (3x3)
      for (let i=0;i<bigParks;i++){
        const x = randInt(2, GRID_SIZE-5)
        const y = randInt(2, GRID_SIZE-5)
        const coords: GridPoint[]=[]
        for(let yy=y; yy<y+3; yy++) for(let xx=x; xx<x+3; xx++) coords.push({x:xx,y:yy})
        if (coords.every(p=>![TileType.GOAL,TileType.WALL].includes(m[p.y][p.x]))){
          coords.forEach(p=>{ m[p.y][p.x]=TileType.GRASS })
          // ring path
          for(let xx=x; xx<x+3; xx++){ m[y+1][xx]=TileType.PARK_PATH }
          for(let yy=y; yy<y+3; yy++){ m[yy][x+1]=TileType.PARK_PATH }
        }
      }

      // scatter singles
      let greensPlaced = 0
      while (greensPlaced < targetGreens){
        const x = randInt(1, GRID_SIZE-2)
        const y = randInt(1, GRID_SIZE-2)
        if (![TileType.ROAD,TileType.GOAL,TileType.WALL].includes(m[y][x])){
          if (Math.random()<0.2) placeFlower(x,y); else placeGrass(x,y)
          greensPlaced++
        }
      }
    }

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

    // Alle verbleibenden leeren Tiles in GRASS verwandeln, um weiße Lücken zu vermeiden
    for (let y=0;y<GRID_SIZE;y++){
      for (let x=0;x<GRID_SIZE;x++){
        if (m[y][x]===TileType.EMPTY) m[y][x]=TileType.GRASS
      }
    }

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
        // zusätzliche Orbiter (3 weitere Fahrzeuge)
        all.push({ type:'police', speedTilesPerSecond:4, path:p, t:Math.random()*p.length })
        all.push({ type:'bike', speedTilesPerSecond:2, path:p, t:Math.random()*p.length })
        all.push({ type:'scooter', speedTilesPerSecond:2, path:p, t:Math.random()*p.length })
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
    const fetchLb = async () => {
      try {
        const res = await fetch('/api/leaderboard', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json() as { entries: { name:string; time_seconds:number; date_iso:string }[] }
          setLeaderboard(json.entries.map(e=>({ name:e.name, timeSeconds:e.time_seconds, dateIso:e.date_iso })))
          return
        }
      } catch {}
      // fallback local
      try{ const raw=localStorage.getItem('cityStrollerLeaderboard'); if(raw) setLeaderboard(JSON.parse(raw)) }catch{}
    }
    fetchLb()
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
      const nowIso = new Date().toISOString()
      fetch('/api/leaderboard', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, timeSeconds: elapsedSeconds }) })
        .catch(()=>null)
        .finally(async ()=>{
          try{
            const res = await fetch('/api/leaderboard', { cache:'no-store' })
            if (res.ok){
              const json = await res.json() as { entries: { name:string; time_seconds:number; date_iso:string }[] }
              const entries = json.entries.map(e=>({ name:e.name, timeSeconds:e.time_seconds, dateIso:e.date_iso }))
              setLeaderboard(entries)
              // also cache locally
              saveLeaderboard(entries)
            } else {
              const next=[...leaderboard,{name,timeSeconds:elapsedSeconds,dateIso:nowIso}].sort((a,b)=>a.timeSeconds-b.timeSeconds).slice(0,10)
              saveLeaderboard(next)
            }
            setSaveState('done')
          } catch {
            const next=[...leaderboard,{name,timeSeconds:elapsedSeconds,dateIso:nowIso}].sort((a,b)=>a.timeSeconds-b.timeSeconds).slice(0,10)
            saveLeaderboard(next)
            setSaveState('done')
          }
        })
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
    // Kollision auch bei POIs (WALL) und Deko/Tree
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
    const isEdge = x===0 || x===GRID_SIZE-1 || y===0 || y===GRID_SIZE-1
    if (t===TileType.ROAD){
      cls='bg-neutral-400 border border-neutral-500'
    } else if (t===TileType.WALL){
      // deutlich abheben (blockierend)
      cls = isEdge
        ? 'bg-slate-800 border border-black shadow-inner'
        : 'bg-slate-900 text-white border border-black shadow-lg'
      {
        const poi = poiIconByKeyRef.current[`${x},${y}`]
        content = poi ? (
          <span className="text-[14px] md:text-[18px] leading-none text-white drop-shadow-sm select-none font-semibold">
            {poi}
          </span>
        ) : null
      }
    } else if (t===TileType.TREE){
      cls='bg-green-700 border border-green-800'
      content='🌳'
    } else if (t===TileType.GRASS){
      cls='bg-green-500/40 border border-green-600/60'
    } else if (t===TileType.FLOWERBED){
      cls='bg-green-600/50 border border-green-700'
      content='🌼'
    } else if (t===TileType.PARK_PATH){
      cls='bg-amber-100 border border-amber-300'
    } else if (t===TileType.GOAL){
      cls='bg-amber-300 border border-amber-500 shadow-lg'
      content=(
        <div className="text-[10px] font-bold text-amber-900 flex flex-col items-center leading-none select-none">
          <span>🏡</span>
          <span>HOME</span>
        </div>
      )
    } else if (t===TileType.DECOR){
      // deutlich blockierend unterscheiden
      cls='bg-blue-600/70 border border-blue-900 text-white'
      content=decorIconByKeyRef.current[`${x},${y}`] ?? '🚦'
    } else {
      cls='bg-neutral-100 border border-neutral-200'
    }

    // Kreuzungsmarkierung dezent
    if (t===TileType.ROAD){
      const up = (city[y-1]?.[x] as TileType) === TileType.ROAD
      const down = (city[y+1]?.[x] as TileType) === TileType.ROAD
      const left = (city[y]?.[x-1] as TileType) === TileType.ROAD
      const right = (city[y]?.[x+1] as TileType) === TileType.ROAD
      const isIntersection = up && down && left && right
      const bg = isIntersection
        ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 3px, transparent 3px, transparent 10px)'
        : 'repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 8px)'
      return (
        <div key={`${x}-${y}`}
          className={`${cls} flex items-center justify-center text-xs ${isStroller?'ring-4 ring-blue-500 ring-opacity-75':''}`}
          style={{
            width: tileSize, height: tileSize, minWidth: tileSize, minHeight: tileSize,
            backgroundImage: bg,
            backgroundSize: '2px 100%, 100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'repeat-x, repeat',
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

    return (
      <div key={`${x}-${y}`}
        className={`${cls} flex items-center justify-center text-xs ${isStroller?'ring-4 ring-blue-500 ring-opacity-75':''}`}
        style={{
          width: tileSize, height: tileSize, minWidth: tileSize, minHeight: tileSize,
          // non-road tiles: no road texture
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
    <div className="relative pb-28 sm:pb-0 bg-slate-50">
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

      <div className="relative bg-white p-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="grid gap-0 mx-auto border-2 border-slate-300 rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-200"
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

      {/* Mobile: Floating Rangliste Button + Dialog */}
      <div className="fixed right-2 bottom-28 sm:hidden z-30" style={{ marginRight: 'max(0.5rem, env(safe-area-inset-right))' }}>
        <Button onClick={()=>setShowLeaderboardDialog(true)} className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg">
          <Trophy className="h-4 w-4 mr-2" /> Rangliste
        </Button>
      </div>
      <Dialog open={showLeaderboardDialog} onOpenChange={setShowLeaderboardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rangliste – Bestzeiten</DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}


