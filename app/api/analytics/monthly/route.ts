import { NextResponse } from 'next/server'
import getRedisClient from '@/lib/cache/redis'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { timeAsync } from '@/lib/profiler'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const profileId = url.searchParams.get('profileId')
    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

    // Authenticate: allow if service role key present, otherwise require session user
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const redis = getRedisClient()
    const cacheKey = `monthly:${profileId}`
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ data: JSON.parse(cached), source: 'redis' })
      }
    }

    const admin = createAdminSupabaseClient()
    const rpcResult: any = await timeAsync('rpc:get_monthly_stats', async () => await admin.rpc('get_monthly_stats', { p_profile_id: profileId }))
    const data = rpcResult?.data
    const error = rpcResult?.error
    if (error) {
      console.error('RPC error', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    if (redis) {
      // cache for short period
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 60)
    }

    return NextResponse.json({ data, source: 'rpc' })
  } catch (err) {
    console.error('monthly api error', err)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
