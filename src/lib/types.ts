export interface WishlistItem {
  id: string
  item: string
  size?: string
  color?: string
  website?: string
  notes?: string
  reserved: boolean
  reserved_by?: string
  reserved_at?: string
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  item_id: string
  email: string
  created_at: string
}

export interface AdminSession {
  isAuthenticated: boolean
  password: string
}
