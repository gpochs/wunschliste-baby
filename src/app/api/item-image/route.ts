import { NextRequest, NextResponse } from 'next/server'

function absoluteUrl(base: string, src: string): string {
  try {
    return new URL(src, base).toString()
  } catch {
    return src
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CityStrollerBot/1.0)' }, next: { revalidate: 3600 } })
    if (!res.ok) return null
    const text = await res.text()
    return text
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const website = searchParams.get('website') || ''
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 })

  // 1) Try OG image from website
  if (website) {
    const html = await fetchHtml(website)
    if (html) {
      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      if (ogMatch && ogMatch[1]) {
        const url = absoluteUrl(website, ogMatch[1])
        return NextResponse.redirect(url, 302)
      }
      const iconMatch = html.match(/<link[^>]*rel=["'](?:apple-touch-icon|icon)["'][^>]*href=["']([^"']+)/i)
      if (iconMatch && iconMatch[1]) {
        const url = absoluteUrl(website, iconMatch[1])
        return NextResponse.redirect(url, 302)
      }
    }
    // 2) Screenshot service
    const screenshot = `https://image.thum.io/get/width/1000/crop/700/noanimate/${encodeURIComponent(website)}`
    return NextResponse.redirect(screenshot, 302)
  }

  // 3) Google CSE image search as last resort
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


