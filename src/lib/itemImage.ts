const PLACEHOLDER = '/images/placeholder-gift.jpg'

export function getItemImageUrl(name: string, website?: string, explicit?: string): string {
  if (explicit) return explicit
  if (website) {
    try {
      const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL
      if (base) return `${base}/og?url=${encodeURIComponent(website)}`
    } catch {}
  }
  return PLACEHOLDER
}



