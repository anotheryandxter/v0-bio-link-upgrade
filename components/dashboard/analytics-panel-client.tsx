"use client"

import React, { useEffect, useState } from 'react'
import MonthlyStatsClient from './monthly-stats-client'
import UAParser from 'ua-parser-js'

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

  // Build link options filtered to only those that have click data in `rows` (counts)
  const linkCounts = new Map<string, number>()
  const linkTitles = new Map<string, string>()
  ;(rows || []).forEach((r: any) => {
    const id = r.link_id || (r.links && r.links.id) || (r.link && r.link.id)
    if (!id) return
    const prev = linkCounts.get(id) || 0
    const add = typeof r.clicks === 'number' ? r.clicks : 1
    linkCounts.set(id, prev + add)
    if (!linkTitles.has(id)) linkTitles.set(id, r.title || (r.links && r.links.title) || r.name || r.url || id)
  })

  // Merge counts from monthly aggregates as well (so dropdown reflects monthly data)
  ;(monthlyAgg || []).forEach((r: any) => {
    const id = r.link_id || (r.links && r.links.id) || (r.link && r.link.id) || r.id
    if (!id) return
    const prev = linkCounts.get(id) || 0
    const add = typeof r.clicks === 'number' ? r.clicks : 0
    linkCounts.set(id, prev + add)
    if (!linkTitles.has(id)) linkTitles.set(id, r.title || (r.links && r.links.title) || r.name || r.url || id)
  })

  // Build the select options: prefer links with counts > 0, sorted by count desc
  let linkOptions: Array<{ id: string, title: string, count: number }> = []
  if (linkCounts.size > 0) {
    for (const [id, count] of linkCounts.entries()) {
      const title = linkTitles.get(id) || ((links || []).find((l: any) => l.id === id)?.title) || id
      linkOptions.push({ id, title, count })
    }
    linkOptions.sort((a, b) => b.count - a.count)
  } else {
    // Fallback: show deduped links passed from parent
    linkOptions = Array.from(new Map((links || []).map((l: any) => [l.id, { id: l.id, title: l.title || l.url, count: 0 }])).values())
  }

  useEffect(() => {
    let mounted = true
    async function fetchRows() {
      setLoading(true)
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
  }, [start, end, linkId, search, page, perPage])

  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-sm block">Start</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm block">End</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm block">Link</label>
          <select value={linkId || ''} onChange={e => setLinkId(e.target.value || null)} className="border rounded px-2 py-1">
            <option value="">All</option>
            {/** Show only links with click data when available, include counts */}
            {linkOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.title}{opt.count ? ` (${opt.count})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm block">Search</label>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="title or url" className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm block">Per page</label>
          <select value={perPage} onChange={e => setPerPage(parseInt(e.target.value, 10))} className="border rounded px-2 py-1">
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div>
        <MonthlyStatsClient start={start} end={end} profileId={profileId} linkId={linkId} chartType={linkId ? 'line' : 'bar'} />
      </div>

      <div>
        <div className="text-sm text-muted-foreground">Showing {(page-1)*perPage+1} - {Math.min(page*perPage, total)} of {total}</div>
        <div className="overflow-x-auto mt-2">
            {/** If a specific link is selected, show detailed raw logs (timestamp, UA, IP). Otherwise show monthly aggregates (as before). */}
            {linkId ? (
              <table className="w-full table-auto">
                <thead>
                        <tr className="text-left">
                          <th className="px-2 py-1">Timestamp</th>
                          <th className="px-2 py-1">Browser</th>
                          <th className="px-2 py-1">Destination</th>
                          <th className="px-2 py-1">URL</th>
                          <th className="px-2 py-1">User Agent</th>
                          <th className="px-2 py-1">IP</th>
                        </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-4">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="py-4">No results</td></tr>
                  ) : rows.map((r: any, idx: number) => (
                    <tr key={`${r.id || idx}-${r.clicked_at}`}>
                      <td className="px-2 py-1">{new Date(r.clicked_at).toLocaleString()}</td>
                      <td className="px-2 py-1">{parseUserAgent(r.user_agent)}</td>
                      <td className="px-2 py-1">{extractDestination(r.url)}</td>
                      <td className="px-2 py-1"><a href={r.url} className="text-blue-600" target="_blank" rel="noreferrer">{r.url}</a></td>
                      <td className="px-2 py-1">{r.user_agent || '—'}</td>
                      <td className="px-2 py-1">{r.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">Month</th>
                    <th className="px-2 py-1">Link</th>
                    <th className="px-2 py-1">URL</th>
                    <th className="px-2 py-1">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="py-4">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={4} className="py-4">No results</td></tr>
                  ) : rows.map((r: any) => (
                    <tr key={`${r.link_id}-${r.month}`}>
                      <td className="px-2 py-1">{new Date(r.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</td>
                      <td className="px-2 py-1">{r.title}</td>
                      <td className="px-2 py-1"><a href={r.url} className="text-blue-600" target="_blank" rel="noreferrer">{r.url}</a></td>
                      <td className="px-2 py-1">{r.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="px-3 py-1 border rounded mr-2">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="px-3 py-1 border rounded">Next</button>
          </div>
          <div className="text-sm">Page {page} of {totalPages}</div>
        </div>
      </div>
    </div>
  )
}
