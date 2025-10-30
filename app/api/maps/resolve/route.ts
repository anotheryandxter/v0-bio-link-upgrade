import type { NextRequest } from "next/server"
import getRedisClient from "@/lib/cache/redis"

// Resolver endpoint
// - Accepts `title=<text>` to resolve via Nominatim (OpenStreetMap)
// - Accepts `url=<url>` to follow redirects and extract coordinates or place_id from the final URL
// Results are cached in Redis when available.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const title = url.searchParams.get("title")
    const rawUrl = url.searchParams.get("url")

    const cache = getRedisClient()

    const cachedReturn = async (key: string) => {
      if (!cache) return null
      try {
        const c = await cache.get(key)
        if (c) return c
      } catch (e) {
        // ignore cache errors
      }
      return null
    }

    // If a URL is provided, try to follow redirects and parse the final destination
    if (rawUrl) {
      const cacheKey = `maps:resolve:url:${rawUrl}`
      const cached = await cachedReturn(cacheKey)
      if (cached) return new Response(cached, { headers: { "Content-Type": "application/json" } })

      // Follow redirects
      const rsp = await fetch(rawUrl, { method: "GET", redirect: "follow" })
      const finalUrl = rsp.url || rawUrl

      try {
        const fu = new URL(finalUrl)
        // Check query params for destination_place_id or destination
        const destPlace = fu.searchParams.get("destination_place_id")
        const dest = fu.searchParams.get("destination")
        if (destPlace) {
          // If we have a Google Maps API key, try to resolve place_id -> lat/lng
          const googleKey = process.env.GOOGLE_MAPS_API_KEY
          if (googleKey) {
            try {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
                destPlace,
              )}&fields=geometry&key=${googleKey}`
              const detailsRsp = await fetch(detailsUrl)
              if (detailsRsp.ok) {
                const detailsJson = await detailsRsp.json()
                const loc = detailsJson?.result?.geometry?.location
                if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
                  const body = JSON.stringify({ place_id: destPlace, lat: String(loc.lat), lng: String(loc.lng) })
                  if (cache) await cache.set(cacheKey, body, "EX", 60 * 60 * 24)
                  return new Response(body, { headers: { "Content-Type": "application/json" } })
                }
              }
            } catch (e) {
              // ignore Google failures and fall back to returning place_id only
              console.debug("google place details failed", e)
            }
          }

          const body = JSON.stringify({ place_id: destPlace })
          if (cache) await cache.set(cacheKey, body, "EX", 60 * 60 * 24)
          return new Response(body, { headers: { "Content-Type": "application/json" } })
        }
        if (dest) {
          const parts = dest.split(",")
          if (parts.length >= 2) {
            const body = JSON.stringify({ lat: String(parts[0]), lng: String(parts[1]) })
            if (cache) await cache.set(cacheKey, body, "EX", 60 * 60 * 24)
            return new Response(body, { headers: { "Content-Type": "application/json" } })
          }
        }

        // Also look for @lat,lng in the path (common in Google Maps share links)
        const pathMatch = fu.pathname.match(/@([-0-9.]+),([-0-9.]+)/)
        if (pathMatch) {
          const body = JSON.stringify({ lat: pathMatch[1], lng: pathMatch[2] })
          if (cache) await cache.set(cacheKey, body, "EX", 60 * 60 * 24)
          return new Response(body, { headers: { "Content-Type": "application/json" } })
        }
      } catch (e) {
        // ignore
      }
      // fallthrough to title-based resolution if available
    }

    // Title-based resolution via Nominatim
    const useTitle = title
    if (!useTitle && !rawUrl) {
      return new Response(JSON.stringify({ error: "missing_title_or_url" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const key = `maps:resolve:title:${useTitle}`
    const cachedTitle = await cachedReturn(key)
    if (cachedTitle) return new Response(cachedTitle, { headers: { "Content-Type": "application/json" } })

    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(useTitle || "")}&limit=1&addressdetails=0`
    const nomRsp = await fetch(nomUrl, { headers: { "User-Agent": "biolink-app/1.0 (+https://example.com)" } })
    if (!nomRsp.ok) return new Response(JSON.stringify({ error: "nominatim_failed" }), { status: 502, headers: { "Content-Type": "application/json" } })

    const data = await nomRsp.json()
    if (!Array.isArray(data) || data.length === 0) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "Content-Type": "application/json" } })

    const first = data[0]
    if (!first.lat || !first.lon) return new Response(JSON.stringify({ error: "no_coords" }), { status: 404, headers: { "Content-Type": "application/json" } })

    const body = JSON.stringify({ lat: String(first.lat), lng: String(first.lon) })
    if (cache) {
      try {
        await cache.set(key, body, "EX", 60 * 60 * 24)
      } catch (e) {
        // ignore
      }
    }

    return new Response(body, { headers: { "Content-Type": "application/json" } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
