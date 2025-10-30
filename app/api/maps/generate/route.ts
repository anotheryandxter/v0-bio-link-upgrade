import type { NextRequest } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

// Generate a static map image for a link and store it in Supabase storage.
// POST { id }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body?.id
    if (!id) return new Response(JSON.stringify({ error: 'missing_id' }), { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { data: link, error: fetchErr } = await supabase.from('links').select('id,place_id,lat,lng,title,background_image,url').eq('id', id).single()
    if (fetchErr) return new Response(JSON.stringify({ error: 'link_not_found', detail: fetchErr.message }), { status: 404 })

    // If a background image is already present, do nothing (idempotent)
    if (link.background_image) return new Response(JSON.stringify(link), { status: 200 })

    let lat: string | null = link.lat ? String((link as any).lat) : null
    let lng: string | null = link.lng ? String((link as any).lng) : null
    const googleKey = process.env.GOOGLE_MAPS_API_KEY

    // Try to resolve place_id -> coords using Google if configured
    if ((!lat || !lng) && link.place_id && googleKey) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(link.place_id)}&fields=geometry&key=${googleKey}`
        const detailsRsp = await fetch(detailsUrl)
        if (detailsRsp.ok) {
          const detailsJson = await detailsRsp.json()
          const loc = detailsJson?.result?.geometry?.location
          if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
            lat = String(loc.lat)
            lng = String(loc.lng)
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Fallback: try Nominatim by title or place_id when Google not available
    if ((!lat || !lng) && (link.title || link.place_id)) {
      try {
        const q = link.title ? link.title : link.place_id
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
        const nom = await fetch(nomUrl, { headers: { 'User-Agent': 'biolink/1.0 (+https://example.com)' } })
        if (nom.ok) {
          const arr = await nom.json()
          if (Array.isArray(arr) && arr[0]) {
            lat = String(arr[0].lat)
            lng = String(arr[0].lon)
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!lat || !lng) {
      // As a last resort, try to resolve from the stored URL via our resolver
      try {
        const host = req.headers.get('host') || ''
        const proto = req.headers.get('x-forwarded-proto') || 'https'
        const origin = `${proto}://${host}`
        if (link.url) {
          const resolverUrl = `${origin}/api/maps/resolve?url=${encodeURIComponent(link.url)}`
          const r = await fetch(resolverUrl)
          if (r.ok) {
            const j = await r.json()
            if (j?.lat && j?.lng) {
              lat = String(j.lat)
              lng = String(j.lng)
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!lat || !lng) return new Response(JSON.stringify({ error: 'could_not_resolve_coords' }), { status: 422 })

    // Build static map URL (prefer Google if key available)
    let imgBytes: Uint8Array | null = null
    try {
      if (googleKey) {
        const gParams = new URLSearchParams()
        gParams.set('center', `${lat},${lng}`)
        gParams.set('zoom', '15')
        gParams.set('size', '1280x480')
        gParams.set('scale', '2')
        gParams.set('maptype', 'roadmap')
        gParams.set('markers', `color:red|${lat},${lng}`)
        gParams.set('key', googleKey)
        const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?${gParams.toString()}`
        const rsp = await fetch(staticUrl)
        if (rsp.ok) {
          const buf = await rsp.arrayBuffer()
          imgBytes = new Uint8Array(buf)
        }
      }
    } catch (e) {
      // ignore google errors
    }

    // OSM fallback
    if (!imgBytes) {
      const base = 'https://staticmap.openstreetmap.de/staticmap.php'
      const p = new URLSearchParams()
      p.set('center', `${lat},${lng}`)
      p.set('zoom', '15')
      p.set('size', '1280x480')
      p.set('markers', `${lat},${lng},red-pushpin`)
      const rsp = await fetch(`${base}?${p.toString()}`)
      if (!rsp.ok) return new Response(JSON.stringify({ error: 'static_fetch_failed' }), { status: 502 })
      const buf = await rsp.arrayBuffer()
      imgBytes = new Uint8Array(buf)
    }

    // Upload to Supabase storage. Make bucket configurable via SUPABASE_STORAGE_BUCKET
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'public'
    const path = `maps/${id}-${Date.now()}.png`
    // Supabase client accepts Uint8Array/Buffer
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, Buffer.from(imgBytes as any), { cacheControl: 'public, max-age=31536000', upsert: false })
    if (upErr) {
      // If the configured bucket doesn't exist, attempt a safe fallback:
      // list available buckets in the Supabase project and try the first one.
      const msg = String(upErr.message || '')
      if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found')) {
        try {
          const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
          if (base && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const listRsp = await fetch(`${base}/storage/v1/bucket`, {
              headers: {
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              },
            })
            if (listRsp.ok) {
              const buckets = await listRsp.json()
              const fallback = Array.isArray(buckets) && buckets[0] && (buckets[0].name || buckets[0].id)
              if (fallback) {
                const fallbackName = buckets[0].name || buckets[0].id
                const { error: up2 } = await supabase.storage.from(fallbackName).upload(path, Buffer.from(imgBytes as any), { cacheControl: 'public, max-age=31536000', upsert: false })
                if (!up2) {
                  const { data: pub2 } = supabase.storage.from(fallbackName).getPublicUrl(path)
                  const { data: updated2, error: updErr2 } = await supabase.from('links').update({ background_image: pub2.publicUrl }).eq('id', id).select().single()
                  if (updErr2) return new Response(JSON.stringify({ error: 'db_update_failed', detail: updErr2.message }), { status: 500 })
                  return new Response(JSON.stringify({ ...updated2, _storage_bucket_used: fallbackName }), { status: 200 })
                }
              }
            }
          }
        } catch (e) {
          // ignore fallback errors
        }

        return new Response(JSON.stringify({ error: 'storage_upload_failed', detail: upErr.message, hint: `Configured bucket '${bucket}' not found. Consider setting SUPABASE_STORAGE_BUCKET to an existing bucket (e.g. 'static') or create the bucket in your Supabase project.` }), { status: 500 })
      }

      return new Response(JSON.stringify({ error: 'storage_upload_failed', detail: upErr.message }), { status: 500 })
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)

    // Update link row with the public URL
    const { data: updated, error: updErr } = await supabase.from('links').update({ background_image: pub.publicUrl }).eq('id', id).select().single()
    if (updErr) return new Response(JSON.stringify({ error: 'db_update_failed', detail: updErr.message }), { status: 500 })

    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 })
  }
}
