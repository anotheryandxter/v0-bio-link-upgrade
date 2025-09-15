import { createServerSupabaseClient } from "@/lib/supabase/server"
import { LinksManager } from "@/components/dashboard/links-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LinksPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()

  if (!profile) return null

  // Get links
  const { data: links } = await supabase.from("links").select("*").eq("profile_id", profile.id).order("order_index")

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Link Management</h1>
        <p className="text-muted-foreground">Manage your bio-link buttons and their appearance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Links</CardTitle>
          <CardDescription>Add, edit, and reorder your bio-link buttons</CardDescription>
        </CardHeader>
        <CardContent>
          <LinksManager profileId={profile.id} initialLinks={links || []} />
        </CardContent>
      </Card>
    </div>
  )
}
