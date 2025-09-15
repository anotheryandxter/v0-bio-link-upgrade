"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/ui/image-upload"
import type { BackgroundConfig } from "@/types"

interface BackgroundCustomizerProps {
  value: BackgroundConfig
  onChange: (config: BackgroundConfig) => void
}

export function BackgroundCustomizer({ value, onChange }: BackgroundCustomizerProps) {
  const [activeTab, setActiveTab] = useState(value.type)

  const updateConfig = (updates: Partial<BackgroundConfig>) => {
    onChange({ ...value, ...updates })
  }

  const updateGradient = (updates: Partial<NonNullable<BackgroundConfig["gradient"]>>) => {
    updateConfig({
      gradient: { ...value.gradient, ...updates } as NonNullable<BackgroundConfig["gradient"]>,
    })
  }

  const updateImage = (updates: Partial<NonNullable<BackgroundConfig["image"]>>) => {
    updateConfig({
      image: { ...value.image, ...updates } as NonNullable<BackgroundConfig["image"]>,
    })
  }

  const updateVideo = (updates: Partial<NonNullable<BackgroundConfig["video"]>>) => {
    updateConfig({
      video: { ...value.video, ...updates } as NonNullable<BackgroundConfig["video"]>,
    })
  }

  const updateOverlay = (updates: Partial<NonNullable<BackgroundConfig["overlay"]>>) => {
    updateConfig({
      overlay: { ...value.overlay, ...updates } as NonNullable<BackgroundConfig["overlay"]>,
    })
  }

  const handleTabChange = (newType: string) => {
    setActiveTab(newType as BackgroundConfig["type"])

    // Initialize default values for each type
    const defaults: Record<BackgroundConfig["type"], Partial<BackgroundConfig>> = {
      solid: {
        type: "solid",
        solidColor: "#f5f5f5",
      },
      gradient: {
        type: "gradient",
        gradient: {
          direction: "to-b",
          stops: [
            { color: "#3b82f6", position: 0 },
            { color: "#1d4ed8", position: 100 },
          ],
        },
      },
      image: {
        type: "image",
        image: {
          url: "",
          fit: "cover",
          position: "center",
          opacity: 1,
          blur: 0,
        },
      },
      video: {
        type: "video",
        video: {
          mp4: "web.mp4",
          webm: "web.webm",
          ogv: "web.ogv",
          poster: "img/videoframe.jpg",
          fit: "cover",
          position: "center",
          opacity: 1,
          blur: 0,
          muted: true,
          loop: true,
          autoplay: true,
        },
      },
    }

    updateConfig(defaults[newType as BackgroundConfig["type"]])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background Customization</CardTitle>
        <CardDescription>Customize your homepage background appearance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="solid">Solid Color</TabsTrigger>
            <TabsTrigger value="gradient">Gradient</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
          </TabsList>

          <TabsContent value="solid" className="space-y-4">
            <div>
              <Label htmlFor="solid-color">Background Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="solid-color"
                  type="color"
                  value={value.solidColor || "#f5f5f5"}
                  onChange={(e) => updateConfig({ solidColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={value.solidColor || "#f5f5f5"}
                  onChange={(e) => updateConfig({ solidColor: e.target.value })}
                  placeholder="#f5f5f5"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gradient" className="space-y-4">
            <div>
              <Label>Gradient Direction</Label>
              <Select
                value={value.gradient?.direction || "to-b"}
                onValueChange={(direction) => updateGradient({ direction: direction as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to-b">Top to Bottom</SelectItem>
                  <SelectItem value="to-t">Bottom to Top</SelectItem>
                  <SelectItem value="to-r">Left to Right</SelectItem>
                  <SelectItem value="to-l">Right to Left</SelectItem>
                  <SelectItem value="to-br">Top Left to Bottom Right</SelectItem>
                  <SelectItem value="to-bl">Top Right to Bottom Left</SelectItem>
                  <SelectItem value="to-tr">Bottom Left to Top Right</SelectItem>
                  <SelectItem value="to-tl">Bottom Right to Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Gradient Colors</Label>
              {value.gradient?.stops?.map((stop, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={stop.color}
                    onChange={(e) => {
                      const newStops = [...(value.gradient?.stops || [])]
                      newStops[index] = { ...stop, color: e.target.value }
                      updateGradient({ stops: newStops })
                    }}
                    className="w-16 h-10"
                  />
                  <Input
                    value={stop.color}
                    onChange={(e) => {
                      const newStops = [...(value.gradient?.stops || [])]
                      newStops[index] = { ...stop, color: e.target.value }
                      updateGradient({ stops: newStops })
                    }}
                    placeholder="#000000"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={stop.position || 0}
                    onChange={(e) => {
                      const newStops = [...(value.gradient?.stops || [])]
                      newStops[index] = { ...stop, position: Number.parseInt(e.target.value) }
                      updateGradient({ stops: newStops })
                    }}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {(value.gradient?.stops?.length || 0) > 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newStops = value.gradient?.stops?.filter((_, i) => i !== index) || []
                        updateGradient({ stops: newStops })
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}

              {(value.gradient?.stops?.length || 0) < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newStops = [...(value.gradient?.stops || []), { color: "#000000", position: 50 }]
                    updateGradient({ stops: newStops })
                  }}
                >
                  Add Color Stop
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <ImageUpload
              label="Background Image"
              value={value.image?.url || ""}
              onChange={(url) => updateImage({ url })}
              accept="image/*"
              maxSize={10}
            />

            <div>
              <Label>Image Fit</Label>
              <Select value={value.image?.fit || "cover"} onValueChange={(fit) => updateImage({ fit: fit as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Image Position</Label>
              <Select
                value={value.image?.position || "center"}
                onValueChange={(position) => updateImage({ position: position as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Opacity: {Math.round((value.image?.opacity || 1) * 100)}%</Label>
              <Slider
                value={[(value.image?.opacity || 1) * 100]}
                onValueChange={([opacity]) => updateImage({ opacity: opacity / 100 })}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Blur: {value.image?.blur || 0}px</Label>
              <Slider
                value={[value.image?.blur || 0]}
                onValueChange={([blur]) => updateImage({ blur })}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <div>
              <Label htmlFor="video-mp4">MP4 Video URL</Label>
              <Input
                id="video-mp4"
                value={value.video?.mp4 || ""}
                onChange={(e) => updateVideo({ mp4: e.target.value })}
                placeholder="https://example.com/video.mp4"
              />
            </div>

            <div>
              <Label htmlFor="video-webm">WebM Video URL (Optional)</Label>
              <Input
                id="video-webm"
                value={value.video?.webm || ""}
                onChange={(e) => updateVideo({ webm: e.target.value })}
                placeholder="https://example.com/video.webm"
              />
            </div>

            <div>
              <Label htmlFor="video-poster">Poster Image URL</Label>
              <Input
                id="video-poster"
                value={value.video?.poster || ""}
                onChange={(e) => updateVideo({ poster: e.target.value })}
                placeholder="https://example.com/poster.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Video Fit</Label>
                <Select value={value.video?.fit || "cover"} onValueChange={(fit) => updateVideo({ fit: fit as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="fill">Fill</SelectItem>
                    <SelectItem value="stretch">Stretch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Video Position</Label>
                <Select
                  value={value.video?.position || "center"}
                  onValueChange={(position) => updateVideo({ position: position as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="video-autoplay"
                  checked={value.video?.autoplay || false}
                  onCheckedChange={(autoplay) => updateVideo({ autoplay })}
                />
                <Label htmlFor="video-autoplay">Autoplay</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="video-loop"
                  checked={value.video?.loop || false}
                  onCheckedChange={(loop) => updateVideo({ loop })}
                />
                <Label htmlFor="video-loop">Loop</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="video-muted"
                  checked={value.video?.muted || false}
                  onCheckedChange={(muted) => updateVideo({ muted })}
                />
                <Label htmlFor="video-muted">Muted</Label>
              </div>
            </div>

            <div>
              <Label>Opacity: {Math.round((value.video?.opacity || 1) * 100)}%</Label>
              <Slider
                value={[(value.video?.opacity || 1) * 100]}
                onValueChange={([opacity]) => updateVideo({ opacity: opacity / 100 })}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Blur: {value.video?.blur || 0}px</Label>
              <Slider
                value={[value.video?.blur || 0]}
                onValueChange={([blur]) => updateVideo({ blur })}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Overlay Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overlay Settings</CardTitle>
            <CardDescription>Add an overlay to improve text readability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="overlay-enabled"
                checked={value.overlay?.enabled || false}
                onCheckedChange={(enabled) => updateOverlay({ enabled })}
              />
              <Label htmlFor="overlay-enabled">Enable Overlay</Label>
            </div>

            {value.overlay?.enabled && (
              <>
                <div>
                  <Label htmlFor="overlay-color">Overlay Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="overlay-color"
                      type="color"
                      value={value.overlay?.color || "#000000"}
                      onChange={(e) => updateOverlay({ color: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={value.overlay?.color || "#000000"}
                      onChange={(e) => updateOverlay({ color: e.target.value })}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div>
                  <Label>Overlay Opacity: {Math.round((value.overlay?.opacity || 0.3) * 100)}%</Label>
                  <Slider
                    value={[(value.overlay?.opacity || 0.3) * 100]}
                    onValueChange={([opacity]) => updateOverlay({ opacity: opacity / 100 })}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
