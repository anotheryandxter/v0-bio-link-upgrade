"use client"

import type { Link } from "@/types"
import { useState } from "react"
function getVisitorId() {
  try {
    if (typeof document === "undefined") return null
    const name = "vuid="
    const cookies = document.cookie.split(";")
    for (let c of cookies) {
      c = c.trim()
      if (c.indexOf(name) === 0) return c.substring(name.length)
    }
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    // set cookie for 365 days
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `vuid=${id}; path=/; expires=${expires}; SameSite=Lax`
    return id
  } catch (e) {
    return null
  }
}

interface LinkButtonProps {
  link: Link
}

export function LinkButton({ link }: LinkButtonProps) {
  const [isClicked, setIsClicked] = useState(false)

  const trackClick = async (linkId: string) => {
    try {
      const userIdentifier = getVisitorId()
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkId,
          userIdentifier,
          userAgent: navigator.userAgent,
          referrer: document.referrer || null,
        }),
      })
    } catch (error) {
      console.error("Failed to track click:", error)
    }
  }

  const handleClick = async () => {
    setIsClicked(true)
    try {
      await trackClick(link.id)
      window.open(link.url, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("Failed to track click:", error)
      // Still open the link even if tracking fails
      window.open(link.url, "_blank", "noopener,noreferrer")
    } finally {
      setTimeout(() => setIsClicked(false), 200)
    }
  }

  const renderIcon = () => {
    if (!link.icon) return null

    // Check if it's a custom image (data URL or HTTP URL)
    if (link.icon.startsWith("data:") || link.icon.startsWith("http")) {
      return <img src={link.icon || "/placeholder.svg"} alt="" className="w-5 h-5 object-contain" />
    }

    // FontAwesome icon
    return <i className={`${link.icon} text-xl`} />
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full p-4 rounded-xl mb-3 transition-all duration-200
        hover:scale-[1.02] active:scale-[0.98]
        backdrop-blur-md border border-white/10
        flex items-center justify-center gap-3
        font-medium shadow-lg hover:shadow-xl
        ${isClicked ? "scale-[0.98]" : ""}
      `}
      style={{
        backgroundColor: `${link.background_color_light}${Math.round(link.opacity * 255)
          .toString(16)
          .padStart(2, "0")}`,
        color: link.text_color_light,
        backgroundImage: link.background_image ? `url(${link.background_image})` : undefined,
        backgroundSize: link.background_image ? "cover" : undefined,
        backgroundPosition: link.background_image ? "center" : undefined,
      }}
    >
      {renderIcon()}
      <span className="text-balance">{link.title}</span>
    </button>
  )
}
