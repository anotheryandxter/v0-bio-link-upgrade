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
    const activeOnly = url.searchParams.get('activeOnly') === 'true'

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

    // If requested, filter results to only include currently active links
    let filteredRows = rows || []
    if (activeOnly) {
      try {
        // Determine profile id: prefer explicit param, otherwise resolve from session
        let profileIdParam: string | null = url.searchParams.get('profileId')
        if (!profileIdParam) {
          const { data: profileRows } = await admin.from('profiles').select('id,user_id').eq('user_id', user.id).limit(1)
          profileIdParam = Array.isArray(profileRows) && profileRows.length > 0 ? (profileRows[0] as any).id : null
        }
        // If we have a profile, fetch active link ids for that profile; otherwise fetch all active links
        let q = admin.from('links').select('id')
        if (profileIdParam) q = q.eq('profile_id', profileIdParam)
        q = q.eq('is_active', true)
        const { data: activeLinks } = await q
        const activeSet = new Set((activeLinks || []).map((r: any) => String(r.id)))
        filteredRows = (rows || []).filter((r: any) => activeSet.has(String(r.link_id)))
      } catch (e) {
        console.error('Failed to filter active links for export:', e)
        // fall back to unfiltered rows
      }
    }

    // If client requested CSV
    const reqUrl = new URL(request.url)
    if (reqUrl.searchParams.get("format") === "csv") {
      const header = "link_id,title,month,clicks\n"
      const csvRows = (filteredRows || []).map((r: any) => `${r.link_id},"${(r.title || "").replace(/"/g, '""')}",${r.month},${r.clicks}`).join("\n")
      return new NextResponse(header + csvRows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="monthly_stats.csv"`,
        },
      })
    }
    return NextResponse.json({ data: filteredRows })
  } catch (err) {
    console.error("Export error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
