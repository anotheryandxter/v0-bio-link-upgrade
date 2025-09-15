import type React from "react"
import type { Metadata } from "next"
import { generateGlobalMetadata } from "@/lib/metadata"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = await generateGlobalMetadata()
  return {
    ...baseMetadata,
    title: `Dashboard - ${baseMetadata.title}`,
    description: `Admin dashboard for ${baseMetadata.title}`,
  }
}

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
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
