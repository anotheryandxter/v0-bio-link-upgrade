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
  const startDate = url.searchParams.get('start') // yyyy-mm-dd
  const endDate = url.searchParams.get('end') // yyyy-mm-dd
  const linkId = url.searchParams.get('linkId')
  const search = url.searchParams.get('search')
  const pageStr = url.searchParams.get('page')
  const perPageStr = url.searchParams.get('perPage')
  // also accept legacy/alternate params: limit & offset (used by client)
  const limitStr = url.searchParams.get('limit')
  const offsetStr = url.searchParams.get('offset')

  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1
  const perPage = perPageStr ? Math.max(1, Math.min(1000, parseInt(perPageStr, 10) || 50)) : 50
  const limit = limitStr ? Math.max(1, Math.min(1000, parseInt(limitStr, 10) || perPage)) : null
  const offset = offsetStr ? Math.max(0, parseInt(offsetStr, 10) || 0) : null

  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

    // Authenticate: allow if service role key present, otherwise require session user
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const redis = getRedisClient()
    // cache key should include whichever pagination form was provided
    const paginationSuffix = limit !== null && offset !== null ? `l${limit}:o${offset}` : `p${page}:n${perPage}`
    const cacheKey = `monthly:${profileId}:${startDate || ''}:${endDate || ''}:${linkId || ''}:${search || ''}:${paginationSuffix}`
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          return NextResponse.json(parsed)
        } catch (e) {
          // fall through to fresh fetch
        }
      }
    }

    const admin = createAdminSupabaseClient()
    // determine limit/offset (support limit+offset or page+perPage)
    const finalLimit = limit !== null ? limit : perPage
    const finalOffset = offset !== null ? offset : (page - 1) * perPage

    let rpcResult: any = await timeAsync('rpc:get_link_stats', async () => await admin.rpc('get_link_stats', {
      p_profile_id: profileId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_link_id: linkId || null,
      p_search: search || null,
      p_limit: finalLimit,
      p_offset: finalOffset,
    }))
    let data = rpcResult?.data
    let error = rpcResult?.error
    // Fallback: some DBs may have a profile-agnostic RPC signature (no p_profile_id)
    if (error && error.code === 'PGRST202') {
      console.warn('get_link_stats RPC signature mismatch; retrying without p_profile_id')
      rpcResult = await timeAsync('rpc:get_link_stats', async () => await admin.rpc('get_link_stats', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_link_id: linkId || null,
        p_search: search || null,
        p_limit: finalLimit,
        p_offset: finalOffset,
      }))
      data = rpcResult?.data
      error = rpcResult?.error
    }
    if (error) {
        console.error('RPC error', error)
        // Fallback: if DB RPCs are not present on this environment, perform aggregation in JS
        try {
          // Build date bounds
          const startTs = startDate ? new Date(startDate + 'T00:00:00Z') : null
          const endTs = endDate ? new Date(endDate + 'T00:00:00Z') : null

          // Query raw clicks joined with links for the profile
          const whereStart = startTs ? { gte: ['clicked_at', startDate] } : null
          const whereEnd = endTs ? { lt: ['clicked_at', new Date((endTs.getTime()) + 24*60*60*1000).toISOString().slice(0,10)] } : null

          // Use postgrest-style filters via supabase client
          let q = admin.from('link_clicks').select('clicked_at, link_id, links!inner(id,title,url,profile_id)')
          // restrict to profile
          q = q.eq('links.profile_id', profileId)
          if (startDate) q = q.gte('clicked_at', startDate)
          if (endDate) q = q.lt('clicked_at', new Date(new Date(endDate).getTime() + 24*60*60*1000).toISOString().slice(0,10))

          const { data: rawRows, error: rawErr } = await q
          if (rawErr) {
            console.error('Fallback query error', rawErr)
            return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
          }

          // Aggregate in JS: group by link + month
          const groups: Record<string, { link_id: string, title: string, url: string, month: string, clicks: number }> = {}
          for (const r of (rawRows || [])) {
            try {
              const d = new Date(r.clicked_at)
              const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0,10)
              // `links!inner(...)` may return an array of related rows; normalize
              const linkObj = Array.isArray(r.links) ? r.links[0] : r.links
              const lid = r.link_id || (linkObj && linkObj.id)
              const title = (linkObj && linkObj.title) || null
              const urlv = (linkObj && linkObj.url) || null
              const key = `${lid}|${month}`
              if (!groups[key]) groups[key] = { link_id: lid, title, url: urlv, month, clicks: 0 }
              groups[key].clicks += 1
            } catch (e) {
              // ignore parsing errors per-row
              continue
            }
          }

          let rowsArr = Object.values(groups)
          // sort by month desc then clicks desc
          rowsArr.sort((a, b) => {
            if (a.month === b.month) return b.clicks - a.clicks
            return new Date(b.month).getTime() - new Date(a.month).getTime()
          })

          const totalGroups = rowsArr.length
          // apply pagination
          const startIndex = finalOffset
          const endIndex = finalOffset + finalLimit
          const paged = rowsArr.slice(startIndex, endIndex)

          const payload = { data: paged, total: totalGroups, page, perPage: finalLimit, offset: finalOffset, source: 'fallback' }
          if (redis) await redis.set(cacheKey, JSON.stringify(payload), 'EX', 60)
          return NextResponse.json(payload)
        } catch (e) {
          console.error('Fallback aggregation failed', e)
          return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
        }
    }

    // also fetch total count for pagination UI
    let total = 0
    try {
      let countResult: any = await timeAsync('rpc:get_link_stats_count', async () => await admin.rpc('get_link_stats_count', {
        p_profile_id: profileId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_link_id: linkId || null,
        p_search: search || null,
      }))
      let countData = countResult?.data
      let countError = countResult?.error
      if (countError && countError.code === 'PGRST202') {
        // retry without profile_id
        console.warn('get_link_stats_count RPC signature mismatch; retrying without p_profile_id')
        countResult = await timeAsync('rpc:get_link_stats_count', async () => await admin.rpc('get_link_stats_count', {
          p_start_date: startDate || null,
          p_end_date: endDate || null,
          p_link_id: linkId || null,
          p_search: search || null,
        }))
        countData = countResult?.data
        countError = countResult?.error
      }
      if (!countError && Array.isArray(countData) && countData[0] && typeof countData[0].total !== 'undefined') {
        total = parseInt(String(countData[0].total), 10) || 0
      }
      if (countError) {
        console.warn('Failed to fetch stats total count', countError)
      }
    } catch (e) {
      console.warn('Failed to fetch stats total count', e)
    }

    const responsePayload = { data, total, page, perPage: finalLimit, offset: finalOffset, source: 'rpc' }

    if (redis) {
      // cache for short period
      await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 60)
    }

    return NextResponse.json(responsePayload)
  } catch (err) {
    console.error('monthly api error', err)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
