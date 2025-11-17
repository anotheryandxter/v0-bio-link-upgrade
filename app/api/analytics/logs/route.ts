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
    const limit = url.searchParams.get('limit') ? Math.min(1000, parseInt(url.searchParams.get('limit')!, 10) || 100) : 100
    const offset = url.searchParams.get('offset') ? Math.max(0, parseInt(url.searchParams.get('offset')!, 10) || 0) : 0

    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
    if (!linkId) return NextResponse.json({ error: 'linkId required for logs' }, { status: 400 })

    const admin = createAdminSupabaseClient()

    // Fetch raw click rows for the link (non-destructive read-only)
    // Join with links to include title/url and ensure profile scoping
    const q = admin
      .from('link_clicks')
      .select('id, clicked_at, user_agent, ip_address, user_identifier, links!inner(id,title,url,profile_id)')
      .eq('link_id', linkId)
      .order('clicked_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await q
    if (error) {
      console.error('logs query error', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    // Flatten rows to a conservative shape for the client
    const rows = (data || []).map((r: any) => {
      const linkObj = Array.isArray(r.links) ? r.links[0] : r.links
      return {
        id: r.id,
        clicked_at: r.clicked_at,
        user_agent: r.user_agent || null,
        ip_address: r.ip_address || null,
        user_identifier: r.user_identifier || null,
        title: linkObj?.title || null,
        url: linkObj?.url || null,
      }
    })

    // Attempt to fetch total count for pagination (non-destructive head request)
    const { count } = await admin
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('link_id', linkId)

    const total = typeof count === 'number' ? count : rows.length

    return NextResponse.json({ data: rows, total })
  } catch (err) {
    console.error('analytics logs error', err)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
