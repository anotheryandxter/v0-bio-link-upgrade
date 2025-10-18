import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

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
    const { data, error } = await admin.rpc('refresh_monthly_link_stats')
    if (error) {
      console.error('Failed to refresh materialized view', error)
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('refresh route error', err)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
