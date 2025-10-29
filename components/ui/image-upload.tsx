"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, LinkIcon, X } from "lucide-react"
import Image from "next/image"

// Cast UI primitives to any to avoid JSX typing mismatches in this environment
const ButtonAny = Button as any
const InputAny = Input as any
const LabelAny = Label as any
const TabsAny = Tabs as any
const TabsContentAny = TabsContent as any
const TabsListAny = TabsList as any
const TabsTriggerAny = TabsTrigger as any
const UploadAny = Upload as any
const LinkIconAny = LinkIcon as any
const XAny = X as any
const ImageAny = Image as any

interface ImageUploadProps {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  accept?: string
  maxSize?: number // in MB
  className?: string
  bucketName?: string
}

export function ImageUpload({
  label,
  value,
  onChange,
  accept = "image/*",
  maxSize = 5,
  className = "",
  // optional Supabase storage bucket name to upload to (publicly readable)
  bucketName = 'public',
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
      // Compress the image using canvas to limit dimensions and quality for a quick preview
      const img = document.createElement('img')
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      img.src = dataUrl
      await img.decode()

      const MAX_WIDTH = 1200
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, MAX_WIDTH / img.width)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Use quality 0.8 for JPEG to balance size & quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // Show preview immediately
      onChange(compressedDataUrl)

      // Upload the original file to server endpoint which will create variants
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', bucketName)

      try {
        const r = await fetch('/api/uploads', { method: 'POST', body: form })
        if (!r.ok) {
          const txt = await r.text()
          console.warn('Upload failed:', r.status, txt)
          setIsUploading(false)
          return
        }
        const json = await r.json()
        // Prefer the small WebP variant for display if available
        if (json && json.uploaded && json.uploaded.length) {
          const smallest = (json.uploaded as any[]).reduce((a: any, b: any) => (a.width < b.width ? a : b))
          onChange(smallest.url)
        } else if (json && json.jpeg) {
          onChange(json.jpeg)
        }
      } catch (err) {
        console.warn('Server upload error, keeping preview:', err)
      }

      setIsUploading(false)
    } catch (err) {
      setError('Failed to upload image')
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
  <LabelAny>{label}</LabelAny>

      {value && (
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
            <ImageAny
              src={value || "/placeholder.svg"}
              alt={label}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
          <ButtonAny
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
          >
            <XAny className="h-3 w-3" />
          </ButtonAny>
        </div>
      )}

      <TabsAny defaultValue="upload" className="w-full">
        <TabsListAny className="grid w-full grid-cols-2">
          <TabsTriggerAny value="upload">Upload File</TabsTriggerAny>
          <TabsTriggerAny value="url">Image URL</TabsTriggerAny>
        </TabsListAny>

        <TabsContentAny value="upload" className="space-y-2">
          <div className="flex items-center gap-2">
            <InputAny
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              disabled={isUploading}
              className="flex-1"
            />
            <ButtonAny
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadAny className="h-4 w-4" />
            </ButtonAny>
          </div>
  </TabsContentAny>

        <TabsContentAny value="url" className="space-y-2">
          <div className="flex items-center gap-2">
            <InputAny
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <ButtonAny type="button" variant="outline" size="sm" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
              <LinkIconAny className="h-4 w-4" />
            </ButtonAny>
          </div>
        </TabsContentAny>
      </TabsAny>

      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">{error}</div>}

      {isUploading && <div className="text-sm text-muted-foreground">Uploading image...</div>}
    </div>
  )
}
