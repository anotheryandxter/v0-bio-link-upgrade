"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { Link } from "@/types"
import { usePathname } from "next/navigation"
import { LinkForm } from "./link-form"

interface LinksListProps {
  profileId: string
  links: Link[]
  editingLink?: Link | null
  onEdit: (link: Link) => void
  onDelete: (linkId: string) => void
  onToggleActive: (linkId: string, isActive: boolean) => void
  onFormSuccess: (link: Link) => void
  onFormCancel: () => void
  isLoading: boolean
}

function RegenerateButton({ linkId, disabled, onSuccess }: { linkId: string; disabled?: boolean; onSuccess: (updated: Link) => void }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading || disabled) return
    if (!confirm('Generate and store static map image for this link?')) return
    setLoading(true)
    try {
      const rsp = await fetch('/api/maps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkId }),
      })
      if (!rsp.ok) {
        const txt = await rsp.text()
        alert('Failed to generate map image: ' + txt)
        return
      }
      const updated = await rsp.json()
      onSuccess(updated)
    } catch (e: any) {
      alert('Error generating map image: ' + (e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading || disabled}>
      <i className="fas fa-sync-alt mr-1" />
      {loading ? 'Generating...' : 'Regenerate'}
    </Button>
  )
}

function ForceRegenerateButton({ linkId, disabled, onSuccess }: { linkId: string; disabled?: boolean; onSuccess: (updated: Link) => void }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading || disabled) return
    if (!confirm('Force regenerate and overwrite the stored static map image for this link? This will replace the existing image.')) return
    setLoading(true)
    try {
      const rsp = await fetch('/api/maps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkId, force: true }),
      })
      if (!rsp.ok) {
        const txt = await rsp.text()
        alert('Failed to force-generate map image: ' + txt)
        return
      }
      const updated = await rsp.json()
      onSuccess(updated)
    } catch (e: any) {
      alert('Error force-generating map image: ' + (e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} disabled={loading || disabled}>
      <i className="fas fa-redo-alt mr-1" />
      {loading ? 'Forcing...' : 'Force regenerate'}
    </Button>
  )
}

export function LinksList({ profileId, links, editingLink, onEdit, onDelete, onToggleActive, onFormSuccess, onFormCancel, isLoading }: LinksListProps) {
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

  // Category sort order: main -> location -> social
  const categoryOrder = ["main", "location", "social"]
  const sortedLinks = [...links].sort((a, b) => {
    const ca = categoryOrder.indexOf(a.category)
    const cb = categoryOrder.indexOf(b.category)
    if (ca !== cb) return ca - cb
    if ((a.order_index ?? 0) !== (b.order_index ?? 0)) return (a.order_index ?? 0) - (b.order_index ?? 0)
    return a.title.localeCompare(b.title)
  })

  return (
    <div className="space-y-3">
      {sortedLinks.map((link) => (
        <div key={link.id}>
          <div
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
              {/* Regenerate stored static map image for location links */}
              {link.category === 'location' && (
                <div className="flex items-center gap-2">
                  <RegenerateButton linkId={link.id} disabled={isLoading} onSuccess={(updated) => onFormSuccess(updated)} />
                  {link.background_image && (
                    <ForceRegenerateButton linkId={link.id} disabled={isLoading} onSuccess={(updated) => onFormSuccess(updated)} />
                  )}
                </div>
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

          {/* Inline edit form: render the form directly under the link being edited */}
          {editingLink && editingLink.id === link.id && (
            <div className="mt-3">
              <LinkForm profileId={profileId} link={editingLink} onSuccess={onFormSuccess} onCancel={onFormCancel} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
