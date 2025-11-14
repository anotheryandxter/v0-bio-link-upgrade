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

function ServerPreloader() {
  return (
    <>
      <div id="server-preloader" className="server-preloader" aria-hidden="false">
        <div className="server-preloader-inner" role="status" aria-live="polite">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{color:'#fff',fontWeight:700,fontSize:14}}>Loading</div>
            <div id="server-preloader-percent" className="server-percent">0%</div>
          </div>
          <div className="server-progress-wrap">
            <div className="server-progress" aria-hidden>
              <div id="server-preloader-bar" className="server-progress-bar" />
            </div>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{__html: `
        (function(){
          try {
            var el = document.getElementById('server-preloader');
            var bar = document.getElementById('server-preloader-bar');
            var pct = document.getElementById('server-preloader-percent');
            if (!el || !bar || !pct) return;
            var value = 3;
            bar.style.width = value + '%';
            pct.textContent = Math.round(value) + '%';
            var iv = setInterval(function(){
              value = Math.min(90, value + Math.random()*6 + 1);
              bar.style.width = Math.round(value) + '%';
              pct.textContent = Math.round(value) + '%';
              if (value >= 90) clearInterval(iv);
            }, 300);
            function finish(){
              clearInterval(iv);
              bar.style.width = '100%';
              pct.textContent = '100%';
              el.classList.add('hidden');
              setTimeout(function(){ try{ el.remove(); }catch(e){} }, 320);
            }
            if (window.__APP_READY__) { finish(); return; }
            window.addEventListener('app-ready', finish, {once:true});
            document.addEventListener('DOMContentLoaded', finish, {once:true});
            window.addEventListener('load', finish, {once:true});
            setTimeout(finish, 15000);
          } catch (e) { /* noop */ }
        })();
      `}} />
    </>
  )
}

export default async function HomePage() {
  // Render a server-side, cardless progress bar only for the main page.
  // This is used as the Suspense fallback so the browser can paint the
  // lightweight loading indicator immediately while the server streams
  // the real content. We intentionally keep this markup minimal and the
  // inline script small so it can run as soon as the HTML is parsed.
  return (
    <Suspense fallback={<ServerPreloader />}>
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

    // Determine a likely LCP candidate (image poster or background image)
    const lcpCandidate =
      // explicit homepage image background
      (profile.homepage_background && profile.homepage_background.type === 'image' && profile.homepage_background.image?.url)
      // video poster on legacy background_video field
      || profile.background_video?.poster
      // homepage video poster
      || (profile.homepage_background && profile.homepage_background.type === 'video' && profile.homepage_background.video?.poster)

    // If we found a candidate, emit a server-side preload link so the browser
    // prioritizes fetching it during SSR. Prefer a locally-generated AVIF
    // variant when available under `/public/optim/lcp/lcp-1024.avif` to reduce
    // network cost and decoding time.
    if (lcpCandidate) {
      let preloadHref = lcpCandidate
      try {
        const fs = await import('fs')
        const path = await import('path')
        const candidateLocal = path.join(process.cwd(), 'public', 'optim', 'lcp', 'lcp-1024.avif')
        if (fs.existsSync(candidateLocal)) {
          preloadHref = '/optim/lcp/lcp-1024.avif'
          // build imagesrcset for preload so the browser can pick the right
          // responsive variant during preload.
          const base = '/optim/lcp'
          const imagesrcset = `${base}/lcp-320.avif 320w, ${base}/lcp-640.avif 640w, ${base}/lcp-1024.avif 1024w, ${base}/lcp-1920.avif 1920w`
          const imagesizes = '(max-width: 640px) 640px, 1200px'
          return (
            <>
              <link rel="preload" as="image" href={preloadHref} imageSrcSet={imagesrcset} imageSizes={imagesizes} type="image/avif" crossOrigin="anonymous" />
              <BioPage profile={profile} links={links || []} />
            </>
          )
        }
      } catch (e) {
        // ignore fs errors and fallback to remote candidate
      }

      return (
        <>
          <link rel="preload" as="image" href={preloadHref} crossOrigin="anonymous" />
          <BioPage profile={profile} links={links || []} />
        </>
      )
    }

    return <BioPage profile={profile} links={links || []} />
  } catch (error) {
    console.log("[v0] Supabase connection failed:", error)
    return <DemoPage />
  }
}

// Server-side preloader removed in favor of client-side Preloader component

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
