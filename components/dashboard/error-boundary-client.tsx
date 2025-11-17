"use client"

import React from 'react'

type Props = { children: React.ReactNode }

export default class ChunkErrorBoundary extends React.Component<Props, { hasError: boolean; retryKey: number }> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, retryKey: 0 }
    this.handleRetry = this.handleRetry.bind(this)
  }

  static getDerivedStateFromError() {
    return { hasError: true, retryKey: 0 }
  }

  componentDidCatch(error: any) {
    // Log for diagnostics
    console.error('ChunkErrorBoundary caught:', error)
    const msg = (error && (error.message || '')).toString()
    // If it's a chunk loading error, attempt a soft reload after a short delay.
    if (/Loading chunk|ChunkLoadError/i.test(msg)) {
      // Wait briefly to allow users to see the message, then reload once.
      setTimeout(() => {
        try { window.location.reload() } catch (e) { /* ignore */ }
      }, 3000)
    }
  }

  handleRetry() {
    this.setState((s) => ({ hasError: false, retryKey: s.retryKey + 1 }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 12, borderRadius: 8, border: '1px solid #f1c40f', background: '#fff7e6' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Client load error</div>
          <div style={{ fontSize: 13, color: '#333' }}>A client resource failed to load (ChunkLoadError). This can happen when the edge cache is stale.</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '6px 10px' }}>Reload page</button>
            <button onClick={this.handleRetry} style={{ padding: '6px 10px' }}>Try again</button>
          </div>
        </div>
      )
    }

    // Use a key to allow immediate re-mount when retry is clicked
    return <React.Fragment key={String(this.state.retryKey)}>{this.props.children}</React.Fragment>
  }
}
