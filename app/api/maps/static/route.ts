import type { NextRequest } from "next/server"

// Server-side proxy for Google Static Maps. This endpoint fetches the static
// map image using the server-side API key stored in process.env.GOOGLE_MAPS_API_KEY
// and returns it directly to the client. Query params accepted:
// - center (optional) e.g. "lat,lng"
// - markers (optional) e.g. "color:red|lat,lng" or "place_id:PLACEID"
// - zoom (optional), size (optional)

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) return new Response("Missing server API key", { status: 500 })

    const url = new URL(req.url)
    const params = url.searchParams

    const staticBase = "https://maps.googleapis.com/maps/api/staticmap"
    const fetchParams = new URLSearchParams()

    // Whitelist expected params to avoid arbitrary requests
    const allowed = ["center", "zoom", "size", "scale", "maptype", "markers"]
    for (const k of allowed) {
      const v = params.get(k)
      if (v) fetchParams.set(k, v)
    }

    // default size/scale
    if (!fetchParams.has("size")) fetchParams.set("size", "640x240")
    if (!fetchParams.has("scale")) fetchParams.set("scale", "2")
    if (!fetchParams.has("maptype")) fetchParams.set("maptype", "roadmap")

    fetchParams.set("key", apiKey)

    const staticUrl = `${staticBase}?${fetchParams.toString()}`

    const rsp = await fetch(staticUrl)
    if (!rsp.ok) {
      const txt = await rsp.text()
      return new Response(txt, { status: rsp.status })
    }

  const buf = await rsp.arrayBuffer()
  const headers = new Headers()
  headers.set("Content-Type", rsp.headers.get("Content-Type") || "image/png")
  headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")

  // arrayBuffer is acceptable as BodyInit in newer runtimes; convert to Uint8Array
  return new Response(new Uint8Array(buf), { headers })
  } catch (err: any) {
    return new Response(String(err?.message || err), { status: 500 })
  }
}
