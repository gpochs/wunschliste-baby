export interface WishlistItem {
  id: string
  item: string
  size?: string
  color?: string
  website?: string
  image_url?: string
  notes?: string
  reserved: boolean
  reserved_by?: string
  reserved_at?: string
  position: number
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

export interface ContentSettings {
  landing_page_title: string
  landing_page_welcome_text: string
  landing_page_emojis: string
  landing_page_image_1_url: string
  landing_page_image_2_url: string
  section_available_title: string
  section_reserved_title: string
  email_gifter_subject: string
  email_gifter_message: string
  email_gifter_signature: string
  email_parent_subject: string
  email_parent_message: string
  email_parent_signature: string
}
