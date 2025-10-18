import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const SuspenseAny = Suspense as any
  return (
    <html lang="en">
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
