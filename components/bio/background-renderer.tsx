"use client"

import type React from "react"

import { useRef } from "react"
import type { BackgroundConfig } from "@/types"

interface BackgroundRendererProps {
  config: BackgroundConfig
  className?: string
  children?: React.ReactNode
  parallaxStrength?: number
}

export function BackgroundRenderer({ config, className = "", children, parallaxStrength = 1 }: BackgroundRendererProps) {
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
  strength?: number
}

// Enhanced ImageBackground with smooth parallax behavior
function ImageBackground({ config }: ImageBackgroundProps) {
  if (!config) return null

  // Static background image: size is driven by CSS object-fit/object-position
  // No scroll-based transforms or rAF loops. The image will responsively
  // size itself according to the selected `fit` (cover/contain) and `position`.

  const objectFitClass = ( {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    stretch: 'object-fill',
  } as Record<string, string> )[config.fit || 'cover']

  const objectPositionClass = ( {
    center: 'object-center',
    top: 'object-top',
    bottom: 'object-bottom',
    left: 'object-left',
    right: 'object-right',
  } as Record<string, string> )[config.position || 'center']

  return (
    <div className="w-full h-full overflow-hidden relative">
      <img
        src={config.url}
        alt="background"
        className={`w-full h-full ${objectFitClass} ${objectPositionClass}`}
        style={{
          opacity: config.opacity ?? 1,
          filter: config.blur ? `blur(${config.blur}px)` : undefined,
        }}
      />
    </div>
  )
}

// Video Background Component
interface VideoBackgroundProps {
  config: BackgroundConfig["video"]
  videoRef: React.RefObject<HTMLVideoElement>
  strength?: number
}

function VideoBackground({ config, videoRef }: VideoBackgroundProps) {
  if (!config) return null

  // Static video background: no scroll-based transforms. The video will
  // responsively size itself using CSS object-fit/object-position.

  const objectFitClass = ( {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    stretch: 'object-fill',
  } as Record<string, string> )[config.fit || 'cover']

  const objectPositionClass = ( {
    center: 'object-center',
    top: 'object-top',
    bottom: 'object-bottom',
    left: 'object-left',
    right: 'object-right',
  } as Record<string, string> )[config.position || 'center']

  return (
    <div className="w-full h-full overflow-hidden relative">
      <video
        ref={videoRef}
        autoPlay={config.autoplay}
        loop={config.loop}
        muted={config.muted}
        playsInline
        poster={config.poster || undefined}
        className={`w-full h-full ${objectFitClass} ${objectPositionClass}`}
        style={{
          opacity: config.opacity ?? 1,
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
