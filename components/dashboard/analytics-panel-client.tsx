"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { formatDateTime, formatMonthShort } from '@/lib/timezone'
// Dynamically import chart component to reduce initial bundle size
const MonthlyStatsClient = dynamic(() => import('./monthly-stats-client'), { ssr: false, loading: () => <div>Loading chart…</div> })
// Lazy-load UA parser (only needed when viewing detailed logs)
let UAParser: any = null
const loadUAParser = async () => {
  if (!UAParser) {
    const module = await import('ua-parser-js')
    UAParser = module.default
  }
  return UAParser
}

export default function AnalyticsPanelClient({ links, defaultStart, defaultEnd, profileId }: { links: any[], defaultStart: string, defaultEnd: string, profileId: string }) {
  const [start, setStart] = useState<string>(defaultStart)
  const [end, setEnd] = useState<string>(defaultEnd)
  const [linkId, setLinkId] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    setPage(1)
  }, [start, end, linkId, search, perPage])

  // Helper: lightweight user-agent parsing for browser/OS
  function parseUserAgent(ua?: string) {
    if (!ua) return 'Unknown'
    try {
      if (!UAParser) return ua.substring(0, 50)
      const p = new UAParser(ua)
      const r = p.getResult()
      const browser = r.browser.name ? `${r.browser.name}${r.browser.version ? ' ' + r.browser.version : ''}` : ''
      const os = r.os.name ? `${r.os.name}${r.os.version ? ' ' + r.os.version : ''}` : ''
      return [browser, os].filter(Boolean).join(' on ') || 'Unknown'
    } catch (e) {
      return ua.split(' ')[0]
    }
  }

  const [monthlyAgg, setMonthlyAgg] = useState<any[]>([])
  const [granularity, setGranularity] = useState<'month' | 'week' | 'day'>('month')
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Helper: extract hostname/destination from a URL
  function extractDestination(url?: string) {
    if (!url) return '—'
    try {
      const u = new URL(url)
      return u.hostname.replace(/^www\./, '')
    } catch (e) {
      return url
    }
  }

  // Build link options: always prefer the server-provided `links` prop when
  // available so the dropdown lists every link for the profile. Merge in
  // totals from `monthlyAgg` (if present) and fall back to `rows` aggregation.
  let linkOptions: Array<{ id: string, title: string, count: number }> = []
  const totalsMap = new Map<string, number>()

  // Aggregate totals from monthlyAgg (may be per-month rows) and build a
  // title lookup so we can show human-friendly titles even when the
  // `links` prop doesn't include them.
  const titleLookup = new Map<string, string>()
  ;(monthlyAgg || []).forEach((r: any) => {
    const id = r.link_id || (r.links && r.links.id) || r.id
    if (!id) return
    const prev = totalsMap.get(id) || 0
    totalsMap.set(id, prev + (r.clicks || 0))
    if (r.title) titleLookup.set(id, r.title)
  })
  // Also use currently loaded rows as a secondary source for titles
  ;(rows || []).forEach((r: any) => {
    const id = r.link_id || (r.links && r.links.id) || (r.link && r.link.id)
    if (!id) return
    if (r.title) titleLookup.set(id, r.title)
  })

  if (Array.isArray(links) && links.length > 0) {
    // Use the supplied links list and attach totals (or 0). Prefer the link
    // title from the `links` prop, then from the monthlyAgg/rows lookup,
    // then fall back to URL or id.
    linkOptions = (links || []).map((l: any) => ({
      id: l.id,
      title: l.title || titleLookup.get(l.id) || l.url || l.id,
      count: totalsMap.get(l.id) ?? (typeof l.clicks === 'number' ? l.clicks : 0)
    }))
    // Sort alphabetically so all links are visible and easy to find
    linkOptions.sort((a, b) => a.title.localeCompare(b.title))
  } else if (totalsMap.size > 0) {
    // No server links list: build options from monthlyAgg totals
    for (const [id, count] of totalsMap.entries()) {
      linkOptions.push({ id, title: titleLookup.get(id) || String(id), count })
    }
    linkOptions.sort((a, b) => b.count - a.count)
  } else {
    // Last-resort: build from paginated rows
    const rowMap = new Map<string, number>()
    ;(rows || []).forEach((r: any) => {
      const id = r.link_id || (r.links && r.links.id) || (r.link && r.link.id)
      if (!id) return
      rowMap.set(id, (rowMap.get(id) || 0) + (r.clicks || 1))
    })
    for (const [id, count] of rowMap.entries()) linkOptions.push({ id, title: titleLookup.get(id) || String(id), count })
    linkOptions.sort((a, b) => b.count - a.count)
  }

  useEffect(() => {
    let mounted = true
    async function fetchRows() {
      setLoading(true)
      // Preload UAParser if we're viewing detailed logs
      if (linkId) loadUAParser().catch(e => console.error('Failed to load UAParser', e))
      try {
        const offset = (page - 1) * perPage
  const params = new URLSearchParams({ start, end, limit: String(perPage), offset: String(offset) })
  if (profileId) params.set('profileId', profileId)
        if (linkId) params.set('linkId', linkId)
        if (search) params.set('search', search)
        const endpoint = linkId ? '/api/analytics/logs' : '/api/analytics/monthly'
        const res = await fetch(`${endpoint}?${params.toString()}`)
        const json = await res.json()
        if (!mounted) return
        setRows(json.data || [])
        setTotal(json.total || 0)
        
        // Also fetch monthly aggregates for the same date range to merge counts
        try {
          const mparams = new URLSearchParams({ start, end, limit: String(1000) })
          if (profileId) mparams.set('profileId', profileId)
          if (granularity) mparams.set('granularity', granularity)
          const mres = await fetch(`/api/analytics/monthly?${mparams.toString()}`)
          const mjson = await mres.json()
          if (mounted) setMonthlyAgg(mjson.data || [])
        } catch (e) {
          console.error('Failed to fetch monthly aggregates', e)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchRows()
    return () => { mounted = false }
  }, [start, end, linkId, search, page, perPage, refreshCounter, granularity])

  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <div>
          <label className="text-sm block mb-1 font-medium">Start</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-sm block mb-1 font-medium">End</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-sm block mb-1 font-medium">Link</label>
          <select value={linkId || ''} onChange={e => setLinkId(e.target.value || null)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">All</option>
            {/** Show only links with click data when available, include counts */}
            {linkOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.title}{opt.count ? ` (${opt.count})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm block mb-1 font-medium">Granularity</label>
          <select value={granularity} onChange={e => setGranularity(e.target.value as any)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div>
          <label className="text-sm block mb-1 font-medium">Search</label>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="title or url" className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-sm block mb-1 font-medium">Per page</label>
          <select value={perPage} onChange={e => setPerPage(parseInt(e.target.value, 10))} className="w-full border rounded px-2 py-1.5 text-sm">
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <MonthlyStatsClient start={start} end={end} profileId={profileId} linkId={linkId} chartType={linkId ? 'line' : 'bar'} granularity={granularity} />
        </div>
            <div className="flex-shrink-0">
          <label className="text-sm block mb-2 font-medium">Actions</label>
          <div className="flex flex-row lg:flex-col gap-2">
            <button onClick={() => {
              try {
                const params = new URLSearchParams()
                if (start) params.set('start', start)
                if (end) params.set('end', end)
                if (linkId) params.set('linkId', linkId)
                if (profileId) params.set('profileId', profileId)
                if (granularity) params.set('granularity', granularity)
                // export only stats for active links
                params.set('activeOnly', 'true')
                params.set('format', 'csv')
                const url = `/api/analytics/export?${params.toString()}`
                window.open(url, '_blank')
              } catch (e) {
                console.error('Failed to start export', e)
              }
            }} className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50 text-sm whitespace-nowrap">CSV Export</button>
                <button
                  onClick={async () => {
                    try {
                      setRefreshLoading(true)
                      const res = await fetch('/api/analytics/refresh', { method: 'POST' })
                      if (!res.ok) throw new Error('Failed to refresh')
                      // increment counter to trigger re-fetch
                      setRefreshCounter(c => c + 1)
                    } catch (e) {
                      console.error('Failed to refresh monthly stats', e)
                      alert('Failed to refresh stats from DB')
                    } finally {
                      setRefreshLoading(false)
                    }
                  }}
                  className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50 text-sm whitespace-nowrap"
                  disabled={refreshLoading}
                >{refreshLoading ? 'Refreshing…' : 'Refresh DB'}</button>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">Showing {(page-1)*perPage+1} - {Math.min(page*perPage, total)} of {total}</div>
        <div className="overflow-x-auto mt-2 -mx-4 sm:mx-0">
            {/** If a specific link is selected, show detailed raw logs (timestamp, UA, IP). Otherwise show monthly aggregates (as before). */}
            {linkId ? (
              <table className="w-full table-auto min-w-[640px]">
                <thead>
                        <tr className="text-left bg-gray-50">
                          <th className="px-3 py-2 text-xs font-semibold">Timestamp</th>
                          <th className="px-3 py-2 text-xs font-semibold">Browser</th>
                          <th className="px-3 py-2 text-xs font-semibold">Destination</th>
                          <th className="px-3 py-2 text-xs font-semibold">URL</th>
                          <th className="px-3 py-2 text-xs font-semibold hidden md:table-cell">User Agent</th>
                          <th className="px-3 py-2 text-xs font-semibold hidden lg:table-cell">IP</th>
                        </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-4 text-center text-sm">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="py-4 text-center text-sm">No results</td></tr>
                  ) : rows.map((r: any, idx: number) => (
                    <tr key={`${r.id || idx}-${r.clicked_at}`} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs">{formatDateTime(r.clicked_at)}</td>
                      <td className="px-3 py-2 text-xs">{parseUserAgent(r.user_agent)}</td>
                      <td className="px-3 py-2 text-xs">{extractDestination(r.url)}</td>
                      <td className="px-3 py-2 text-xs"><a href={r.url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">{r.url}</a></td>
                      <td className="px-3 py-2 text-xs hidden md:table-cell">{r.user_agent || '—'}</td>
                      <td className="px-3 py-2 text-xs hidden lg:table-cell">{r.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left bg-gray-50">
                    <th className="px-3 py-2 text-xs font-semibold">Month</th>
                    <th className="px-3 py-2 text-xs font-semibold">Link</th>
                    <th className="px-3 py-2 text-xs font-semibold">URL</th>
                    <th className="px-3 py-2 text-xs font-semibold">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="py-4 text-center text-sm">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-sm">No results</td></tr>
                  ) : rows.map((r: any) => (
                    <tr key={`${r.link_id}-${r.month}`} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs">{formatMonthShort(r.month)}</td>
                      <td className="px-3 py-2 text-xs">{r.title}</td>
                      <td className="px-3 py-2 text-xs"><a href={r.url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">{r.url}</a></td>
                      <td className="px-3 py-2 text-xs">{r.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="px-4 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="px-4 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
          </div>
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
        </div>
      </div>
    </div>
  )
}
