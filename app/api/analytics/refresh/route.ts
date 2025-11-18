import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import getRedisClient from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Allow if running with service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      // otherwise require server session
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      // optionally check user role/profile here
    }

    const admin = createAdminSupabaseClient()
    // Prefer refreshing the Jakarta-aware materialized view if present
    let data: any, error: any
    try {
      const res = await admin.rpc('refresh_monthly_link_stats_jakarta')
      data = res?.data
      error = res?.error
    } catch (e) {
      // Fallback to original refresh function
      const res = await admin.rpc('refresh_monthly_link_stats')
      data = res?.data
      error = res?.error
    }
    if (error) {
      console.error('Failed to refresh materialized view', error)
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }

    // Invalidate Redis cache keys related to monthly stats so clients see fresh data.
    try {
      const redis = getRedisClient()
      if (redis) {
        // Use SCAN to find keys matching the monthly prefix and delete them.
        const stream = redis.scanStream({ match: 'monthly:*', count: 100 })
        const keysToDelete: string[] = []
        for await (const keys of stream) {
          if (keys.length) keysToDelete.push(...keys)
        }
        if (keysToDelete.length) {
          // delete in batches to avoid argument limits
          const batchSize = 1000
          for (let i = 0; i < keysToDelete.length; i += batchSize) {
            const batch = keysToDelete.slice(i, i + batchSize)
            await redis.del(...batch)
          }
        }
      }
    } catch (e) {
      console.warn('Failed to invalidate Redis monthly cache', e)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('refresh route error', err)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
