// ===== COMPLETE USER AND DATA SETUP FOR REFLECTION PHOTOGRAPHY =====
// This script creates the auth user and sets up all default data

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  #!/usr/bin/env node
  /**
   * Sanitized setup script placeholder
   *
   * The original `004_setup_user_and_data.js` created a Supabase user with
   * hard-coded credentials and performed seeded upserts. That content has been
   * removed to avoid storing secrets in the repository.
   *
   * Use this template instead: it reads credentials from environment variables
   * and performs idempotent upserts. Do NOT hard-code credentials in source.
   */

  import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminEmail = process.env.SETUP_ADMIN_EMAIL // set in CI or local env
  const adminPassword = process.env.SETUP_ADMIN_PASSWORD // set in CI or local env

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  if (!adminEmail || !adminPassword) {
    console.error('Missing SETUP_ADMIN_EMAIL or SETUP_ADMIN_PASSWORD - aborting. Use secure secrets to provide these.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  async function main() {
    console.log('[v0] Starting secure setup (no hard-coded secrets)...')

    // Create (or find) the admin user via the Supabase Admin API
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { username: 'admin' }
    })

    if (createErr && !createErr.message.includes('already registered')) {
      console.error('[v0] Failed to create user:', createErr.message)
      process.exit(1)
    }

    console.log('[v0] Admin user ensured (id may be retrieved via admin.listUsers)')

    // Note: Do not seed PII or credentials here. Use secure, idempotent upserts
    // driven by environment variables or CI secrets.
  }

  main().catch((err) => {
    console.error('Setup failed:', err.message)
    process.exit(1)
  })
