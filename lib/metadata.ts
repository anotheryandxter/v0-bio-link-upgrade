import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Metadata } from "next"

export async function generateGlobalMetadata(): Promise<Metadata> {
  try {
    const supabase = await createServerSupabaseClient()

    // Get the first profile (assuming single user system)
    const { data: profile } = await supabase.from("profiles").select("business_name, page_title, favicon").single()

    const title = profile?.page_title || profile?.business_name || "Bio Link"
    const faviconUrl = profile?.favicon || "/favicon.ico"

    return {
      title,
      description: `${profile?.business_name || "Bio Link"} - Professional bio link page`,
      generator: "v0.app",
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
    }
  } catch (error) {
    console.error("[v0] Error generating global metadata:", error)
    return {
      title: "Bio Link",
      description: "Professional bio link page",
      generator: "v0.app",
    }
  }
}
