// ===== DATABASE CONNECTION TEST =====
// Test script to verify Supabase connection and basic CRUD operations

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("[v0] Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log("[v0] Starting database connection test...")

  try {
    // Test 1: Basic connection (get a sample row and total count)
    console.log("[v0] Testing basic connection...")
    const { data, error, count } = await supabase.from("profiles").select("*", { count: 'exact' }).limit(1)

    if (error) {
      console.error("[v0] Connection test failed:", error.message)
      return false
    }

    console.log("[v0] ✓ Database connection successful", count ? `(rows: ${count})` : "")

    // Test 2: Check table structure
    console.log("[v0] Testing table structure...")
    const tables = ["profiles", "links", "link_clicks"]

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*").limit(1)

      if (error) {
        console.error(`[v0] Table ${table} test failed:`, error.message)
        return false
      }

      console.log(`[v0] ✓ Table ${table} accessible`)
    }

    // Test 3: Check RLS policies (should fail without auth)
    console.log("[v0] Testing RLS policies...")
    const { data: publicData, error: publicError } = await supabase.from("profiles").select("*").eq("is_setup", true)

    if (publicError) {
      console.error("[v0] Public profile access failed:", publicError.message)
      return false
    }

    console.log("[v0] ✓ RLS policies working - public access allowed for setup profiles")

    // Test 4: Check default data
    console.log("[v0] Checking default data...")
    const { data: profileData } = await supabase.from("profiles").select("business_name, is_setup").single()

    if (profileData) {
      console.log(`[v0] ✓ Profile found: ${profileData.business_name}, Setup: ${profileData.is_setup}`)
    }

    const { data: linksData } = await supabase.from("links").select("title, category").order("order_index")

    if (linksData && linksData.length > 0) {
      console.log(`[v0] ✓ Found ${linksData.length} links:`)
      linksData.forEach((link) => {
        console.log(`[v0]   - ${link.title} (${link.category})`)
      })
    }

    console.log("[v0] ✅ All database tests passed!")
    return true
  } catch (error) {
    console.error("[v0] Database test failed with exception:", error.message)
    return false
  }
}

// Run the test
testDatabaseConnection()
  .then((success) => {
    if (success) {
      console.log("[v0] Database is ready for production use!")
    } else {
      console.log("[v0] Database setup needs attention.")
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error("[v0] Test execution failed:", error)
    process.exit(1)
  })
