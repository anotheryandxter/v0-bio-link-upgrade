export interface Profile {
  id: string
  user_id: string
  business_name: string
  avatar: string | null
  location: string
  page_title: string
  footer_text: string | null
  background_video: {
    webm: string | null
    mp4: string | null
    ogv: string | null
    poster: string | null
  } | null
  homepage_background?: BackgroundConfig
  // Theme preference is now fixed to light across the app
  // theme_preference removed from DB; app enforces light mode globally
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
  user_identifier?: string | null
}

export interface BackgroundConfig {
  type: "gradient" | "solid" | "image" | "video"
  gradient?: {
    direction: "to-r" | "to-l" | "to-t" | "to-b" | "to-tr" | "to-tl" | "to-br" | "to-bl"
    stops: Array<{
      color: string
      position?: number // 0-100%
    }>
  }
  solidColor?: string
  image?: {
    url: string
    fit: "cover" | "contain" | "fill" | "stretch" | "none"
    position: "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
    opacity?: number // 0-1
    blur?: number // 0-20px
  }
  video?: {
    webm?: string | null
    mp4?: string | null
    ogv?: string | null
    poster?: string | null
    fit: "cover" | "contain" | "fill" | "stretch"
    position: "center" | "top" | "bottom" | "left" | "right"
    opacity?: number // 0-1
    blur?: number // 0-20px
    muted: boolean
    loop: boolean
    autoplay: boolean
  }
  overlay?: {
    enabled: boolean
    color: string
    opacity: number // 0-1
  }
}

export interface MediaUpload {
  id: string
  user_id: string
  filename: string
  original_name: string
  file_type: string
  file_size: number
  url: string
  usage_type: "avatar" | "background_image" | "background_video" | "link_icon"
  created_at: string
}
