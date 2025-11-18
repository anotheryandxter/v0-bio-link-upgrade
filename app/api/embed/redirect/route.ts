import { NextResponse, type NextRequest } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const source = url.searchParams.get("source")
    if (!source) return NextResponse.next()

    const admin = createAdminSupabaseClient()

    // Lookup link by embed_slug (case-sensitive exact match). Also ensure active.
    const { data: links, error } = await admin
      .from("links")
      .select("id, url, is_active")
      .eq("embed_slug", source)
      .limit(1)

    if (error) {
      console.error("Embed redirect lookup error:", error)
      return NextResponse.next()
    }

    const link = Array.isArray(links) && links.length > 0 ? (links as any)[0] : null
    if (!link || !link.is_active || !link.url) {
      return NextResponse.next()
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
      const { error: rpcErr } = await admin.rpc("insert_click_if_not_exists", {
        p_link_id: link.id,
        p_user_identifier: null,
        p_user_agent: userAgent,
        p_referrer: referrer,
        p_ip: ip || null,
      })

      if (rpcErr) console.error("Failed to record embed click:", rpcErr)
    } catch (e) {
      console.error("Embed click logging failed:", e)
    }

    // Redirect to the configured URL
    return NextResponse.redirect(link.url, 307)
  } catch (e) {
    console.error("Unhandled error in embed redirect:", e)
    return NextResponse.next()
  }
}
