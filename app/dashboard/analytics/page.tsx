import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()

  if (!profile) return null

  // Get analytics data
  const { data: clicksData } = await supabase
    .from("link_clicks")
    .select(`
      *,
      links!inner(title, url, profile_id)
    `)
    .eq("links.profile_id", profile.id)
    .order("clicked_at", { ascending: false })
    .limit(100)

  const totalClicks = clicksData?.length || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your bio-link performance and engagement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Clicks</CardTitle>
            <CardDescription>All-time link clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClicks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Clicks</CardTitle>
            <CardDescription>Clicks in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {clicksData?.filter((click) => {
                const clickDate = new Date(click.clicked_at)
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                return clickDate > yesterday
              }).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
            <CardDescription>Clicks in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {clicksData?.filter((click) => {
                const clickDate = new Date(click.clicked_at)
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return clickDate > weekAgo
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Clicks</CardTitle>
          <CardDescription>Latest link interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {clicksData && clicksData.length > 0 ? (
            <div className="space-y-2">
              {clicksData.slice(0, 10).map((click) => (
                <div key={click.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <div className="font-medium">{click.links.title}</div>
                    <div className="text-sm text-muted-foreground">{click.links.url}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(click.clicked_at).toLocaleDateString()} {new Date(click.clicked_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-chart-bar text-4xl mb-4 block" />
              <p>No clicks recorded yet. Share your bio-link to start tracking!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
