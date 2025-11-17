import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const profileId = url.searchParams.get('profileId')
    const linkId = url.searchParams.get('linkId')
    const startDate = url.searchParams.get('start')
    const endDate = url.searchParams.get('end')

    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
    if (!linkId) return NextResponse.json({ error: 'linkId required' }, { status: 400 })

    const admin = createAdminSupabaseClient()

    // Fetch clicks in range for the link
    let q = admin.from('link_clicks').select('clicked_at')
      .eq('link_id', linkId)
      .order('clicked_at', { ascending: true })

    if (startDate) q = q.gte('clicked_at', startDate)
    if (endDate) q = q.lt('clicked_at', new Date(new Date(endDate).getTime() + 24*60*60*1000).toISOString().slice(0,10))

    const { data, error } = await q
    if (error) {
      console.error('daily query error', error)
      return NextResponse.json({ error: 'Failed to fetch daily stats' }, { status: 500 })
    }

    // Aggregate into day buckets (YYYY-MM-DD)
    const counts: Record<string, number> = {}
    for (const r of (data || [])) {
      try {
        const d = new Date(r.clicked_at)
        const day = d.toISOString().slice(0,10)
        counts[day] = (counts[day] || 0) + 1
      } catch (e) {
        continue
      }
    }

    // Build continuous series from start->end if provided to ensure days with zeroes appear
    const days: Array<{ day: string; visits: number }> = []
    if (startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate)
      for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
        const key = dt.toISOString().slice(0,10)
        days.push({ day: key, visits: counts[key] || 0 })
      }
    } else {
      // If no explicit range, return sorted days present in data
      const keys = Object.keys(counts).sort()
      for (const k of keys) days.push({ day: k, visits: counts[k] })
    }

    return NextResponse.json({ data: days })
  } catch (err) {
    console.error('analytics daily error', err)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
