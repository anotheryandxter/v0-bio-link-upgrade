import { NextResponse, type NextRequest } from "next/server"

export const dynamic = 'force-dynamic'
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    let source = request.nextUrl.searchParams.get("source")
    if (!source) return new Response(null, { status: 204 })
    // Normalize the incoming slug: trim whitespace and prefer case-insensitive
    // matching so `Source=My-Slug` and `source=my-slug` behave the same.
    source = source.trim()
    if (!source) return new Response(null, { status: 204 })

    const admin = createAdminSupabaseClient()

    // Lookup link by embed_slug using a case-insensitive match. This keeps
    // behavior consistent regardless of the casing used in the incoming
    // `source` query param. We still require the link be active.
    const { data: links, error } = await admin
      .from("links")
      .select("id, url, is_active")
      .ilike("embed_slug", source)
      .limit(1)

    if (error) {
      console.error("Embed redirect lookup error:", error)
      return NextResponse.next()
    }

    const link = Array.isArray(links) && links.length > 0 ? (links as any)[0] : null
    if (!link || !link.is_active || !link.url) {
      return new Response(null, { status: 404 })
    }

    // Attempt to log the click via the server-side RPC. We don't block the redirect
    // on logging failures.
    try {
      const forwarded = request.headers.get("x-forwarded-for")
      const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip")
      const userAgent = request.headers.get("user-agent") || null
      const referrer = request.headers.get("referer") || null

      // Call insert_click_if_not_exists RPC to keep parity with client-side tracking
      // RPC accepts: p_link_id, p_user_identifier, p_user_agent, p_referrer, p_ip
      const rpcRes: any = await admin.rpc("insert_click_if_not_exists", {
        p_link_id: link.id,
        p_user_identifier: null,
        p_user_agent: userAgent,
        p_referrer: referrer,
        p_ip: ip || null,
        p_source: source || null,
      })

      // Supabase RPC returns { data, error }. If error exists, or data === false
      // (function ran but did not insert due to dedupe), we still want to record
      // the embed click. Treat both cases as a signal to perform a direct insert.
      const rpcErr = rpcRes?.error
      const rpcData = rpcRes?.data
      if (rpcErr || rpcData === false) {
        if (rpcErr) console.error("Failed to record embed click (RPC), falling back to direct insert:", rpcErr)
        try {
          // Force-insert a raw row into link_clicks to ensure the embed visit is recorded.
          // Include the incoming `source` slug so embed-originated clicks can be
          // attributed and filtered in analytics.
          const insertPayload: any = {
            link_id: link.id,
            user_agent: userAgent,
            referrer: referrer,
            ip_address: ip || null,
            source: source,
          }
          const { error: insertErr } = await admin.from('link_clicks').insert(insertPayload)
          if (insertErr) console.error('Fallback insert failed for embed click:', insertErr)
        } catch (ie) {
          console.error('Fallback embed click insert threw:', ie)
        }
      }
    } catch (e) {
      console.error("Embed click logging failed:", e)
    }

    // Strictly validate the URL protocol to prevent open redirect vulnerabilities
    try {
      const parsedUrl = new URL(link.url)
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        console.error("Invalid URL protocol for redirect:", link.url)
        return new Response("Bad Request: Invalid URL protocol", { status: 400 })
      }
    } catch (err) {
      console.error("Invalid URL format for redirect:", link.url)
      return new Response("Bad Request: Invalid URL", { status: 400 })
    }

    // Redirect to the configured URL
    return NextResponse.redirect(link.url, 307)
  } catch (e) {
    console.error("Unhandled error in embed redirect:", e)
    return NextResponse.next()
  }
}
