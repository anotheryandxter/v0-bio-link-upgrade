import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
// Client preloaders removed — server-side preloader remains for instant paint
// Vercel Speed Insights: lightweight integration to surface Core Web Vitals
// and lab field data for the current page. Add your token as
// VERCEL_SPEED_INSIGHTS_TOKEN or NEXT_PUBLIC_VERCEL_SPEED_INSIGHTS_TOKEN in
// your environment if required by your setup.
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { getCssPreloadHref } from "../lib/server/getCssPreload"

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
    <style>{`
      /* Minimalist fullscreen preloader (client) */
      .preloader{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#333333;z-index:99999}
      .preloader-inner{width:min(640px,84vw);padding:18px 20px;border-radius:12px;background:rgba(255,255,255,0.03);box-shadow:0 6px 18px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:12px}
      .progress-wrap{display:flex;align-items:center;gap:12px}
      .progress{flex:1;height:12px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden}
      .progress-bar{height:100%;width:0%;background:linear-gradient(90deg,#4ade80,#06b6d4);border-radius:999px;transition:width 250ms ease}
      .progress-percent{min-width:50px;text-align:right;color:#ffffff;font-size:13px;font-weight:600}
      .preloader.hidden{opacity:0;pointer-events:none;transition:opacity 300ms ease;visibility:hidden}

      /* Server-side preloader styling */
      .server-preloader{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#333333;z-index:99998}
  /* Removed card styling: make the server preloader minimal and unobtrusive */
  .server-preloader-inner{width:100%;display:flex;flex-direction:column;gap:8px;align-items:center}
  .server-progress-wrap{display:flex;align-items:center;gap:12px;width:100%;max-width:880px;padding:0 28px;box-sizing:border-box}
  .server-progress{flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden}
  .server-progress-bar{height:100%;width:0%;background:linear-gradient(90deg,#4ade80,#06b6d4);border-radius:999px;transition:width 220ms linear}
  .server-percent{min-width:44px;text-align:right;color:#ffffff;font-size:14px;font-weight:700}
      .server-preloader.hidden{opacity:0;pointer-events:none;visibility:hidden;transition:opacity 260ms ease}
    /* Ensure the bar shows motion even if inline JS is delayed: animate to ~90% by
      CSS alone, then let the JS finalize to 100% when the app is ready. Honor
      reduced-motion preferences. */
    @keyframes server-preload-grow { from { width: 3%; } to { width: 90%; } }
    .server-progress-bar{ animation: server-preload-grow 4s linear forwards }
    @media (prefers-reduced-motion: reduce) { .server-progress-bar{ animation: none !important } }
    `}</style>

    {/* server preloader behavior will be emitted only on the main page (Home).
        The head keeps only the server-side CSS rules for the bar so it can
        paint immediately when the main page includes the markup. */}
  {/* Preload critical fonts (variable/woff2) used by the app. These files are
    produced by Next's font pipeline and served under /_next/static/media.
    Preloading them improves FCP by allowing the browser to fetch them
    earlier in parallel with other resources. */}
  <link rel="preload" href="/_next/static/media/028c0d39d2e8f589-s.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
  <link rel="preload" href="/_next/static/media/5b01f339abf2f1a5.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

  {/* Preload Font Awesome webfonts we've self-hosted to avoid CDN hits. */}
  <link rel="preload" href="/remote-assets/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
  <link rel="preload" href="/remote-assets/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
  <link rel="preload" href="/remote-assets/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

  {/* FontAwesome CSS (non-blocking): preload then apply via onload to avoid
    render-blocking style fetch while still prioritizing it. The compiled
    CSS file for the app is also preloaded below (non-blocking) to help
    the browser fetch styles early without blocking initial render. */}
  <link rel="preload" as="style" href="/remote-assets/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/remote-assets/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

    {/* Non-blocking preload of the compiled global stylesheet. We attempt to
        discover the built hashed filename at runtime (server) so the link
        always matches the current build. If discovery fails we skip the
        preload and let the regular CSS pipeline handle loading. */}
    {(() => {
      try {
        const href = getCssPreloadHref()
        if (href) {
          // Server components cannot include event handler props. Inject a
          // raw link tag with an onload attribute via dangerouslySetInnerHTML
          // so the browser will switch the preload to a stylesheet when it
          // finishes loading (non-blocking pattern). Keep a noscript fallback.
          const raw = `\n  <link rel="preload" as="style" href="${href}" onload="this.rel='stylesheet'">\n  <noscript><link rel=\"stylesheet\" href=\"${href}\"></noscript>\n`;
          return (
            <div dangerouslySetInnerHTML={{ __html: raw }} />
          )
        }
      } catch (err) {
        // swallow errors and don't render the preload if any server-side
        // detection fails (keeps the layout robust across environments)
      }
      return null
    })()}
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
        {/* Preload the largest above-the-fold image (reported as LCP) so the
            browser begins fetching it as early as possible. This hints the
            browser to prioritize the LCP resource and can reduce LCP/FCP. */}
        <link rel="preload" as="image" href="https://wxotlwlbbepzlslciwis.supabase.co/storage/v1/object/public/static/maps/9321b7fa-40db-4f54-8e8b-0d56ff8fe08a-1761848220263.png" crossOrigin="anonymous" />
      </head>
      {/* Viewport meta for correct mobile scaling and layout. Important for
        consistent mobile rendering of the preloader and to avoid unexpected
        blank/zoomed states on phones/tablets. */}
      {/* Place the viewport inside head via a small inline link to ensure it's
        rendered as early as possible. */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
  {/* Minimal preloader: rounded loading bar with percentage indicator. This
      uses a tiny inline script to update percentage while the page loads and
      removes itself on DOMContentLoaded (or when `window.__APP_READY__` is set
      by app code). Keep markup minimal to ensure the browser can paint it
      immediately. */}
  {/* No global client-side preloader here: we only show the server preloader on
      the main page via a Suspense fallback. Removing this prevents the stuck
      0% client preloader appearing across route transitions. */}

  {/* Server preloader markup is emitted only on the main page (see `app/page.tsx`). */}
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

                  // Block some common keyboard shortcuts (Ctrl/Cmd + C/S/U/P/I/J) and F12
                  document.addEventListener('keydown', function(e){
                    var k = (e.key || '').toLowerCase();
                    var code = e.keyCode || e.which;
                    // F12
                    if (code === 123 || k === 'f12') {
                      e.preventDefault();
                      return;
                    }
                    if ((e.ctrlKey || e.metaKey) && ['c','s','u','p','a','x','i','j'].indexOf(k) !== -1) {
                      e.preventDefault();
                      return;
                    }
                    if (e.ctrlKey && e.shiftKey && ['c','i','j'].indexOf(k) !== -1) {
                      e.preventDefault();
                      return;
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

