"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

interface DashboardNavProps {
  user: User
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const navItems = [
    { href: "/dashboard", label: "Profile", icon: "fas fa-user" },
    { href: "/dashboard/links", label: "Links", icon: "fas fa-link" },
    { href: "/dashboard/analytics", label: "Analytics", icon: "fas fa-chart-bar" },
  ]

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <h1 className="text-lg md:text-xl font-bold">Reflection Photography</h1>
            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <i className={item.icon} />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank">
                <i className="fas fa-external-link-alt mr-2" />
                <span className="hidden lg:inline">View Site</span>
              </Link>
            </Button>
            <div className="hidden lg:block text-sm text-muted-foreground">{user.email}</div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt mr-2" />
              <span className="hidden lg:inline">Logout</span>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-muted"
          >
            <i className={mobileMenuOpen ? "fas fa-times" : "fas fa-bars"} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-2 pb-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <i className={item.icon} />
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" asChild className="w-full justify-start">
                <Link href="/" target="_blank">
                  <i className="fas fa-external-link-alt mr-2" />
                  View Site
                </Link>
              </Button>
              <div className="text-sm text-muted-foreground px-3 py-1">{user.email}</div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full justify-start">
                <i className="fas fa-sign-out-alt mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
