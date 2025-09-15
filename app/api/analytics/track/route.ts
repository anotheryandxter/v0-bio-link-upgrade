import { createServerSupabaseClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { linkId, userAgent, referrer } = await request.json()
    const supabase = await createServerSupabaseClient()

    // Get client IP address
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip")

    const { error } = await supabase.from("link_clicks").insert({
      link_id: linkId,
      user_agent: userAgent,
      referrer: referrer,
      ip_address: ip,
    })

    if (error) {
      console.error("Failed to track click:", error)
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Analytics tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
