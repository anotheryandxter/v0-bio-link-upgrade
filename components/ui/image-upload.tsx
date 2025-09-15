"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, LinkIcon, X } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  accept?: string
  maxSize?: number // in MB
  className?: string
}

export function ImageUpload({
  label,
  value,
  onChange,
  accept = "image/*",
  maxSize = 5,
  className = "",
}: ImageUploadProps) {
  const [urlInput, setUrlInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    setIsUploading(true)
    setError("")

    try {
      // Create a data URL for preview (in a real app, you'd upload to storage)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onChange(result)
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError("Failed to upload image")
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim())
      setUrlInput("")
    }
  }

  const handleRemove = () => {
    onChange(null)
    setUrlInput("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>{label}</Label>

      {value && (
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
            <Image
              src={value || "/placeholder.svg"}
              alt={label}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="url">Image URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">{error}</div>}

      {isUploading && <div className="text-sm text-muted-foreground">Uploading image...</div>}
    </div>
  )
}
