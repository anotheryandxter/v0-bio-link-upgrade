import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export const runtime = 'edge'

// Disable body parsing so we can use formidable
export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(req: Request) {
  // Note: Edge runtime doesn't support formidable or fs; switch to Node runtime
  return NextResponse.json({ error: 'Uploads API must run in Node runtime' }, { status: 500 })
}
