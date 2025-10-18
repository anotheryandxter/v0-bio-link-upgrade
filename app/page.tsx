import { createServerSupabaseClient } from "@/lib/supabase/server"
import { timeAsync } from '@/lib/profiler'
import { BioPage } from "@/components/bio/bio-page"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: profile } = await timeAsync('supabase:profiles_select_metadata', async () =>
      supabase.from("profiles").select("page_title, business_name, favicon").eq("is_setup", true).single()
    )

    if (profile) {
      return {
        title: profile.page_title || profile.business_name,
        description: `${profile.business_name} - Bio Link`,
        icons: profile.favicon
          ? {
              icon: profile.favicon,
              shortcut: profile.favicon,
              apple: profile.favicon,
            }
          : undefined,
      }
    }
  } catch (error) {
    console.log("[v0] Error generating metadata:", error)
  }

  return {
    title: "Bio Link",
    description: "Personal Bio Link Page",
  }
}

export default async function HomePage() {
  try {
    const supabase = await createServerSupabaseClient()

    console.log("[v0] Attempting to connect to Supabase...")

    // Check if profile is setup
    const { data: profile, error: profileError } = await timeAsync('supabase:profiles_check_setup', async () =>
      supabase.from("profiles").select("*").eq("is_setup", true).single()
    )

    console.log("[v0] Profile query result:", { profile, profileError })

    if (profileError || !profile) {
      console.log("[v0] No profile found or error occurred, redirecting to login")
      // If no profile is setup or error occurred, redirect to login for initial setup
      redirect("/login")
    }

    // Get active links ordered by order_index
    const { data: links, error: linksError } = await timeAsync('supabase:links_active', async () =>
      supabase.from("links").select("*").eq("profile_id", profile.id).eq("is_active", true).order("order_index")
    )

    console.log("[v0] Links query result:", { links, linksError })

    return <BioPage profile={profile} links={links || []} />
  } catch (error) {
    console.log("[v0] Supabase connection failed:", error)
    return <DemoPage />
  }
}

function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mono-900 via-mono-800 to-mono-900 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-mono-700 flex items-center justify-center">
          <span className="text-2xl font-bold text-mono-100">RP</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-mono-100">Reflection Photography</h1>
          <p className="text-mono-400">Indonesia</p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-mono-800/50 backdrop-blur-sm rounded-xl border border-mono-700">
            <p className="text-mono-300 text-sm">🚧 Setting up your bio-link...</p>
            <p className="text-mono-400 text-xs mt-2">
              Database connection in progress. Please run the setup scripts to initialize your profile.
            </p>
          </div>

          <a
            href="/login"
            className="block w-full p-3 bg-mono-700 hover:bg-mono-600 text-mono-100 rounded-lg transition-colors"
          >
            Admin Setup
          </a>
        </div>
      </div>
    </div>
  )
}
