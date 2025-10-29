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
  const categoryOrder = ["main", "location", "social"]
  const sortLinks = (items: Link[]) =>
    [...items].sort((a, b) => {
      const ca = categoryOrder.indexOf(a.category)
      const cb = categoryOrder.indexOf(b.category)
      if (ca !== cb) return ca - cb
      if ((a.order_index ?? 0) !== (b.order_index ?? 0)) return (a.order_index ?? 0) - (b.order_index ?? 0)
      return a.title.localeCompare(b.title)
    })

  const [links, setLinks] = useState<Link[]>(() => sortLinks(initialLinks || []))
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
      // Replace the edited link and then canonicalize order
      const next = links.map((link) => (link.id === savedLink.id ? savedLink : link))
      setLinks(sortLinks(next))
    } else {
      // Insert new link and canonicalize order so it appears in its category/order slot
      setLinks(sortLinks([...(links || []), savedLink]))
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

      {/* If adding a new link, render the form at the top so it appears directly under the Add button */}
      {isFormOpen && !editingLink && (
        <LinkForm
          profileId={profileId}
          link={null}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingLink(null)
          }}
        />
      )}

      <LinksList
        profileId={profileId}
        links={links}
        editingLink={editingLink}
        onEdit={(link) => {
          // open the inline editor under the clicked link
          handleEditLink(link)
        }}
        onDelete={handleDeleteLink}
        onToggleActive={handleToggleActive}
        onFormSuccess={(savedLink: Link) => {
          handleFormSuccess(savedLink)
          // close the inline editor
          setIsFormOpen(false)
          setEditingLink(null)
        }}
        onFormCancel={() => {
          setIsFormOpen(false)
          setEditingLink(null)
        }}
        isLoading={isLoading}
      />
    </div>
  )
}
