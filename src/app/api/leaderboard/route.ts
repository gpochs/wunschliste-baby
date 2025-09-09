import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('name,time_seconds,date_iso')
    .order('time_seconds', { ascending: true })
    .limit(10)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { name?: string; timeSeconds?: number } | null
  if (!body || !body.name || typeof body.timeSeconds !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('leaderboard')
    .insert([{ name: body.name.slice(0, 40), time_seconds: body.timeSeconds, date_iso: new Date().toISOString() }])
    .select('name,time_seconds,date_iso')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data?.[0] }, { status: 201 })
}

export async function DELETE() {
  // delete all leaderboard entries
  const { error } = await supabase
    .from('leaderboard')
    .delete()
    .gt('time_seconds', -1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
