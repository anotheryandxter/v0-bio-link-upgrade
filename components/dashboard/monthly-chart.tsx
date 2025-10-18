"use client"
import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export default function MonthlyChart({ data }: { data: Array<{ name: string; clicks: number }> }) {
  if (!data || data.length === 0) return null

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data as any}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="clicks" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
