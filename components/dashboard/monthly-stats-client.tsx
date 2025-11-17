"use client"

import React, { useEffect, useState } from 'react'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts'

export default function MonthlyStatsClient({ start, end, profileId, linkId, chartType }: { start?: string, end?: string, profileId?: string, linkId?: string | null, chartType?: 'line' | 'bar' }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (start) params.set('start', start)
        if (end) params.set('end', end)
        if (profileId) params.set('profileId', profileId)

        if (linkId) {
          // Fetch day-by-day counts for the selected link
          params.set('linkId', linkId)
          const res = await fetch(`/api/analytics/daily?${params.toString()}`)
          const json = await res.json()
          // expected shape: [{ day: '2025-11-01', visits: 3 }, ...]
          if (mounted) setData(json.data || [])
        } else {
          // Fallback: monthly aggregates (existing endpoint)
          const res = await fetch(`/api/analytics/monthly?${params.toString()}`)
          const json = await res.json()
          if (mounted) setData((json.data || []).map((r: any) => ({ name: `${r.title} (${new Date(r.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })})`, clicks: r.clicks })))
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [start, end, profileId, linkId])

  if (loading) return <div>Loading chart...</div>
  if (!data || data.length === 0) return <div>No stats available yet.</div>

  // Normalize both daily and monthly data to a common shape for the line chart:
  // { label: string, value: number, raw: any }
  const detectedDaily = (data && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'day'))
  const normalized = (data || []).map((d: any) => {
    if (detectedDaily) {
      return { label: d.day, value: d.visits || 0, raw: d }
    }
    // monthly rows were mapped earlier to { name, clicks }
    return { label: d.name || (d.month ? new Date(d.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : ''), value: d.clicks || 0, raw: d }
  })

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={normalized} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickFormatter={(d: any) => {
            // Format ISO dates nicely, otherwise show label as-is
            const parsed = Date.parse(d)
            if (!isNaN(parsed)) return new Date(d).toLocaleDateString(undefined, { month: 'short', day: detectedDaily ? 'numeric' : undefined })
            return d
          }} />
          <YAxis />
          <Tooltip labelFormatter={(label) => {
            const parsed = Date.parse(label)
            return !isNaN(parsed) ? new Date(label).toLocaleString() : label
          }} />
          <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
