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
              backgroundColor: config.overlay.color,
              opacity: config.overlay.opacity,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
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
