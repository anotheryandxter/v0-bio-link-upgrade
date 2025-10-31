import { createServerSupabaseClient } from "@/lib/supabase/server"
import getRedisClient from '@/lib/cache/redis'
import { timeAsync } from '@/lib/profiler'
import { BioPage } from "@/components/bio/bio-page"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Suspense } from 'react'

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  // Use static favicons for all deployments. This removes dynamic favicon
  // configuration from admin settings and ensures consistent cross-device
  // behavior. The generated static files live in /public/ and include multiple
  // sizes and a multi-resolution favicon.ico.
  return {
    title: "Reflection Photography",
    description: "Reflection Photography - Bio Link",
    icons: {
      icon: '/favicon-32x32.png',
      shortcut: '/favicon-16x16.png',
      apple: '/favicon-180x180.png',
    },
  }
}

export default async function HomePage() {
  // Use a streaming / suspense approach so the server can send a lightweight
  // preloader immediately while the heavier profile/links fetch continues.
  // The actual data fetch and potential redirect live in the inner async
  // component below so Next can stream the fallback quickly to the client.
  return (
    <Suspense fallback={<Preloader />}>
      <DatafulHome />
    </Suspense>
  )
}

// Server component: performs the real data fetching and may redirect server-side.
async function DatafulHome() {
  try {
    const supabase = await createServerSupabaseClient()

    console.log("[v0] Attempting to connect to Supabase...")

    // Check if profile is setup
    const redis = getRedisClient()
    const profileCacheKey = 'profile:setup'
    let profile: any = null
    let profileError: any = null

    if (redis) {
      try {
        const cached = await redis.get(profileCacheKey)
        if (cached) {
          profile = JSON.parse(cached)
        }
      } catch (e) {
        console.warn('[v0] Redis read failed for profile cache', e)
      }
    }

    if (!profile) {
      const result = await timeAsync('supabase:profiles_check_setup', async () =>
        supabase.from("profiles").select("*").eq("is_setup", true).single()
      )
      profile = result.data
      profileError = result.error

      if (redis && profile) {
        try {
          // cache for short period (30s)
          await redis.set(profileCacheKey, JSON.stringify(profile), 'EX', 30)
        } catch (e) {
          console.warn('[v0] Redis write failed for profile cache', e)
        }
      }
    }

    console.log("[v0] Profile query result:", { profile, profileError })

    if (profileError || !profile) {
      console.log("[v0] No profile found or error occurred, redirecting to login")
      // If no profile is setup or error occurred, redirect to login for initial setup
      redirect("/login")
    }

    // Get active links ordered by order_index — select only required columns to reduce payload and SSR time
    const linksCacheKey = `links:active`
    let links: any = null
    let linksError: any = null

    if (redis) {
      try {
        const cached = await redis.get(linksCacheKey)
        if (cached) links = JSON.parse(cached)
      } catch (e) {
        console.warn('[v0] Redis read failed for links cache', e)
      }
    }

    if (!links) {
      const result = await timeAsync('supabase:links_active', async () =>
        supabase
          .from("links")
          // include `category` so the client can group links into main/location/social
          .select(
            "id,title,url,icon,background_color_light,text_color_light,background_image,opacity,order_index,is_active,category"
          )
          .eq("is_active", true)
          .order("order_index")
      )
      links = result.data
      linksError = result.error

      if (redis && links) {
        try {
          // cache for short period (30s)
          await redis.set(linksCacheKey, JSON.stringify(links), 'EX', 30)
        } catch (e) {
          console.warn('[v0] Redis write failed for links cache', e)
        }
      }
    }

    console.log("[v0] Links query result:", { links, linksError })

    return <BioPage profile={profile} links={links || []} />
  } catch (error) {
    console.log("[v0] Supabase connection failed:", error)
    return <DemoPage />
  }
}

function Preloader() {
  return (
    <div className="preloader">
      <div style={{textAlign: 'center'}}>
        <div className="logo" style={{width:72,height:72,borderRadius:9999,background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>
          <span style={{fontWeight:700,color:'#fff'}}>RP</span>
        </div>
        <div style={{marginTop:16,color:'#e6eef8',opacity:0.95}}>
          <div style={{fontSize:18,fontWeight:700}}>Reflection Photography</div>
          <div style={{fontSize:13,opacity:0.8,marginTop:6}}>Loading your page…</div>
        </div>
      </div>
    </div>
  )
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

          {/* Admin Setup link removed; access the admin login by clicking 8 times on the page background. */}
        </div>
      </div>
    </div>
  )
}
