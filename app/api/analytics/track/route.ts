import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { linkId, userAgent, referrer, userIdentifier } = await request.json()

    // Get client IP address
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip")

    const admin = createAdminSupabaseClient()

    // Call the RPC function which enforces 24-hour deduplication per userIdentifier
    const { data, error } = await admin.rpc("insert_click_if_not_exists", {
      p_link_id: linkId,
      p_user_identifier: userIdentifier || null,
      p_user_agent: userAgent || null,
      p_referrer: referrer || null,
      p_ip: ip || null,
    })

    if (error) {
      console.error("Failed to track click (RPC):", error)
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
    }

    return NextResponse.json({ success: true, inserted: data })
  } catch (error) {
    console.error("Analytics tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
