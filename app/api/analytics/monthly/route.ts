import { NextResponse } from 'next/server'
import getRedisClient from '@/lib/cache/redis'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { timeAsync } from '@/lib/profiler'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
  const url = new URL(request.url)
  const startDate = url.searchParams.get('start') // yyyy-mm-dd
  const endDate = url.searchParams.get('end') // yyyy-mm-dd
  const linkId = url.searchParams.get('linkId')
  const search = url.searchParams.get('search')
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')

    // Authenticate: allow if service role key present, otherwise require session user
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const redis = getRedisClient()
  const cacheKey = `monthly::${startDate || ''}:${endDate || ''}:${linkId || ''}:${search || ''}`
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ data: JSON.parse(cached), source: 'redis' })
      }
    }

    const admin = createAdminSupabaseClient()
    // Call paginated RPC
    const pLimit = limit ? parseInt(limit, 10) : null
    const pOffset = offset ? parseInt(offset, 10) : 0

    const rpcResult: any = await timeAsync('rpc:get_link_stats', async () => await admin.rpc('get_link_stats', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_link_id: linkId || null,
      p_search: search || null,
      p_limit: pLimit,
      p_offset: pOffset,
    }))
    const data = rpcResult?.data
    const error = rpcResult?.error
    if (error) {
      console.error('RPC error', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // Fetch total count for pagination
    const countResult: any = await admin.rpc('get_link_stats_count', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_link_id: linkId || null,
      p_search: search || null,
    })
    const total = (countResult?.data && countResult.data[0] && countResult.data[0].total) ? parseInt(countResult.data[0].total, 10) : 0

    if (redis) {
      // cache for short period
      await redis.set(cacheKey, JSON.stringify({ data, total }), 'EX', 60)
    }

    return NextResponse.json({ data, total, source: 'rpc' })
  } catch (err) {
    console.error('monthly api error', err)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
