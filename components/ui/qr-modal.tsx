"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export default function QRModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    // Lazy import to avoid adding a hard runtime dependency to server bundles
    void import('qrcode').then((mod) => {
      if (!mounted) return
      mod.toDataURL(url, { margin: 1, width: 300 })
        .then((d: string) => {
          if (mounted) setDataUrl(d)
        })
        .catch((e: any) => console.error('QR generation failed', e))
        .finally(() => { if (mounted) setLoading(false) })
    }).catch((e) => { console.error('Failed to import qrcode', e); if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [url])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      alert('Embed URL copied to clipboard')
    } catch (e) {
      alert('Copy failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 z-10 w-[min(92%,480px)]">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-medium">Embed URL QR Code</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="mt-4 text-center">
          {loading && <div className="text-sm text-muted-foreground">Generating QR…</div>}
          {!loading && dataUrl && (
            <img src={dataUrl} alt="QR code" className="mx-auto" />
          )}
          <p className="mt-3 text-sm break-all">{url}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button onClick={handleCopy}><i className="fas fa-copy mr-2"/>Copy URL</Button>
            <a href={dataUrl || '#'} download={`qr-${encodeURIComponent(url)}.png`}>
              <Button variant="outline"><i className="fas fa-download mr-2"/>Download QR</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
