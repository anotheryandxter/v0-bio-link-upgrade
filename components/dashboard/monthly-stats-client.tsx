"use client"

import React, { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export default function MonthlyStatsClient({ start, end, profileId }: { start?: string, end?: string, profileId?: string }) {
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
        const res = await fetch(`/api/analytics/monthly?${params.toString()}`)
        const json = await res.json()
        if (mounted) setData((json.data || []).map((r: any) => ({ name: `${r.title} (${new Date(r.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })})`, clicks: r.clicks })))
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      mounted = false
    }
  }, [start, end])

  if (loading) return <div>Loading chart...</div>
  if (!data || data.length === 0) return <div>No monthly stats available yet.</div>

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
