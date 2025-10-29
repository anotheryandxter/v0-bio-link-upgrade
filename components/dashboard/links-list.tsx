"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Link } from "@/types"
import { usePathname } from "next/navigation"

interface LinksListProps {
  links: Link[]
  onEdit: (link: Link) => void
  onDelete: (linkId: string) => void
  onToggleActive: (linkId: string, isActive: boolean) => void
  isLoading: boolean
}

export function LinksList({ links, onEdit, onDelete, onToggleActive, isLoading }: LinksListProps) {
  const pathname = usePathname()
  const hideAnalytics = pathname === "/dashboard/links"
  const renderIcon = (icon: string) => {
    if (!icon) return <i className="fas fa-link text-lg" />

    // Check if it's a custom image (data URL or HTTP URL)
    if (icon.startsWith("data:") || icon.startsWith("http")) {
      return <img src={icon || "/placeholder.svg"} alt="" className="w-5 h-5 object-contain" />
    }

    // FontAwesome icon
    return <i className={`${icon} text-lg`} />
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <i className="fas fa-link text-4xl mb-4 block" />
        <p>No links yet. Add your first link to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div
          key={link.id}
          className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* Link Preview */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div style={{ color: link.text_color_light }}>{renderIcon(link.icon)}</div>
              <h4 className="font-medium truncate">{link.title}</h4>
              <Badge variant={link.is_active ? "default" : "secondary"}>{link.is_active ? "Active" : "Inactive"}</Badge>
              <Badge variant="outline">{link.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{link.url}</p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: link.background_color_light }}
                title="Light theme color"
              />
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: link.background_color_dark }}
                title="Dark theme color"
              />
              <span className="text-xs text-muted-foreground">Order: {link.order_index}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(link.id, !link.is_active)}
              disabled={isLoading}
            >
              <i className={`fas fa-${link.is_active ? "eye-slash" : "eye"} mr-1`} />
              {link.is_active ? "Hide" : "Show"}
            </Button>
            {!hideAnalytics && (
              <Button variant="outline" size="sm" onClick={() => onEdit(link)} disabled={isLoading}>
                <i className="fas fa-chart-bar mr-1" />
                Analytics
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(link)} disabled={isLoading}>
              <i className="fas fa-edit mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(link.id)}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700"
            >
              <i className="fas fa-trash mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
