import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
// Vercel Speed Insights: lightweight integration to surface Core Web Vitals
// and lab field data for the current page. Add your token as
// VERCEL_SPEED_INSIGHTS_TOKEN or NEXT_PUBLIC_VERCEL_SPEED_INSIGHTS_TOKEN in
// your environment if required by your setup.
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Reflection Photography",
  description: "Reflection Photography - Bio Link",
  generator: "Reflection Photography",
  icons: {
    // Prefer static favicons generated into /public/ (added by build step).
    // Keep /api/favicon as a runtime fallback if the static files are not present.
    icon: '/favicon-32x32.png',
    shortcut: '/favicon-16x16.png',
    apple: '/favicon-180x180.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const SuspenseAny = Suspense as any
  return (
  <html lang="en" className="light">
      <head>
    {/* Critical, minimal inline CSS for the preloader to ensure it's styled
        immediately and can paint before external CSS is downloaded. This
        helps First Contentful Paint for the initial experience. */}
    <style dangerouslySetInnerHTML={{__html: `
      .preloader{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0b1220,#051025);}
      .preloader .logo{width:72px;height:72px;border-radius:9999px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center}
      @keyframes si-pulse{0%{opacity:0.65;transform:scale(.98)}50%{opacity:1;transform:scale(1)}100%{opacity:0.65;transform:scale(.98)}}
      .preloader .logo{animation:si-pulse 1800ms ease-in-out infinite}
    `}} />
    {/* FontAwesome: prefer local copy (we ship webfonts under public/remote-assets).
        This avoids relying on a CDN and keeps the app self-contained. */}
    <link rel="preload" as="style" href="/remote-assets/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link rel="stylesheet" href="/remote-assets/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        {/* Favicon link tags for multiple sizes. We point them to /api/favicon which
            serves the provided PNG; browsers will scale as needed. If you'd like
            fully static, high-quality resized assets, we can add them to /public/. */}
    {/* Static favicons (preferred). These files live in /public/ and are generated
      from the embedded PNG. Browsers will request the best size. */}
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {/* Preconnect to Supabase storage domain for quicker image fetches (replace with your project host if different) */}
        <link rel="preconnect" href="https://wxotlwlbbepzlslciwis.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
  <SuspenseAny fallback={null}>{children}</SuspenseAny>
        {/* Security: disable common copy actions and right-click; add admin easter-egg (8 clicks on non-interactive area) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  // Disable right-click/context menu
                  document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, { passive: false });

                  // Disable copy/cut/paste/select/drag
                  ['copy','cut','paste','selectstart','dragstart'].forEach(function(ev){
                    document.addEventListener(ev, function(e){ e.preventDefault(); }, { passive: false });
                  });

                  // Block some common keyboard shortcuts (Ctrl/Cmd + C/S/U/P etc.)
                  document.addEventListener('keydown', function(e){
                    var k = (e.key || '').toLowerCase();
                    if ((e.ctrlKey || e.metaKey) && ['c','s','u','p','a','x'].indexOf(k) !== -1) {
                      e.preventDefault();
                    }
                  }, { passive: false });

                  // Easter-egg: 8 clicks on a non-interactive area (not on links/buttons/inputs) within 8s -> navigate to /login
                  var clickCount = 0; var clickTimer = null;
                  document.addEventListener('click', function(e){
                    try {
                      if (e.target.closest && e.target.closest('a,button,input,textarea,select,label,[role="button"]')) {
                        // clicked on interactive element - ignore
                        return;
                      }
                      clickCount++;
                      if (clickTimer) clearTimeout(clickTimer);
                      clickTimer = setTimeout(function(){ clickCount = 0; }, 8000);
                      if (clickCount >= 8) {
                        clickCount = 0;
                        window.location.href = '/login';
                      }
                    } catch (err) { /* noop */ }
                  }, { passive: true });
                } catch (e) {
                  // don't break the page if scripting fails
                  console.warn('page security script failed', e);
                }
              })();
            `,
          }}
        />
        {/* Vercel Analytics removed — no analytics script will be injected here. */}
        {/* Vercel Speed Insights (opt-in) */}
        {/*
          Render SpeedInsights only when explicitly enabled via env vars.
          Set one of the following in your environment to enable:
            - NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=1            (client-safe flag)
            - NEXT_PUBLIC_VERCEL_SPEED_INSIGHTS_TOKEN=...    (public token)
            - VERCEL_SPEED_INSIGHTS_TOKEN=...               (server-only token)

          If you don't have or don't want to expose a token (common on free
          tier), enable the flag locally (NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=1)
          for development only. By default the panel is disabled in production
          unless a token is provided.
        */}
        {(
          process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === '1' ||
          Boolean(process.env.NEXT_PUBLIC_VERCEL_SPEED_INSIGHTS_TOKEN) ||
          Boolean(process.env.VERCEL_SPEED_INSIGHTS_TOKEN)
        ) && (
          <SpeedInsights />
        )}
      </body>
    </html>
  )
}

