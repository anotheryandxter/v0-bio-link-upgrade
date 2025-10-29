import * as React from 'react'
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getCachedMonthlyStats, setCachedMonthlyStats } from '@/lib/cache/monthlyStatsCache'
import { timeAsync } from '@/lib/profiler'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card"
import dynamicImport from 'next/dynamic'
const AnalyticsPanelClient = dynamicImport(() => import('@/components/dashboard/analytics-panel-client'), { ssr: false })

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

  const admin = createAdminSupabaseClient()

  // Default range: last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const startStr = sixMonthsAgo.toISOString().slice(0,10)
  const endStr = new Date().toISOString().slice(0,10)

  const cacheKey = `monthly::${startStr}:${endStr}`
  let monthlyRows = getCachedMonthlyStats(cacheKey)
  if (!monthlyRows) {
    const rpcResult: any = await timeAsync('rpc:get_link_stats', async () => await admin.rpc('get_link_stats', { p_start_date: startStr, p_end_date: endStr }))
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
    name: `${r.title} (${new Date(r.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })})`,
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
            <div className="text-3xl font-bold">
              {clicksData?.filter((click: any) => {
                const clickDate = new Date(click.clicked_at)
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                return clickDate > yesterday
              }).length || 0}
            </div>
          </CardContentAny>
        </CardAny>

        <CardAny>
          <CardHeaderAny>
            <CardTitleAny>This Week</CardTitleAny>
            <CardDescriptionAny>Clicks in the last 7 days</CardDescriptionAny>
          </CardHeaderAny>
          <CardContentAny>
            <div className="text-3xl font-bold">
              {clicksData?.filter((click: any) => {
                const clickDate = new Date(click.clicked_at)
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return clickDate > weekAgo
              }).length || 0}
            </div>
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
                        <AnalyticsPanelAny links={clicksData?.map((c: any) => c.links).filter(Boolean)} defaultStart={startStr} defaultEnd={endStr} profileId={profile.id} />
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
