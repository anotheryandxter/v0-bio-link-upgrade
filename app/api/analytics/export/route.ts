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
  // single-admin site: profile exists for admin but analytics RPCs are now profile-agnostic

    const admin = createAdminSupabaseClient()

    // Support optional query params for range and filtering
    const url = new URL(request.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    const linkId = url.searchParams.get('linkId')
    const search = url.searchParams.get('search')

    const { data: rows, error } = await admin.rpc("get_link_stats", {
      p_start_date: start || null,
      p_end_date: end || null,
      p_link_id: linkId || null,
      p_search: search || null,
    })
    if (error) {
      console.error("Failed to fetch monthly stats:", error)
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    // If client requested CSV
    const reqUrl = new URL(request.url)
    if (reqUrl.searchParams.get("format") === "csv") {
      const header = "link_id,title,month,clicks\n"
      const csv = rows.map((r: any) => `${r.link_id},"${(r.title || "").replace(/"/g, '""')}",${r.month},${r.clicks}`).join("\n")
      return new NextResponse(header + csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="monthly_stats.csv"`,
        },
      })
    }

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("Export error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
