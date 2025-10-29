import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
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
        {/* FontAwesome stylesheet - preload and preconnect for faster FCP */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
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
      </body>
    </html>
  )
}

