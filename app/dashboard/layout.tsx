import type React from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import SessionTimeout from "@/components/dashboard/session-timeout"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      {/* Client-only session idle watcher: will sign out after inactivity */}
      <SessionTimeout />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
