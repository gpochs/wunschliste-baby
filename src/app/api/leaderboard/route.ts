import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

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
  // Prefer server-side privileged delete using service role (robust across RLS/policies)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey)
      const del = await admin.from('leaderboard').delete().gt('time_seconds', -1)
      if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    } catch (e) {
      // fall through to public client attempts
    }
  }
  // Fallbacks: try SECURITY DEFINER RPC, else public delete (requires policy)
  const rpc = await supabase.rpc('leaderboard_clear')
  if (rpc.error) {
    const del = await supabase.from('leaderboard').delete().gt('time_seconds', -1)
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
