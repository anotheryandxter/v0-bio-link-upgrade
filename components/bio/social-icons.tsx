"use client"

import type { Link } from "@/types"
import { useState } from "react"

interface SocialIconsProps {
  links: Link[]
}

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
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `vuid=${id}; path=/; expires=${expires}; SameSite=Lax`
    return id
  } catch (e) {
    return null
  }
}

export default function SocialIcons({ links }: SocialIconsProps) {
  const [pressed, setPressed] = useState<string | null>(null)

  // sort by order_index ascending
  const sorted = [...links].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  const trackClick = async (linkId: string) => {
    try {
      const userIdentifier = getVisitorId()
      const payload = JSON.stringify({ linkId, userIdentifier, userAgent: navigator.userAgent, referrer: document.referrer || null })

      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/track', blob)
        return
      }

      fetch('/api/analytics/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
    } catch (e) {
      // swallow
    }
  }

  const handleClick = (link: Link) => {
    setPressed(link.id)
    void trackClick(link.id)
    try {
      window.open(link.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      // ignore
    } finally {
      setTimeout(() => setPressed(null), 200)
    }
  }

  const renderIcon = (link: Link) => {
    if (!link.icon) return null
    if (link.icon.startsWith('data:') || link.icon.startsWith('http')) {
      return <img src={link.icon} alt="" className="w-5 h-5 object-contain" />
    }
    return <i className={`${link.icon} text-lg`} />
  }

  return (
    <div className="flex items-center justify-center gap-3 overflow-x-auto py-2">
      {sorted.map((link) => (
        <button
          key={link.id}
          onClick={() => handleClick(link)}
          title={link.title}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform duration-150 ${pressed === link.id ? 'scale-95' : 'hover:scale-105'}`}
          style={{
            backgroundColor: `${link.background_color_light}${Math.round((link.opacity ?? 0.9) * 255).toString(16).padStart(2, '0')}`,
            color: link.text_color_light,
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          {renderIcon(link)}
        </button>
      ))}
    </div>
  )
}
