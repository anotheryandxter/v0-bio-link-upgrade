"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/ui/image-upload"
import { BackgroundCustomizer } from "@/components/dashboard/background-customizer"
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
    footer_text: profile.footer_text || `© ${new Date().getFullYear()} ${profile.business_name}`,
    homepage_background: profile.homepage_background || {
      type: "video" as const,
      video: {
        webm: "web.webm",
        mp4: "web.mp4",
        ogv: "web.ogv",
        poster: "img/videoframe.jpg",
        fit: "cover" as const,
        position: "center" as const,
        opacity: 1,
        blur: 0,
        muted: true,
        loop: true,
        autoplay: true,
      },
      overlay: {
        enabled: true,
        color: "#000000",
        opacity: 0.3,
      },
    },
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

      <div>
        <Label htmlFor="footer_text">Footer Text</Label>
        <Input
          id="footer_text"
          value={formData.footer_text}
          onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
          placeholder={`© ${new Date().getFullYear()} ${formData.business_name}`}
        />
        <p className="text-sm text-muted-foreground mt-1">Leave empty to use default copyright text</p>
      </div>

      <BackgroundCustomizer
        value={formData.homepage_background}
        onChange={(homepage_background) => setFormData({ ...formData, homepage_background })}
      />

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
