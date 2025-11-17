"use client"

import React, { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts'

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

  // Decide chart mode: explicit prop `chartType` wins, otherwise fall back to detection
  const detectedDaily = (data && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'day'))
  const useLine = chartType === 'line' || (typeof chartType === 'undefined' && (Boolean(linkId) || detectedDaily))
  if (useLine) {
    return (
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
            <YAxis />
            <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
            <Line type="monotone" dataKey="visits" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="clicks" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
