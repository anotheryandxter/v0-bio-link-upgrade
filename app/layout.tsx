import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
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
        <Analytics />
      </body>
    </html>
  )
}
