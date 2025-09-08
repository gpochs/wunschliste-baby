const PLACEHOLDER = '/globe.svg'

function getFaviconFromWebsite(website?: string): string | null {
  if (!website) return null
  try {
    const url = new URL(website)
    const domain = url.hostname
    // Google S2 favicon service (reliable, caches, various sizes)
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  } catch {
    return null
  }
}

function getScreenshotFromWebsite(website?: string): string | null {
  if (!website) return null
  try {
    // Lightweight screenshot proxy; returns an image URL
    return `https://image.thum.io/get/width/1000/crop/700/noanimate/${encodeURIComponent(website)}`
  } catch {
    return null
  }
}

export function getItemImageUrl(name: string, website?: string, explicit?: string): string {
  if (explicit) return explicit
  // Server route will attempt: OG image → apple-touch-icon/icon → screenshot
  if (website) return `/api/item-image?q=${encodeURIComponent(name)}&website=${encodeURIComponent(website)}`
  // Fallbacks when no website
  return `/api/item-image?q=${encodeURIComponent(name)}`
}



