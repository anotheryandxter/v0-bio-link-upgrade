"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/ui/image-upload"
import { useRouter } from "next/navigation"
import type { Profile } from "@/types"

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    business_name: profile.business_name,
    location: profile.location,
    page_title: profile.page_title,
    avatar: profile.avatar,
    favicon: profile.favicon,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...formData,
          is_setup: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) {
        setMessage("Error updating profile: " + error.message)
        return
      }

      setMessage("Profile updated successfully!")
      router.refresh()
    } catch (error) {
      setMessage("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ImageUpload
        label="Profile Picture"
        value={formData.avatar}
        onChange={(value) => setFormData({ ...formData, avatar: value })}
        accept="image/*"
        maxSize={5}
      />

      <ImageUpload
        label="Favicon (Site Icon)"
        value={formData.favicon}
        onChange={(value) => setFormData({ ...formData, favicon: value })}
        accept="image/*"
        maxSize={2}
      />

      <div>
        <Label htmlFor="business_name">Business Name</Label>
        <Input
          id="business_name"
          value={formData.business_name}
          onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="page_title">Page Title</Label>
        <Input
          id="page_title"
          value={formData.page_title}
          onChange={(e) => setFormData({ ...formData, page_title: e.target.value })}
          required
        />
      </div>

      {message && (
        <div
          className={`text-sm p-3 rounded-md ${
            message.includes("Error")
              ? "text-red-600 bg-red-50 dark:bg-red-900/20"
              : "text-green-600 bg-green-50 dark:bg-green-900/20"
          }`}
        >
          {message}
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Updating..." : "Update Profile"}
      </Button>
    </form>
  )
}
