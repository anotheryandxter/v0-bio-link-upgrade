#!/usr/bin/env node
/**
 * Bulk-generate and store static map images for links that have location data but
 * are missing `background_image`.
 *
 * Usage:
 *   BASE_URL=https://rflctnstd.com NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/014_generate_map_images.js [--dry-run]
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
  console.log("[generate_maps] Starting — dryRun:", DRY_RUN)

  const { data: rows, error } = await supabase
    .from("links")
    .select("id, title, url, place_id, lat, lng, background_image")
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

  let generated = 0
  for (const r of rows) {
    try {
      if (r.background_image) continue
      // Only attempt for rows that have some location info
      if (!r.place_id && !(r.lat && r.lng) && !r.url) continue

      console.log(`[generate_maps] Generating for id=${r.id}`)
      const genUrl = `${BASE_URL}/api/maps/generate`
      if (DRY_RUN) {
        console.log(`[generate_maps] DRY RUN: would POST ${genUrl} { id: ${r.id} }`)
        continue
      }

      const rsp = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id }),
      })
      if (!rsp.ok) {
        console.warn(`[generate_maps] generator returned ${rsp.status} for id=${r.id}`)
        continue
      }
      const json = await rsp.json()
      if (json && json.background_image) {
        console.log(`[generate_maps] Generated image for id=${r.id} -> ${json.background_image}`)
        generated++
      } else {
        console.log(`[generate_maps] Generator succeeded for id=${r.id} but no background_image returned`)
      }
    } catch (e) {
      console.error(`[generate_maps] Error for id=${r.id}:`, e?.message || e)
    }
  }

  console.log(`[generate_maps] Done — generated=${generated}`)
}

main().catch((err) => {
  console.error("Script failed:", err?.message || err)
  process.exit(1)
})
