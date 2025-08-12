import type { Metadata } from 'next'
import GameClient from '@/components/game/GameClient'

export const metadata: Metadata = {
  title: 'City Stroller – Kinderwagen',
  description: 'Bringe den Kinderwagen sicher durchs Stadtlabyrinth!',
}

export default function GamePage() {
  return <GameClient />
}
