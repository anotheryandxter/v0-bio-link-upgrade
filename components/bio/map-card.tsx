"use client"

import React from "react"
import type { Link as LinkType } from "@/types"

interface MapCardProps {
  link: LinkType
}

// Simple map-style card that opens directions (link.url should already be a
// Google Maps directions URL). Displays title, optional subtitle and a map
// marker icon. This intentionally avoids embedding Google Maps API keys — the
// link opens Google Maps in a new tab.
export default function MapCard({ link }: MapCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      window.open(link.url, "_blank", "noopener,noreferrer")
    } catch (err) {
      // fallback
      location.href = link.url
    }
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      className="w-full p-4 rounded-xl mb-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/10 bg-white/5 cursor-pointer"
      style={{
        backgroundColor: `${link.background_color_light}${Math.round((link.opacity ?? 0.8) * 255)
          .toString(16)
          .padStart(2, "0")}`,
        color: link.text_color_light,
        backgroundImage: link.background_image ? `url(${link.background_image})` : undefined,
        backgroundSize: link.background_image ? "cover" : undefined,
        backgroundPosition: link.background_image ? "center" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="bg-white/10 rounded-full w-12 h-12 flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
        </div>

        <div className="flex-1 text-left">
          <div className="font-semibold">{link.title}</div>
          {link.url && (
            <div className="text-xs text-white/70 truncate">Open directions in Google Maps</div>
          )}
        </div>

        <div className="text-sm text-white/80">Directions</div>
      </div>
    </div>
  )
}
