"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ColorInput from "@/components/ui/color-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUpload } from "@/components/ui/image-upload"
import IconPicker from "@/components/dashboard/icon-picker"
import type { Link } from "@/types"

interface LinkFormProps {
  profileId: string
  link?: Link | null
  onSuccess: (link: Link) => void
  onCancel: () => void
}

export function LinkForm({ profileId, link, onSuccess, onCancel }: LinkFormProps) {
  const [formData, setFormData] = useState({
    title: link?.title || "",
    url: link?.url || "",
    icon: link?.icon || "fas fa-link",
    background_color_light: link?.background_color_light || "#ffffff",
    background_color_dark: link?.background_color_dark || "#1f2937",
    background_image: link?.background_image || null,
    text_color_light: link?.text_color_light || "#000000",
    text_color_dark: link?.text_color_dark || "#ffffff",
    opacity: link?.opacity || 0.8,
    category: link?.category || "main",
    order_index: link?.order_index || 0,
  })
  // location-specific inputs (not separate DB columns — we encode into URL)
  const [locationMode, setLocationMode] = useState<"place_id" | "coords">(() => {
    if (link?.category === "location") {
      if (link.url?.includes("destination_place_id=")) return "place_id"
      if (link.url?.includes("destination=")) return "coords"
    }
    return "place_id"
  })
  const [placeId, setPlaceId] = useState<string>(() => {
    if (link?.category === "location") {
      const m = link.url?.match(/destination_place_id=([^&]+)/)
      return m ? decodeURIComponent(m[1]) : ""
    }
    return ""
  })
  const [lat, setLat] = useState<string>(() => {
    if (link?.category === "location") {
      const m = link.url?.match(/destination=([-0-9.]+),([-0-9.]+)/)
      return m ? m[1] : ""
    }
    return ""
  })
  const [lng, setLng] = useState<string>(() => {
    if (link?.category === "location") {
      const m = link.url?.match(/destination=([-0-9.]+),([-0-9.]+)/)
      return m ? m[2] : ""
    }
    return ""
  })
  const [iconType, setIconType] = useState<"fontawesome" | "custom">(
    link?.icon?.startsWith("data:") || link?.icon?.startsWith("http") ? "custom" : "fontawesome",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // If this is a location link, synthesize a Google Maps directions URL
      if (formData.category === "location") {
        if (locationMode === "place_id" && placeId) {
          // Use destination_place_id so Google resolves the place
          formData.url = `https://www.google.com/maps/dir/?api=1&destination_place_id=${encodeURIComponent(
            placeId,
          )}&travelmode=driving`
        } else if (locationMode === "coords" && lat && lng) {
          formData.url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
            `${lat},${lng}`,
          )}&travelmode=driving`
        }
      }

      if (link) {
        // Update existing link
        const { data, error } = await supabase
          .from("links")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", link.id)
          .select()
          .single()

        if (error) {
          setError("Error updating link: " + error.message)
          return
        }

        onSuccess(data)
      } else {
        // Create new link
        const { data, error } = await supabase
          .from("links")
          .insert({
            ...formData,
            profile_id: profileId,
            is_active: true,
          })
          .select()
          .single()

        if (error) {
          setError("Error creating link: " + error.message)
          return
        }

        onSuccess(data)
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{link ? "Edit Link" : "Add New Link"}</CardTitle>
        <CardDescription>Configure your bio-link button appearance and behavior</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Icon</Label>
            <Tabs value={iconType} onValueChange={(value) => setIconType(value as "fontawesome" | "custom")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fontawesome">FontAwesome</TabsTrigger>
                <TabsTrigger value="custom">Custom Icon</TabsTrigger>
              </TabsList>

              <TabsContent value="fontawesome" className="space-y-2">
                <IconPicker
                  value={iconType === "fontawesome" ? formData.icon : "fas fa-link"}
                  onChange={(value) => setFormData({ ...formData, icon: value })}
                />
                <p className="text-sm text-muted-foreground">
                  Pick a FontAwesome icon from the list above. You can still enter a custom class if needed.
                </p>
              </TabsContent>

              <TabsContent value="custom">
                <ImageUpload
                  label=""
                  value={iconType === "custom" ? formData.icon : null}
                  onChange={(value) => setFormData({ ...formData, icon: value || "fas fa-link" })}
                  accept="image/*"
                  maxSize={2}
                />
              </TabsContent>
            </Tabs>
          </div>

          <ImageUpload
            label="Background Image (Optional)"
            value={formData.background_image}
            onChange={(value) => setFormData({ ...formData, background_image: value })}
            accept="image/*"
            maxSize={5}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="order_index">Order</Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: Number.parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Location inputs: only shown when Category is 'location' */}
          {formData.category === "location" && (
            <div className="space-y-3">
              <Label>Location Input</Label>
              <div className="flex gap-2">
                <Select value={locationMode} onValueChange={(v) => setLocationMode(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="place_id">Place ID (preferred)</SelectItem>
                    <SelectItem value="coords">Coordinates (lat,lng)</SelectItem>
                  </SelectContent>
                </Select>

                {locationMode === "place_id" ? (
                  <Input
                    placeholder="Place ID (e.g. ChIJN1t_tDeuEmsRUsoyG83frY4)"
                    value={placeId}
                    onChange={(e) => setPlaceId(e.target.value)}
                    className="flex-1"
                  />
                ) : (
                  <div className="flex gap-2 w-full">
                    <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
                    <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                When saved, the form will generate a Google Maps directions link automatically. Clicking the card will open directions.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="background_color_light">Background (Light)</Label>
              <ColorInput
                id="background_color_light"
                value={formData.background_color_light}
                onChange={(v) => setFormData({ ...formData, background_color_light: v })}
              />
            </div>

            <div>
              <Label htmlFor="background_color_dark">Background (Dark)</Label>
              <ColorInput
                id="background_color_dark"
                value={formData.background_color_dark}
                onChange={(v) => setFormData({ ...formData, background_color_dark: v })}
              />
            </div>

            <div>
              <Label htmlFor="text_color_light">Text (Light)</Label>
              <ColorInput
                id="text_color_light"
                value={formData.text_color_light}
                onChange={(v) => setFormData({ ...formData, text_color_light: v })}
              />
            </div>

            <div>
              <Label htmlFor="text_color_dark">Text (Dark)</Label>
              <ColorInput
                id="text_color_dark"
                value={formData.text_color_dark}
                onChange={(v) => setFormData({ ...formData, text_color_dark: v })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="opacity">Opacity</Label>
            <Input
              id="opacity"
              type="number"
              min="0.1"
              max="1"
              step="0.1"
              value={formData.opacity}
              onChange={(e) => setFormData({ ...formData, opacity: Number.parseFloat(e.target.value) })}
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : link ? "Update Link" : "Create Link"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
