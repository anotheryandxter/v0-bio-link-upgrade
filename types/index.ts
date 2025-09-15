export interface Profile {
  id: string
  user_id: string
  business_name: string
  avatar: string | null
  location: string
  favicon: string | null
  page_title: string
  background_video: {
    webm: string | null
    mp4: string | null
    ogv: string | null
    poster: string | null
  } | null
  theme_preference: "light" | "dark" | "system"
  is_setup: boolean
  created_at: string
  updated_at: string
}

export interface Link {
  id: string
  profile_id: string
  title: string
  url: string
  icon: string
  background_color_light: string
  background_color_dark: string
  background_image: string | null
  text_color_light: string
  text_color_dark: string
  opacity: number
  order_index: number
  is_active: boolean
  category: "main" | "location" | "social"
  created_at: string
  updated_at: string
}

export interface LinkClick {
  id: string
  link_id: string
  clicked_at: string
  user_agent: string | null
  referrer: string | null
  ip_address: string | null
}
