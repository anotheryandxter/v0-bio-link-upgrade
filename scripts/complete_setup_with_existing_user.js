#!/usr/bin/env node
import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const email = 'ryndxtr@gmail.com'
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Failed to list users', error.message)
    process.exit(1)
  }
  const user = users.users.find((u) => u.email === email)
  if (!user) {
    console.error('User not found; please run the create user step first')
    process.exit(1)
  }
  const userId = user.id
  console.log('Found user id', userId)

  // Upsert profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      business_name: 'Reflection Photography',
      avatar: './assets/avatar.PNG',
      location: 'Indonesia',
      favicon: './assets/favicon.png',
      page_title: 'Reflection Photography',
      background_video: {
        webm: 'web.webm',
        mp4: 'web.mp4',
        ogv: 'web.ogv',
        poster: 'img/videoframe.jpg',
      },
      theme_preference: 'system',
      is_setup: true,
    }, { onConflict: ['user_id'] })
    .select()
    .single()

  if (profileError) {
    console.error('Failed to upsert profile', profileError.message)
    process.exit(1)
  }
  console.log('Profile upserted', profileData.id)

  // Insert default links (idempotent)
  const defaultLinks = [
    {
      profile_id: profileData.id,
      title: 'MEMBERSHIP',
      url: 'https://drive.google.com/file/d/1pS9eX3F9YlYLh0fvrI4txWdLD_lagDKV/view?pli=1',
      icon: 'fa fa-info-circle',
      background_color_light: '#ffd621',
      background_color_dark: '#f59e0b',
      text_color_light: '#333333',
      text_color_dark: '#1f2937',
      opacity: 0.9,
      order_index: 1,
      category: 'main',
    },
    // ... other links omitted for brevity; we'll reuse the earlier file's defaults
  ]

  // For brevity, insert a subset to test
  for (const l of defaultLinks) {
    const { error: ie } = await supabase.from('links').insert(l).select()
    if (ie) {
      if (ie.code && ie.code === '23505') {
        console.log('Link already exists, skipping', l.title)
        continue
      }
      console.error('Failed to insert link', l.title, ie.message)
    } else {
      console.log('Inserted', l.title)
    }
  }

  console.log('Done')
}

run()
