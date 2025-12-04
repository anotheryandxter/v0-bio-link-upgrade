"use client"

import React, { useEffect, useState } from 'react'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, BarChart, Bar } from 'recharts'
import { formatMonthShort, formatMonthDay, formatDateTime } from '@/lib/timezone'

export default function MonthlyStatsClient({ start, end, profileId, linkId, chartType, granularity }: { start?: string, end?: string, profileId?: string, linkId?: string | null, chartType?: 'line' | 'bar', granularity?: 'month' | 'week' | 'day' }) {
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

        if (linkId) params.set('linkId', linkId)
        if (granularity) params.set('granularity', granularity)
        // Use the monthly endpoint as a single flexible endpoint that
        // supports day/week/month granularity. Back-end will return
        // rows shaped accordingly (e.g. { day, visits } or { month, clicks }).
        const res = await fetch(`/api/analytics/monthly?${params.toString()}`)
        const json = await res.json()
        if (mounted) setData(json.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [start, end, profileId, linkId, granularity])

  if (loading) return <div>Loading chart...</div>
  if (!data || data.length === 0) return <div>No stats available yet.</div>

  // Prepare data shapes for daily (line) and monthly (bar) charts
  const detectedDaily = (data && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'day'))
  const lineData = (data || []).map((d: any) => {
    if (detectedDaily) {
      return { label: d.day, value: d.visits || 0, raw: d }
    }
    // If monthly data is rendered as a line (less common), use month or name
    return { label: d.month || d.name || '', value: d.clicks || 0, raw: d }
  })
  const barData = (data || []).map((d: any) => {
    // For bar chart, prefer { name, clicks } shape
    return { name: d.name || (d.month ? formatMonthShort(d.month) : ''), clicks: d.clicks || 0, raw: d }
  })

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        {chartType === 'bar' ? (
          <BarChart data={barData as any} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickFormatter={(d: any) => d} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="clicks" fill="#2563eb" />
          </BarChart>
        ) : (
          <LineChart data={lineData as any} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickFormatter={(d: any) => {
              const parsed = Date.parse(d)
              if (!isNaN(parsed)) return formatMonthDay(d)
              return d
            }} />
            <YAxis />
            <Tooltip labelFormatter={(label) => {
              const parsed = Date.parse(label)
              return !isNaN(parsed) ? formatDateTime(label) : label
            }} />
            <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
