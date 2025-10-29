"use client"

import { useState, useEffect } from "react"
import { Input } from "./input"

interface ColorInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

function normalizeHex(v: string | undefined) {
  if (!v) return "#000000"
  const s = v.trim()
  if (s.startsWith("#")) {
    if (s.length === 4) {
      // expand shorthand #rgb -> #rrggbb
      return (
        "#" +
        s[1] + s[1] +
        s[2] + s[2] +
        s[3] + s[3]
      ).toUpperCase()
    }
    return s.slice(0, 7).toUpperCase()
  }
  if (/^[0-9A-Fa-f]{3}$/.test(s)) return ("#" + s[0] + s[0] + s[1] + s[1] + s[2] + s[2]).toUpperCase()
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return ("#" + s).toUpperCase()
  return "#000000"
}

export default function ColorInput({ id, value, onChange, className }: ColorInputProps) {
  const [mode, setMode] = useState<"picker" | "hex">("picker")
  const [hex, setHex] = useState(() => normalizeHex(value))

  useEffect(() => {
    setHex(normalizeHex(value))
  }, [value])

  const handlePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = normalizeHex(e.target.value)
    setHex(v)
    onChange(v)
  }

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9a-fA-F#]/g, "")
    if (!v.startsWith("#")) v = "#" + v
    // limit length to 7 (# + 6 hex)
    if (v.length > 7) v = v.slice(0, 7)
    setHex(v.toUpperCase())
    // only apply change when valid 6-hex-digit value
    if (/^#[0-9A-F]{6}$/.test(v.toUpperCase())) onChange(v.toUpperCase())
  }

  const handleHexBlur = () => {
    const v = hex.toUpperCase()
    // expand 3-digit shorthand on blur: #ABC -> #AABBCC
    if (/^#[0-9A-F]{3}$/.test(v)) {
      const expanded = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
      setHex(expanded)
      onChange(expanded)
      return
    }

    // if already valid 6-digit hex, ensure normalized uppercase form
    if (/^#[0-9A-F]{6}$/.test(v)) {
      if (v !== hex) setHex(v)
      onChange(v)
      return
    }

    // otherwise keep what user typed (uppercased) but don't apply change
    setHex(v)
  }

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <input id={id} type="color" value={hex} onChange={handlePicker} className="w-10 h-10 p-0 border-0 rounded-md" />

      {mode === "picker" ? (
        <div className="flex items-center gap-2">
          <input
            readOnly
            className="w-24 bg-transparent border border-border rounded px-2 py-1 text-sm text-muted-foreground"
            value={hex}
            aria-label="hex color value"
          />
          <button
            type="button"
            onClick={() => setMode("hex")}
            className="text-xs px-2 py-1 border rounded bg-muted/10 hover:bg-muted/20"
          >
            HEX
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={hex}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            className="w-28"
            aria-label="hex color input"
          />
          <button
            type="button"
            onClick={() => setMode("picker")}
            className="text-xs px-2 py-1 border rounded bg-muted/10 hover:bg-muted/20"
          >
            PICKER
          </button>
        </div>
      )}
    </div>
  )
}
