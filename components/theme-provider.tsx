'use client'

import * as React from 'react'

// ThemeProvider intentionally simplified to a no-op so there is no client-side theme toggle
// or system preference matching. Theme is forced via the <html className="dark"> in layout
// and CSS variables in `globals.css`.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
