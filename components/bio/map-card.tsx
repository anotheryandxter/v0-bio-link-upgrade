"use client"

import React, { useEffect, useState } from "react"
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

  // Try to extract coords or place_id from the stored directions URL
  const extractLocation = () => {
    try {
      if (!link.url) return { lat: null as string | null, lng: null as string | null, placeId: null as string | null }
      const placeMatch = link.url.match(/destination_place_id=([^&]+)/)
      if (placeMatch) return { lat: null, lng: null, placeId: decodeURIComponent(placeMatch[1]) }
      const coordMatch = link.url.match(/destination=([-0-9.]+),([-0-9.]+)/)
      if (coordMatch) return { lat: coordMatch[1], lng: coordMatch[2], placeId: null }
      return { lat: null, lng: null, placeId: null }
    } catch (e) {
      return { lat: null, lng: null, placeId: null }
    }
  }

  const { lat: initialLat, lng: initialLng, placeId } = extractLocation()

  // Prefer structured location fields if present on the link object
  const linkLat = (link as any).lat || initialLat
  const linkLng = (link as any).lng || initialLng

  const [resolvedCoords, setResolvedCoords] = useState<{ lat: string; lng: string } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  )
  const [isResolving, setIsResolving] = useState(false)

  // If we have no coords, try to resolve by title (Nominatim) and cache the result server-side
  useEffect(() => {
    let mounted = true
    const resolve = async () => {
      if (resolvedCoords) return
      if (linkLat && linkLng) return
      if (!link?.title) return
      setIsResolving(true)
      try {
        const titleRsp = await fetch(`/api/maps/resolve?title=${encodeURIComponent(link.title)}`)
        if (titleRsp.ok) {
          const j = await titleRsp.json()
          if (j?.lat && j?.lng && mounted) setResolvedCoords({ lat: String(j.lat), lng: String(j.lng) })
        }
      } catch (e) {
        // swallow
      } finally {
        if (mounted) setIsResolving(false)
      }
    }
    void resolve()
    return () => {
      mounted = false
    }
  }, [resolvedCoords, link?.title, linkLat, linkLng])

  // If the link already has a stored background image, prefer that so public
  // visitors don't trigger the dynamic static map proxy. Only build a
  // server-proxied static map when there is no stored `background_image`.
  const buildProxyMapUrl = (lat: string, lng: string) => {
    const params = new URLSearchParams()
    params.set("center", `${lat},${lng}`)
    params.set("zoom", "15")
    params.set("size", "640x240")
    return `/api/maps/static?${params.toString()}`
  }

  const staticMapUrl = !link.background_image
    ? (linkLat && linkLng && buildProxyMapUrl(String(linkLat), String(linkLng))) || (resolvedCoords ? buildProxyMapUrl(resolvedCoords.lat, resolvedCoords.lng) : null)
    : null

  return (
    <div
      onClick={handleClick}
      role="button"
      className="w-full rounded-xl mb-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/10 bg-white/5 cursor-pointer overflow-hidden"
      style={{
        backgroundColor: `${link.background_color_light}${Math.round((link.opacity ?? 0.8) * 255)
          .toString(16)
          .padStart(2, "0")}`,
        color: link.text_color_light,
  backgroundImage: link.background_image ? `url(${link.background_image})` : staticMapUrl ? `url(${staticMapUrl})` : undefined,
  backgroundSize: link.background_image || staticMapUrl ? "cover" : undefined,
  backgroundPosition: link.background_image || staticMapUrl ? "center" : undefined,
      }}
    >

      <div className="p-4 bg-gradient-to-t from-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 rounded-full w-12 h-12 flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
            </svg>
          </div>

          <div className="flex-1 text-left">
            <div className="font-semibold">{link.title}</div>
            {link.url && <div className="text-xs text-white/70 truncate">Open directions in Google Maps</div>}
          </div>

          <div className="text-sm text-white/80">Directions</div>
        </div>
      </div>
    </div>
  )
}
