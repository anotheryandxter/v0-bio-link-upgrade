"use client"

import type React from "react"

import { useRef } from "react"
import type { BackgroundConfig } from "@/types"

interface BackgroundRendererProps {
  config: BackgroundConfig
  className?: string
  children?: React.ReactNode
}

export function BackgroundRenderer({ config, className = "", children }: BackgroundRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const renderBackground = () => {
    switch (config.type) {
      case "gradient":
        return <GradientBackground config={config.gradient!} />
      case "solid":
        return <SolidBackground color={config.solidColor!} />
      case "image":
        return <ImageBackground config={config.image!} />
      case "video":
        return <VideoBackground config={config.video!} videoRef={videoRef} />
      default:
        return <SolidBackground color="#f5f5f5" />
    }
  }

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Background Layer */}
      <div className="fixed inset-0 -z-10">
        {renderBackground()}

        {/* Overlay for readability */}
        {config.overlay?.enabled && (
          <div
            className="absolute inset-0"
            style={{
              // Prefer applying opacity to the background color (rgba) rather than the element opacity
              backgroundColor: overlayColorFor(config.overlay.color || '#000000', config.overlay.opacity ?? 0.35),
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function overlayColorFor(color: string, opacity: number) {
  // Simple converters for hex (#rgb, #rrggbb) and rgb(...) strings.
  try {
    color = (color || '').trim()
    if (!color) return `rgba(0,0,0,${opacity})`
    if (color.startsWith('#')) {
      let hex = color.slice(1)
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
      if (hex.length !== 6) return `rgba(0,0,0,${opacity})`
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return `rgba(${r},${g},${b},${opacity})`
    }
    if (color.startsWith('rgb(')) {
      // rgb(r,g,b)
      const nums = color.replace(/[rgb()]/g, '').split(',').map((s) => s.trim())
      return `rgba(${nums[0]},${nums[1]},${nums[2]},${opacity})`
    }
    if (color.startsWith('rgba(')) {
      // rgba(r,g,b,a) -> replace alpha
      const inside = color.replace(/rgba\(|\)/g, '')
      const parts = inside.split(',').map((s) => s.trim())
      parts[3] = String(opacity)
      return `rgba(${parts.join(',')})`
    }
    // Fallback: return the color and let opacity be separate (less ideal)
    return color
  } catch (e) {
    return `rgba(0,0,0,${opacity})`
  }
}

// Gradient Background Component
interface GradientBackgroundProps {
  config: BackgroundConfig["gradient"]
}

function GradientBackground({ config }: GradientBackgroundProps) {
  if (!config) return null

  const gradientStops = config.stops.map((stop) => `${stop.color} ${stop.position || 0}%`).join(", ")

  const gradientDirection =
    {
      "to-r": "to right",
      "to-l": "to left",
      "to-t": "to top",
      "to-b": "to bottom",
      "to-tr": "to top right",
      "to-tl": "to top left",
      "to-br": "to bottom right",
      "to-bl": "to bottom left",
    }[config.direction] || "to bottom"

  return (
    <div
      className="w-full h-full"
      style={{
        background: `linear-gradient(${gradientDirection}, ${gradientStops})`,
      }}
    />
  )
}

// Solid Color Background
function SolidBackground({ color }: { color: string }) {
  return <div className="w-full h-full" style={{ backgroundColor: color }} />
}

// Image Background Component
interface ImageBackgroundProps {
  config: BackgroundConfig["image"]
}

function ImageBackground({ config }: ImageBackgroundProps) {
  if (!config) return null

  const backgroundSize = {
    cover: "cover",
    contain: "contain",
    fill: "100% 100%",
    stretch: "100% 100%",
    none: "auto",
  }[config.fit]

  const backgroundPosition = {
    center: "center",
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
    "top-left": "top left",
    "top-right": "top right",
    "bottom-left": "bottom left",
    "bottom-right": "bottom right",
  }[config.position]

  return (
    <div
      className="w-full h-full"
      style={{
        backgroundImage: `url(${config.url})`,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat: "no-repeat",
        opacity: config.opacity || 1,
        filter: config.blur ? `blur(${config.blur}px)` : undefined,
      }}
    />
  )
}

// Video Background Component
interface VideoBackgroundProps {
  config: BackgroundConfig["video"]
  videoRef: React.RefObject<HTMLVideoElement>
}

function VideoBackground({ config, videoRef }: VideoBackgroundProps) {
  if (!config) return null

  const objectFit = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
    stretch: "object-fill",
  }[config.fit]

  const objectPosition = {
    center: "object-center",
    top: "object-top",
    bottom: "object-bottom",
    left: "object-left",
    right: "object-right",
  }[config.position]

  return (
    <div className="w-full h-full overflow-hidden">
      <video
        ref={videoRef}
        autoPlay={config.autoplay}
        loop={config.loop}
        muted={config.muted}
        playsInline
        poster={config.poster || undefined}
        className={`w-full h-full ${objectFit} ${objectPosition}`}
        style={{
          opacity: config.opacity || 1,
          filter: config.blur ? `blur(${config.blur}px)` : undefined,
        }}
      >
        {config.mp4 && <source src={config.mp4} type="video/mp4" />}
        {config.webm && <source src={config.webm} type="video/webm" />}
        {config.ogv && <source src={config.ogv} type="video/ogg" />}
        Your browser does not support video backgrounds.
      </video>
    </div>
  )
}
