const PLACEHOLDER = '/images/placeholder-gift.jpg'

function getFaviconFromWebsite(website?: string): string | null {
  if (!website) return null
  try {
    const url = new URL(website)
    const origin = url.origin
    // Common pattern: try /favicon.ico
    return `${origin}/favicon.ico`
  } catch {
    return null
  }
}

export function getItemImageUrl(name: string, website?: string, explicit?: string): string {
  if (explicit) return explicit
  const fav = getFaviconFromWebsite(website)
  if (fav) return fav
  return PLACEHOLDER
}



