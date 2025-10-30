import type { NextRequest } from "next/server"
import getRedisClient from "@/lib/cache/redis"

// Server-side proxy for static map images. When a GOOGLE_MAPS_API_KEY is
// configured we prefer calling Google's Static Maps API (and use Places
// Details to resolve a place_id → lat/lng). Otherwise we fall back to the
// open-source OpenStreetMap staticmap service. Images are cached in Redis.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const params = url.searchParams
    const center = params.get("center")
    const markers = params.get("markers")
    const placeId = params.get("place_id")
    const zoom = params.get("zoom") || "15"
    const size = params.get("size") || "640x240"

    if (!center && !markers && !placeId) return new Response("missing_center_or_markers", { status: 400 })

    const cache = getRedisClient()

    // If a Google Maps API key is present, prefer Google's static map + Places
    // resolution for place_id. This keeps Google-specific logic opt-in.
    const googleKey = process.env.GOOGLE_MAPS_API_KEY
    if (googleKey) {
      try {
        let lat: string | null = null
        let lng: string | null = null

        if (placeId) {
          // Resolve place_id → lat/lng using Places Details
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            placeId,
          )}&fields=geometry&key=${googleKey}`
          const detailsRsp = await fetch(detailsUrl)
          if (detailsRsp.ok) {
            const detailsJson = await detailsRsp.json()
            const loc = detailsJson?.result?.geometry?.location
            if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
              lat = String(loc.lat)
              lng = String(loc.lng)
            }
          }
        }

        // If no place_id or resolution failed, try to parse center param
        if ((!lat || !lng) && center) {
          const parts = center.split(",").map((s) => s.trim())
          if (parts.length >= 2) {
            lat = parts[0]
            lng = parts[1]
          }
        }

        if (lat && lng) {
          const gParams = new URLSearchParams()
          gParams.set("center", `${lat},${lng}`)
          gParams.set("zoom", String(zoom))
          // Google expects size like WxH
          gParams.set("size", String(size))
          gParams.set("maptype", "roadmap")
          gParams.set("scale", "2")
          gParams.set("key", googleKey)
          // marker at the destination
          gParams.set("markers", `color:red|${lat},${lng}`)

          const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?${gParams.toString()}`
          const cacheKey = `maps:static:google:${lat}:${lng}:${zoom}:${size}`

          if (cache) {
            try {
              const cached = await cache.get(cacheKey)
              if (cached) {
                const buf = Buffer.from(cached, "base64")
                const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
                const headers = new Headers()
                headers.set("Content-Type", "image/png")
                headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
                return new Response(bytes as any, { headers })
              }
            } catch (e) {
              // ignore cache errors
            }
          }

          const rsp = await fetch(staticUrl)
          if (rsp.ok) {
            const buf = await rsp.arrayBuffer()
            const bytes = new Uint8Array(buf)
            if (cache) {
              try {
                await cache.set(cacheKey, Buffer.from(bytes).toString("base64"), "EX", 60 * 60 * 24)
              } catch (e) {
                // ignore cache set errors
              }
            }

            const headers = new Headers()
            headers.set("Content-Type", rsp.headers.get("Content-Type") || "image/png")
            headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
            return new Response(bytes as any, { headers })
          }
          // If Google failed, fall through to OSM fallback below
        }
      } catch (e) {
        // If any Google calls fail, quietly fall back to OSM below
        console.debug("google staticmap failed, falling back to OSM", e)
      }
    }

    // If a placeId was provided but we don't have a Google key in this
    // environment, attempt to resolve coordinates using our resolver
    // endpoint. The resolver may call Google Places (if configured) or
    // fallback to other providers — using it keeps resolution logic
    // centralized.
    if (!process.env.GOOGLE_MAPS_API_KEY && placeId) {
      try {
        const origin = new URL(req.url).origin
        const resolverUrl = `${origin}/api/maps/resolve?url=${encodeURIComponent(
          `https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}`,
        )}`
        const r = await fetch(resolverUrl)
        if (r.ok) {
          const j = await r.json()
          if (j?.lat && j?.lng) {
            // Use resolved coords to fall through to OSM static map below
            params.set("center", `${j.lat},${j.lng}`)
          }
        }
      } catch (e) {
        // ignore resolver failures and fall back to OSM behavior
        console.debug("static resolver failed", e)
      }
    }

    // --- Fallback: OpenStreetMap staticmap service ---
    // Normalize to lat,lng for the staticmap.openstreetmap.de service
    const [cLat, cLng] = (center || markers || "").split(",").slice(0, 2)
    if (!cLat || !cLng) return new Response("invalid_coords", { status: 400 })

    const base = "https://staticmap.openstreetmap.de/staticmap.php"
    const fetchParams = new URLSearchParams()
    fetchParams.set("center", `${cLat},${cLng}`)
    fetchParams.set("zoom", String(zoom))
    fetchParams.set("size", String(size))
    // staticmap expects markers like "lat,lon,color" but supports simple markers param
    fetchParams.set("markers", `${cLat},${cLng},red-pushpin`)

    const staticUrl = `${base}?${fetchParams.toString()}`
    const cacheKey = `maps:static:${cLat}:${cLng}:${zoom}:${size}`
    if (cache) {
      try {
        const cached = await cache.get(cacheKey)
        if (cached) {
          // cached as base64 string
          const buf = Buffer.from(cached, "base64")
          const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
          const headers = new Headers()
          headers.set("Content-Type", "image/png")
          headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
          return new Response(bytes as any, { headers })
        }
      } catch (e) {
        // ignore cache errors
      }
    }

    const rsp = await fetch(staticUrl)
    if (!rsp.ok) return new Response("static_fetch_failed", { status: 502 })

    const buf = await rsp.arrayBuffer()
    const bytes = new Uint8Array(buf)

    if (cache) {
      try {
        // store as base64 string; TTL 24h
        await cache.set(cacheKey, Buffer.from(bytes).toString("base64"), "EX", 60 * 60 * 24)
      } catch (e) {
        // ignore
      }
    }

    const headers = new Headers()
    headers.set("Content-Type", rsp.headers.get("Content-Type") || "image/png")
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
    return new Response(bytes as any, { headers })
  } catch (err: any) {
    return new Response(String(err?.message || err), { status: 500 })
  }
}
