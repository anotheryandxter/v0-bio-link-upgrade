"use client"

import React, { useEffect, useState } from 'react'
import MonthlyStatsClient from './monthly-stats-client'

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
        const res = await fetch(`/api/analytics/monthly?${params.toString()}`)
        const json = await res.json()
        if (!mounted) return
        setRows(json.data || [])
        setTotal(json.total || 0)
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
            {links?.map((l: any) => <option key={l.id} value={l.id}>{l.title || l.url}</option>)}
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
        <MonthlyStatsClient start={start} end={end} profileId={profileId} />
      </div>

      <div>
        <div className="text-sm text-muted-foreground">Showing {(page-1)*perPage+1} - {Math.min(page*perPage, total)} of {total}</div>
        <div className="overflow-x-auto mt-2">
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
