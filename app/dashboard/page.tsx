import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get or create profile
  let { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    // Create default profile if it doesn't exist
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        business_name: "Reflection Photography",
        location: "Indonesia",
        page_title: "Reflection Photography",
        is_setup: false,
      })
      .select()
      .single()

    profile = newProfile
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your bio-link profile information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Update your business details and appearance settings</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  )
}
