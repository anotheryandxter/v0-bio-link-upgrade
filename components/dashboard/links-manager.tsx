"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LinkForm } from "./link-form"
import { LinksList } from "./links-list"
import type { Link } from "@/types"
import { useRouter } from "next/navigation"

interface LinksManagerProps {
  profileId: string
  initialLinks: Link[]
}

export function LinksManager({ profileId, initialLinks }: LinksManagerProps) {
  const [links, setLinks] = useState<Link[]>(initialLinks)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAddLink = () => {
    setEditingLink(null)
    setIsFormOpen(true)
  }

  const handleEditLink = (link: Link) => {
    setEditingLink(link)
    setIsFormOpen(true)
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("links").delete().eq("id", linkId)

      if (error) {
        alert("Error deleting link: " + error.message)
        return
      }

      setLinks(links.filter((link) => link.id !== linkId))
      router.refresh()
    } catch (error) {
      alert("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (linkId: string, isActive: boolean) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("links").update({ is_active: isActive }).eq("id", linkId)

      if (error) {
        alert("Error updating link: " + error.message)
        return
      }

      setLinks(links.map((link) => (link.id === linkId ? { ...link, is_active: isActive } : link)))
      router.refresh()
    } catch (error) {
      alert("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSuccess = (savedLink: Link) => {
    if (editingLink) {
      // Replace the edited link in-place to preserve order
      const idx = links.findIndex((l) => l.id === savedLink.id)
      if (idx >= 0) {
        const next = [...links]
        next[idx] = savedLink
        setLinks(next)
      } else {
        // fallback: replace by id
        setLinks(links.map((link) => (link.id === savedLink.id ? savedLink : link)))
      }
    } else {
      // Insert new links at the top so they appear under the Add button
      setLinks([savedLink, ...links])
    }

    // Close form and clear editing state. Do not immediately refresh the router
    // to avoid clobbering optimistic UI ordering. The app will pick up server
    // state on subsequent navigations or manual refresh.
    setIsFormOpen(false)
    setEditingLink(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Links ({links.length})</h3>
          <p className="text-sm text-muted-foreground">Manage your bio-link buttons</p>
        </div>
        <Button onClick={handleAddLink}>
          <i className="fas fa-plus mr-2" />
          Add Link
        </Button>
      </div>

      <LinksList
        links={links}
        onEdit={handleEditLink}
        onDelete={handleDeleteLink}
        onToggleActive={handleToggleActive}
        isLoading={isLoading}
      />

      {isFormOpen && (
        <LinkForm
          profileId={profileId}
          link={editingLink}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingLink(null)
          }}
        />
      )}
    </div>
  )
}
