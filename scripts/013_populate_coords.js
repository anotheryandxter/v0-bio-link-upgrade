#!/usr/bin/env node
/**
 * Bulk-populate lat/lng for existing links
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/013_populate_coords.js [--dry-run]
 *
 * The script queries the `links` table for rows in category='location' that are missing
 * lat/lng and attempts to resolve coordinates using the server-side resolver endpoint
 * `/api/maps/resolve`. If coordinates are found the row is updated in-place.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const DRY_RUN = process.argv.includes("--dry-run")

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  console.log("[populate_coords] Starting — dryRun:", DRY_RUN)

  // Fetch candidate links — limit to 1000 for safety; increase/paginate as needed
  const { data: rows, error } = await supabase
    .from("links")
    .select("id, url, place_id, lat, lng")
    .eq("category", "location")
    .limit(1000)

  if (error) {
    console.error("Supabase query failed:", error.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log("No location links found")
    return
  }

  let updated = 0
  for (const r of rows) {
    try {
      const needsCoords = !(r.lat && r.lng)
      if (!needsCoords) continue

      // Only attempt to resolve if we have either a place_id or a URL
      if (!r.place_id && !r.url) continue

      // The resolver expects either a `url=` or `title=` parameter. For a
      // Google place_id we synthesize a directions URL which the resolver will
      // follow and detect `destination_place_id` in the final URL.
      const resolverUrl = r.place_id
        ? `${BASE_URL}/api/maps/resolve?url=${encodeURIComponent(
            `https://www.google.com/maps/dir/?api=1&destination_place_id=${r.place_id}`,
          )}`
        : `${BASE_URL}/api/maps/resolve?url=${encodeURIComponent(r.url)}`

      console.log(`[populate_coords] Resolving link id=${r.id} via ${resolverUrl}`)
      const rsp = await fetch(resolverUrl)
      if (!rsp.ok) {
        console.warn(`[populate_coords] resolver returned ${rsp.status} for id=${r.id}`)
        continue
      }
      const json = await rsp.json()
      if (json?.lat && json?.lng) {
        console.log(`[populate_coords] Resolved id=${r.id} -> ${json.lat},${json.lng}`)
        if (!DRY_RUN) {
          const { error: upErr } = await supabase.from("links").update({ lat: Number(json.lat), lng: Number(json.lng), place_id: json.place_id || r.place_id }).eq("id", r.id)
          if (upErr) {
            console.error(`[populate_coords] Failed to update id=${r.id}:`, upErr.message)
          } else {
            updated++
          }
        }
      } else {
        console.log(`[populate_coords] No coords found for id=${r.id}`)
      }
    } catch (e) {
      console.error(`[populate_coords] Error for id=${r.id}:`, e?.message || e)
    }
  }

  console.log(`[populate_coords] Done — updated=${updated}`)
}

main().catch((err) => {
  console.error("Script failed:", err?.message || err)
  process.exit(1)
})
