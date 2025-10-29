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
#!/usr/bin/env node
// Sanitized helper: complete setup for an existing user (no hard-coded email)
//
// The previous file used a hard-coded email address. To avoid committing
// PII, this file now expects the operator to provide the target email via
// environment variable `EXISTING_USER_EMAIL` and will abort if it's not set.

import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const existingEmail = process.env.EXISTING_USER_EMAIL

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

if (!existingEmail) {
  console.error('Missing EXISTING_USER_EMAIL - aborting. Provide the email via ENV and do not hard-code it.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Failed to list users', error.message)
    process.exit(1)
  }
  const user = users.users.find((u) => u.email === existingEmail)
  if (!user) {
    console.error('User not found; please create the user securely first')
    process.exit(1)
  }
  const userId = user.id
  console.log('Found user id', userId)

  // Upsert profile (idempotent)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, business_name: 'Reflection Photography', is_setup: true }, { onConflict: ['user_id'] })
    .select()
    .single()

  if (profileError) {
    console.error('Failed to upsert profile', profileError.message)
    process.exit(1)
  }
  console.log('Profile upserted', profileData.id)
  console.log('Done')
}

run()
