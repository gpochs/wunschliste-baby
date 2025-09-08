import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 })

  const key = process.env.GOOGLE_CSE_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!key || !cx) {
    return NextResponse.json({ error: 'Search not configured' }, { status: 501 })
  }

  const apiUrl = new URL('https://www.googleapis.com/customsearch/v1')
  apiUrl.searchParams.set('key', key)
  apiUrl.searchParams.set('cx', cx)
  apiUrl.searchParams.set('searchType', 'image')
  apiUrl.searchParams.set('num', '1')
  apiUrl.searchParams.set('q', q)

  try {
    const res = await fetch(apiUrl.toString())
    if (!res.ok) return NextResponse.json({ error: 'Search failed' }, { status: 502 })
    const raw: unknown = await res.json()
    const data = raw as { items?: Array<{ link?: string }> }
    const link: string | undefined = data.items?.[0]?.link
    if (!link) return NextResponse.json({ error: 'No results' }, { status: 404 })
    return NextResponse.redirect(link, 302)
  } catch (e) {
    return NextResponse.json({ error: 'Search error' }, { status: 500 })
  }
}


