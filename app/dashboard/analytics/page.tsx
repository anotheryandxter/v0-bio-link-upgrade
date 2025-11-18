import * as React from 'react'
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCachedMonthlyStats, setCachedMonthlyStats } from '@/lib/cache/monthlyStatsCache'
import { formatMonthShort, startOfDayIsoTZ } from '@/lib/timezone'
import { timeAsync } from '@/lib/profiler'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card"
import AnalyticsPanelClient from '@/components/dashboard/analytics-client-wrapper'

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get profile (admin user metadata); keep for UI but analytics are site-wide
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()

  if (!profile) return null

  // Get monthly aggregated analytics data via admin RPC
  // Also fetch recent raw clicks for 'today' and 'this week' cards
  const { data: clicksData } = await supabase
    .from("link_clicks")
    .select(`
      *,
      links!inner(title, url)
    `)
    .order("clicked_at", { ascending: false })
    .limit(100)

  // Also fetch all links for this profile so the dashboard can show every link
  // (even those with zero recorded clicks). This prevents the dropdown from
  // only showing recently clicked links.
  let allLinks: any[] = []
  try {
    const { data: linksData, error: linksErr } = await admin.from('links').select('id,title,url').eq('profile_id', profile.id)
    if (!linksErr && Array.isArray(linksData)) allLinks = linksData
    // Fetch totals from materialized view and merge counts into the links list
    try {
      // Prefer Jakarta-aware materialized view if present
      let mvRows: any = null
      try {
        const res = await admin.from('monthly_link_stats_jakarta').select('link_id,clicks').eq('profile_id', profile.id)
        mvRows = res.data
        if (res.error) throw res.error
      } catch (e) {
        const res = await admin.from('monthly_link_stats').select('link_id,clicks').eq('profile_id', profile.id)
        mvRows = res.data
      }
      const mvErr = null
      if (Array.isArray(mvRows)) {
        const totalsMap = new Map<string, number>()
        for (const r of mvRows) {
          const lid = r.link_id
          const prev = totalsMap.get(lid) || 0
          totalsMap.set(lid, prev + (r.clicks || 0))
        }
        allLinks = (allLinks || []).map(l => ({ ...l, clicks: totalsMap.get(l.id) || 0 }))
      } else {
        // ensure clicks default to 0
        allLinks = (allLinks || []).map(l => ({ ...l, clicks: 0 }))
      }
    } catch (e) {
      console.error('Failed to fetch totals from monthly_link_stats', e)
      allLinks = (allLinks || []).map(l => ({ ...l, clicks: 0 }))
    }
  } catch (e) {
    console.error('Failed to fetch profile links for analytics dropdown', e)
  }

  // Compute precise counts for Today and This Week using admin (avoid 100-row cap)
  const admin = createAdminSupabaseClient()

  // Today's clicks: start of today in GMT+7 (exclude embedded redirects)
  const yesterdayStr = startOfDayIsoTZ(0)
  let todayCount = 0
  try {
    const { count, error } = await admin
      .from('link_clicks')
      .select('id', { count: 'exact' })
      .gte('clicked_at', yesterdayStr)
      .not('user_identifier', 'is', null)
    if (!error) todayCount = count || 0
  } catch (e) {
    console.error('Failed to fetch today count', e)
  }

  // This Week: last 7 days, same exclusion of embedded clicks
  const weekAgoStr = startOfDayIsoTZ(7)
  let weekCount = 0
  try {
    const { count, error } = await admin
      .from('link_clicks')
      .select('id', { count: 'exact' })
      .gte('clicked_at', weekAgoStr)
      .not('user_identifier', 'is', null)
    if (!error) weekCount = count || 0
  } catch (e) {
    console.error('Failed to fetch week count', e)
  }

  // Default range: last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const startStr = sixMonthsAgo.toISOString().slice(0,10)
  const endStr = new Date().toISOString().slice(0,10)

  const cacheKey = `monthly::${startStr}:${endStr}`
  let monthlyRows = getCachedMonthlyStats(cacheKey)
  if (!monthlyRows) {
    // Try Jakarta-aware RPC first, then fall back to the original RPC
    let rpcResult: any = await timeAsync('rpc:get_link_stats_jakarta', async () => await admin.rpc('get_link_stats_jakarta', { p_profile_id: profile.id, p_start_date: startStr, p_end_date: endStr }))
    if (rpcResult?.error) {
      rpcResult = await timeAsync('rpc:get_link_stats', async () => await admin.rpc('get_link_stats', { p_profile_id: profile.id, p_start_date: startStr, p_end_date: endStr }))
    }
    const data = rpcResult?.data
    const monthlyErr = rpcResult?.error
    if (monthlyErr) {
      console.error('Failed to load monthly stats:', monthlyErr)
    }
    monthlyRows = data || []
    setCachedMonthlyStats(cacheKey, monthlyRows)
  }

  const totalClicks = monthlyRows ? monthlyRows.reduce((s: number, r: any) => s + (r.clicks || 0), 0) : 0

  // Prepare data for chart: aggregate per link title across months (simple flattened view)
  const chartData = (monthlyRows || []).map((r: any) => ({
    name: `${r.title} (${formatMonthShort(r.month)})`,
    clicks: r.clicks,
  }))

  const CardAny = Card as any
  const CardHeaderAny = CardHeader as any
  const CardTitleAny = CardTitle as any
  const CardDescriptionAny = CardDescription as any
  const CardContentAny = CardContent as any
  const CardActionAny = CardAction as any
  const CardFooterAny = CardFooter as any
  const AnalyticsPanelAny = AnalyticsPanelClient as any

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your bio-link performance and engagement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardAny>
          <CardHeaderAny>
            <CardTitleAny>Total Clicks</CardTitleAny>
            <CardDescriptionAny>All-time link clicks</CardDescriptionAny>
          </CardHeaderAny>
          <CardContentAny>
            <div className="text-3xl font-bold">{totalClicks}</div>
          </CardContentAny>
        </CardAny>

        <CardAny>
          <CardHeaderAny>
            <CardTitleAny>Today's Clicks</CardTitleAny>
            <CardDescriptionAny>Clicks in the last 24 hours</CardDescriptionAny>
          </CardHeaderAny>
          <CardContentAny>
            <div className="text-3xl font-bold">{todayCount}</div>
          </CardContentAny>
        </CardAny>

        <CardAny>
          <CardHeaderAny>
            <CardTitleAny>This Week</CardTitleAny>
            <CardDescriptionAny>Clicks in the last 7 days</CardDescriptionAny>
          </CardHeaderAny>
          <CardContentAny>
            <div className="text-3xl font-bold">{weekCount}</div>
          </CardContentAny>
        </CardAny>
      </div>

      <CardAny>
        <CardHeaderAny>
          <CardTitleAny>Recent Clicks</CardTitleAny>
          <CardDescriptionAny>Latest link interactions</CardDescriptionAny>
        </CardHeaderAny>
        <CardContentAny>
            {/* Show monthly chart if available */}
                    {chartData && chartData.length > 0 ? (
                      <>
                        <AnalyticsPanelAny links={allLinks} defaultStart={startStr} defaultEnd={endStr} profileId={profile.id} />
                      </>
                    ) : (
              <div className="text-center py-8 text-muted-foreground">
                <i className="fas fa-chart-bar text-4xl mb-4 block" />
                <p>No monthly stats available yet. Share your bio-link to start tracking!</p>
              </div>
            )}
        </CardContentAny>
      </CardAny>
    </div>
  )
}
