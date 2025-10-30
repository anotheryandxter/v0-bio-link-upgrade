import type { NextRequest } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

async function fetchPlaceDetails(placeId: string, key: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${encodeURIComponent(
    key,
  )}`
  const rsp = await fetch(url)
  if (!rsp.ok) return null
  const j = await rsp.json()
  const loc = j?.result?.geometry?.location
  if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") return { lat: loc.lat, lng: loc.lng }
  return null
}

async function reverseGeocode(lat: number, lng: number, key: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat + "," + lng)}&key=${encodeURIComponent(
    key,
  )}`
  const rsp = await fetch(url)
  if (!rsp.ok) return null
  const j = await rsp.json()
  const first = Array.isArray(j?.results) && j.results[0]
  if (!first) return null
  return first.place_id || null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body?.id
    if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { data: link, error } = await supabase.from("links").select("*").eq("id", id).single()
    if (error || !link) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "Content-Type": "application/json" } })

    if (link.category !== "location") {
      return new Response(JSON.stringify(link), { headers: { "Content-Type": "application/json" } })
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY
    let update: any = {}

    // If we have place_id but missing coords, try Place Details
    if (link.place_id && (!link.lat || !link.lng) && googleKey) {
      try {
        const loc = await fetchPlaceDetails(link.place_id, googleKey)
        if (loc) {
          update.lat = String(loc.lat)
          update.lng = String(loc.lng)
        }
      } catch (e) {
        // ignore
      }
    }

    // If we have coords but no place_id, attempt reverse geocode
    if ((!link.place_id || link.place_id === null) && link.lat && link.lng && googleKey) {
      try {
        const pid = await reverseGeocode(Number(link.lat), Number(link.lng), googleKey)
        if (pid) update.place_id = pid
      } catch (e) {
        // ignore
      }
    }

    // Nothing to do
    if (Object.keys(update).length === 0) {
      return new Response(JSON.stringify(link), { headers: { "Content-Type": "application/json" } })
    }

    const { data: updated, error: updErr } = await supabase.from("links").update(update).eq("id", id).select().single()
    if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { "Content-Type": "application/json" } })

    return new Response(JSON.stringify(updated), { headers: { "Content-Type": "application/json" } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
