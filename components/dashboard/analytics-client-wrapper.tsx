"use client"

import React from 'react'
import ChunkErrorBoundary from './error-boundary-client'
import AnalyticsPanelClient from './analytics-panel-client'

export default function AnalyticsClientWrapper(props: any) {
  return (
    <ChunkErrorBoundary>
      <AnalyticsPanelClient {...props} />
    </ChunkErrorBoundary>
  )
}
