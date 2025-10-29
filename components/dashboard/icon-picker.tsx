"use client"

import React, { useMemo, useState } from "react"

interface IconItem {
  id: string
  label: string
  className: string
}

interface IconPickerProps {
  value?: string
  onChange?: (value: string) => void
}

// small curated list of commonly-used FontAwesome classes. You can expand this
// list later or load a JSON of icons if you want the full catalog.
const ICONS: IconItem[] = [
  { id: "link", label: "Link", className: "fas fa-link" },
  { id: "globe", label: "Globe", className: "fa-solid fa-globe" },
  { id: "map", label: "Map", className: "fa-solid fa-map" },
  { id: "whatsapp", label: "WhatsApp", className: "fa-brands fa-whatsapp" },
  { id: "tiktok", label: "TikTok", className: "fa-brands fa-tiktok" },
  { id: "facebook", label: "Facebook", className: "fa-brands fa-facebook-f" },
  { id: "instagram", label: "Instagram", className: "fa-brands fa-instagram" },
  { id: "twitter", label: "Twitter", className: "fa-brands fa-twitter" },
  { id: "info", label: "Info", className: "fa-solid fa-info-circle" },
  { id: "star", label: "Star", className: "fa-solid fa-star" },
  { id: "heart", label: "Heart", className: "fa-solid fa-heart" },
]

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [query, setQuery] = useState("")
  const selected = value || ""

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ICONS
    return ICONS.filter((i) => i.label.toLowerCase().includes(q) || i.className.toLowerCase().includes(q) || i.id.includes(q))
  }, [query])

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <input
          aria-label="Search icons"
          className="w-full p-2 rounded border"
          placeholder="Search icons (e.g. 'twitter', 'map')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Preview</div>
          <div className="w-10 h-10 flex items-center justify-center rounded border bg-white/10">
            {selected ? <i className={`${selected} text-xl`} aria-hidden /> : <span className="text-xs text-muted-foreground">—</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
        {filtered.map((icon) => {
          const isActive = selected === icon.className
          return (
            <button
              key={icon.id}
              type="button"
              onClick={() => onChange?.(icon.className)}
              className={`flex flex-col items-center gap-1 p-2 rounded border transition ${isActive ? "ring-2 ring-offset-1 ring-indigo-400" : "hover:bg-white/5"}`}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <i className={`${icon.className} text-lg`} aria-hidden />
              </div>
              <div className="text-[10px] text-center truncate w-16">{icon.label}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
