import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    // Get profile
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    const admin = createAdminSupabaseClient()

    const { data: rows, error } = await admin.rpc("get_monthly_stats", { p_profile_id: profile.id })
    if (error) {
      console.error("Failed to fetch monthly stats:", error)
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    // If client requested CSV
    const url = new URL(request.url)
    if (url.searchParams.get("format") === "csv") {
      const header = "link_id,title,month,clicks\n"
      const csv = rows.map((r: any) => `${r.link_id},"${(r.title || "").replace(/"/g, '""')}",${r.month},${r.clicks}`).join("\n")
      return new NextResponse(header + csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="monthly_stats_${profile.id}.csv"`,
        },
      })
    }

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("Export error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
